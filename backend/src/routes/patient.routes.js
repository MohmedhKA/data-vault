const router = require('express').Router();
const controller = require('../controllers/patient.controller');

router.post('/register', controller.registerPatient);
router.get('/:patientID', controller.getPatient);

module.exports = router;
