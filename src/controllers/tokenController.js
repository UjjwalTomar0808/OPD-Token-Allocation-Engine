const QueueService = require('../services/QueueService');
const Token = require('../models/Token');

exports.issueToken = async (req, res) => {
    try {
        const { doctorId, source, patientName } = req.body;
        if (!doctorId || !source) {
            return res.status(400).json({ error: 'Missing defined parameters' });
        }
        const token = await QueueService.issueToken(doctorId, source, patientName);
        res.status(201).json(token);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.cancelToken = async (req, res) => {
    try {
        const { id } = req.params;
        const token = await QueueService.cancelToken(id);
        res.json({ message: 'Token cancelled', token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
