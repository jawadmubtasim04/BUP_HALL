// Import required packages
const Meal = require('./models/Meal');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Complaint = require('./models/Complaint');
const Notice = require('./models/Notice');

// Initialize the express app
const app = express();
const PORT = 3000; // The port our server will run on

// Middleware
app.use(cors()); // Allow requests from our frontend
app.use(express.json()); // Allow the server to understand JSON data
app.use(express.static('public')); // Serve our HTML files from the 'public' folder

// --- Database Connection ---
const MONGO_URI = 'mongodb://localhost:27017/bupHallManagement';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB!'))
    .catch(err => console.error('Connection error', err));


// --- Basic Route ---
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Serve the login page by default
});

// --- Import User Model and bcrypt ---
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// --- API Routes ---

// POST /api/signup - Handle student registration
app.post('/api/signup', async (req, res) => {
    try {
        const { studentId, dob, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user instance
        const newUser = new User({
            studentId,
            dob,
            email,
            password: hashedPassword
        });

        // Save the new user to the database
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// --- Import jsonwebtoken ---
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-super-secret-key-that-should-be-in-an-env-file'; // In a real app, use environment variables for this!
// --- Middleware to verify JWT ---
const authMiddleware = (req, res, next) => {
    // Get token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user;
        next(); // Proceed to the next function (the route handler)
    });
};
// POST /api/login - Handle user login
app.post('/api/login', async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        // --- Admin Login Check ---
        if (emailOrUsername === 'shehabjawad' && password === '121&123') {
            // Create a token for the admin
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
            return res.json({ message: 'Admin login successful!', token, role: 'admin' });
        }

        // --- Student Login Check ---
        const user = await User.findOne({ email: emailOrUsername });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Compare submitted password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // If passwords match, create a token for the student
        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Student login successful!', token, role: 'student', studentId: user.studentId });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});
// GET /api/student/dashboard - Get student's dashboard info
app.get('/api/student/dashboard', authMiddleware, async (req, res) => {
    try {
        // The user's ID is available from the authMiddleware
        const user = await User.findById(req.user.userId).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/student/request-seat - Handle seat request
app.post('/api/student/request-seat', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        await User.findByIdAndUpdate(userId, {
            seatStatus: 'pending',
            requestTimestamp: new Date()
        });
        res.json({ message: 'Seat request submitted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});
app.post('/api/student/confirm-payment', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const updatedUser = await User.findByIdAndUpdate(userId, {
            seatStatus: 'approved',
            paymentTimestamp: new Date() // Optional: track when payment happened
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: 'Payment successful! Your seat is confirmed.', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error during payment confirmation.' });
    }
});

// GET /api/student/meals - Get all meal plans for the logged-in student for a given month
app.get('/api/student/meals', authMiddleware, async (req, res) => {
    try {
        const { month, year } = req.query; // e.g., month=7, year=2025
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required.' });
        }

        // Create date range for the query
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const meals = await Meal.find({
            userId: req.user.userId,
            date: {
                $gte: startDate.toISOString().split('T')[0], // "YYYY-MM-DD"
                $lte: endDate.toISOString().split('T')[0]
            }
        });
        res.json(meals);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/student/meals - Save a meal plan for a specific day
app.post('/api/student/meals', authMiddleware, async (req, res) => {
    try {
        const { studentId, date, breakfast, lunch, dinner } = req.body;
        const userId = req.user.userId;

        // Use 'upsert' to either create a new plan or update an existing one for that day
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


// POST /api/student/complaints - Submit a new complaint
app.post('/api/student/complaints', authMiddleware, async (req, res) => {
    try {
        const { complaintText } = req.body;
        const user = await User.findById(req.user.userId);

        if (!complaintText) {
            return res.status(400).json({ message: 'Complaint text cannot be empty.' });
        }

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

// GET /api/student/notices - Get all hall notices
app.get('/api/student/notices', authMiddleware, async (req, res) => {
    try {
        const notices = await Notice.find().sort({ timestamp: -1 }); // Newest first
        res.json(notices);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/student/meal-history - Get a student's complete meal history
app.get('/api/student/meal-history', authMiddleware, async (req, res) => {
    try {
        const meals = await Meal.find({ userId: req.user.userId }).sort({ date: -1 });

        const mealPrices = { breakfast: 20, lunch: 40, dinner: 40 };
        const monthlyData = {};

        meals.forEach(meal => {
            const monthKey = meal.date.substring(0, 7); // "YYYY-MM"
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { breakfast: 0, lunch: 0, dinner: 0, totalCost: 0 };
            }
            if (meal.breakfast) monthlyData[monthKey].breakfast++;
            if (meal.lunch) monthlyData[monthKey].lunch++;
            if (meal.dinner) monthlyData[monthKey].dinner++;
        });

        // Calculate costs
        for (const key in monthlyData) {
            const month = monthlyData[key];
            month.totalCost = (month.breakfast * mealPrices.breakfast) +
                              (month.lunch * mealPrices.lunch) +
                              (month.dinner * mealPrices.dinner);
        }

        res.json(monthlyData);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});


// --- Admin Routes ---

// GET /api/admin/users - Get all student users
app.get('/api/admin/users', authMiddleware, async (req, res) => {
    // Double-check if the user making the request is an admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        // Find all users with the role 'student' and sort by request time for FIFO
        const users = await User.find({ role: 'student' }).sort({ requestTimestamp: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/admin/approve-seat - Approve a student's seat request
app.post('/api/admin/approve-seat', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const { userId, seatNumber } = req.body;
        if (!userId || !seatNumber) {
            return res.status(400).json({ message: 'User ID and seat number are required.' });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, {
            seatStatus: 'payment_pending',
            seatNumber: seatNumber
        }, { new: true }); // {new: true} returns the updated document

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: `Seat ${seatNumber} assigned successfully.`, user: updatedUser });

    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/admin/meals-overview - Get tomorrow's meal counts and details
app.get('/api/admin/meals-overview', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        // --- CORRECTED DATE LOGIC ---
        const now = new Date(); // Define 'now' at the beginning of the try block

        // Calculate tomorrow's date based on UTC components
        const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        const tomorrowDateString = tomorrowUTC.toISOString().split('T')[0];

        // 1. Find all meal plans for tomorrow
        const tomorrowsPlans = await Meal.find({ date: tomorrowDateString });

        // 2. Get monthly totals for the students who have a meal tomorrow
        const userIds = tomorrowsPlans.map(p => p.userId);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const monthlyMeals = await Meal.find({
            userId: { $in: userIds },
            date: {
                $gte: startOfMonth.toISOString().split('T')[0],
                $lte: endOfMonth.toISOString().split('T')[0]
            }
        });

        const studentMonthlyTotals = {};
        userIds.forEach(id => {
            studentMonthlyTotals[id] = { b: 0, l: 0, d: 0 };
        });

        monthlyMeals.forEach(meal => {
            const id = meal.userId.toString();
            // Ensure the key exists before trying to increment
            if (!studentMonthlyTotals[id]) {
                studentMonthlyTotals[id] = { b: 0, l: 0, d: 0 };
            }
            if (meal.breakfast) studentMonthlyTotals[id].b++;
            if (meal.lunch) studentMonthlyTotals[id].l++;
            if (meal.dinner) studentMonthlyTotals[id].d++;
        });

        // 3. Combine the data
        const detailedPlans = tomorrowsPlans.map(plan => ({
            studentId: plan.studentId,
            plan: {
                breakfast: plan.breakfast,
                lunch: plan.lunch,
                dinner: plan.dinner
            },
            monthlyTotals: studentMonthlyTotals[plan.userId.toString()] || { b: 0, l: 0, d: 0 }
        }));

        // 4. Calculate overall counts for tomorrow
        const summary = {
            breakfast: tomorrowsPlans.filter(p => p.breakfast).length,
            lunch: tomorrowsPlans.filter(p => p.lunch).length,
            dinner: tomorrowsPlans.filter(p => p.dinner).length,
        };

        res.json({ summary, detailedPlans });

    } catch (error) {
        console.error('Meal overview error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// GET /api/admin/complaints - Get all complaints
app.get('/api/admin/complaints', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    try {
        const complaints = await Complaint.find().sort({ timestamp: -1 }); // Newest first
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/admin/resolve-complaint - Mark a complaint as resolved
app.post('/api/admin/resolve-complaint', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    try {
        const { complaintId } = req.body;
        const complaint = await Complaint.findByIdAndUpdate(complaintId, { status: 'resolved' }, { new: true });
        if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
        res.json({ message: 'Complaint resolved successfully.', complaint });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/admin/notices - Post a new notice
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


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
