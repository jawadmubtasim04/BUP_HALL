const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const complaintSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: String, required: true },
    complaint: { type: String, required: true },
    status: { type: String, default: 'unresolved' }, // 'unresolved' or 'resolved'
    timestamp: { type: Date, default: Date.now }
});

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;