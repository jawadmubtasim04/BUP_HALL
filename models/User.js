const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    studentId: {
        type: String,
        required: true,
        unique: true
    },
    dob: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'student'
    },
    seatStatus: {
        type: String,
        default: 'none'
    },
    seatNumber: {
        type: String,
        default: null
    }
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

const User = mongoose.model('User', userSchema);

module.exports = User;