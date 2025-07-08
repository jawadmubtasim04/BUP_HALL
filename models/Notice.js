const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const noticeSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
