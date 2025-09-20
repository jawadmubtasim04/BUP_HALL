// --- Import required packages ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- Import Models ---
const User = require('./models/User');
const Meal = require('./models/Meal');
const Complaint = require('./models/Complaint');
const Notice = require('./models/Notice');

// --- Load environment variables ---
require('dotenv').config(); // Make sure .env exists in root

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// --- Initialize Express ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Connect to MongoDB Atlas ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Basic Route ---
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// --- JWT Authentication Middleware ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- API Routes ---

// POST /api/signup
app.post('/api/signup', async (req, res) => {
    try {
        const { studentId, dob, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User with this email already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ studentId, dob, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        // Admin login
        if (emailOrUsername === 'shehabjawad' && password === '121&123') {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
            return res.json({ message: 'Admin login successful!', token, role: 'admin' });
        }

        // Student login
        const user = await User.findOne({ email: emailOrUsername });
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Student login successful!', token, role: 'student', studentId: user.studentId });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// GET /api/student/dashboard
app.get('/api/student/dashboard', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- Student Routes ---
app.post('/api/student/request-seat', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        await User.findByIdAndUpdate(userId, { seatStatus: 'pending', requestTimestamp: new Date() });
        res.json({ message: 'Seat request submitted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/student/confirm-payment', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { seatStatus: 'approved', paymentTimestamp: new Date() },
            { new: true }
        );
        if (!updatedUser) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: 'Payment successful! Your seat is confirmed.', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error during payment confirmation.' });
    }
});

// GET /api/student/meals
app.get('/api/student/meals', authMiddleware, async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ message: 'Month and year are required.' });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const meals = await Meal.find({
            userId: req.user.userId,
            date: { $gte: startDate.toISOString().split('T')[0], $lte: endDate.toISOString().split('T')[0] }
        });

        res.json(meals);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/student/meals
app.post('/api/student/meals', authMiddleware, async (req, res) => {
    try {
        const { studentId, date, breakfast, lunch, dinner } = req.body;
        const userId = req.user.userId;

        const meal = await Meal.findOneAndUpdate(
            { userId, date },
            { studentId, breakfast, lunch, dinner },
            { new: true, upsert: true }
        );

        res.status(201).json({ message: 'Meal plan saved successfully!', meal });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/student/complaints
app.post('/api/student/complaints', authMiddleware, async (req, res) => {
    try {
        const { complaintText } = req.body;
        const user = await User.findById(req.user.userId);
        if (!complaintText) return res.status(400).json({ message: 'Complaint text cannot be empty.' });

        const newComplaint = new Complaint({
            userId: req.user.userId,
            studentId: user.studentId,
            complaint: complaintText
        });

        await newComplaint.save();
        res.status(201).json({ message: 'Complaint submitted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while submitting complaint.' });
    }
});

// GET /api/student/notices
app.get('/api/student/notices', authMiddleware, async (req, res) => {
    try {
        const notices = await Notice.find().sort({ timestamp: -1 });
        res.json(notices);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- Admin Routes ---
app.get('/api/admin/users', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    try {
        const users = await User.find({ role: 'student' }).sort({ requestTimestamp: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/admin/approve-seat
app.post('/api/admin/approve-seat', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    try {
        const { userId, seatNumber } = req.body;
        if (!userId || !seatNumber) return res.status(400).json({ message: 'User ID and seat number are required.' });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { seatStatus: 'payment_pending', seatNumber },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: `Seat ${seatNumber} assigned successfully.`, user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/admin/notices
app.post('/api/admin/notices', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    try {
        const { title, content } = req.body;
        const newNotice = new Notice({ title, content });
        await newNotice.save();
        res.status(201).json({ message: 'Notice posted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- Start the server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
