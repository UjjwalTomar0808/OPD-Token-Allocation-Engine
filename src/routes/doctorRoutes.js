const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

router.post('/', doctorController.createDoctor); // Helper for bootstrapping
router.post('/:id/delay', doctorController.addDelay);
router.get('/', doctorController.getAllDoctors);
router.get('/:id/queue', doctorController.getQueue);
router.get('/:id/queue', doctorController.getQueue);

module.exports = router;
