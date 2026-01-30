const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Login routes
router.post('/login/patient', authController.loginPatient);
router.post('/login/doctor', authController.loginDoctor);

module.exports = router;
