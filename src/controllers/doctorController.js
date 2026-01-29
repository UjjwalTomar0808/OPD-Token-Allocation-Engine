const QueueService = require('../services/QueueService');
const Doctor = require('../models/Doctor');

exports.createDoctor = async (req, res) => {
    try {
        const doctor = new Doctor(req.body);
        await doctor.save();
        res.status(201).json(doctor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.addDelay = async (req, res) => {
    try {
        const { id } = req.params;
        const { delayMinutes } = req.body;
        const result = await QueueService.addDelay(id, delayMinutes);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getQueue = async (req, res) => {
    try {
        const { id } = req.params;
        const queue = await QueueService.getQueue(id);
        res.json(queue);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
