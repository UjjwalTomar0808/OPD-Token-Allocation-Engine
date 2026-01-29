const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: String, required: true },
    avgConsultationTime: { type: Number, required: true, default: 10 }, // in minutes
    activeSlots: [{
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        maxCapacity: { type: Number, required: true }
    }]
});

module.exports = mongoose.model('Doctor', doctorSchema);
