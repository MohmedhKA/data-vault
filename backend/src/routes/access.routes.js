const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');

// Register doctor
router.post('/register', doctorController.registerDoctor);

// Verify doctor (HealthRegistryMSP only)
router.post('/verify/:doctorID', doctorController.verifyDoctor);

// Get doctor details
router.get('/:doctorID', doctorController.getDoctor);

module.exports = router;
