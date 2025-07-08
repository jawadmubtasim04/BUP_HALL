const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mealSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentId: {
        type: String,
        required: true
    },
    date: { // Stored as "YYYY-MM-DD" string
        type: String,
        required: true
    },
    breakfast: {
        type: Boolean,
        default: false
    },
    lunch: {
        type: Boolean,
        default: false
    },
    dinner: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Create a compound index to ensure a user can only have one plan per day
mealSchema.index({ userId: 1, date: 1 }, { unique: true });

const Meal = mongoose.model('Meal', mealSchema);

module.exports = Meal;
