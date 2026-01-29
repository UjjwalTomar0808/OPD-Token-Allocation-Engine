const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    tokenNumber: { type: String, required: true, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    source: {
        type: String,
        enum: ['Online', 'Walk-in', 'Priority', 'Follow-up', 'Emergency'],
        required: true
    },
    priorityScore: { type: Number, required: true },
    scheduledTime: { type: Date, required: true },
    estimatedStartTime: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Waiting', 'In-Consultation', 'Completed', 'Cancelled', 'No-Show'],
        default: 'Waiting'
    },
    baseWeight: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Token', tokenSchema);
