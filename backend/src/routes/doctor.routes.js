const router = require('express').Router();
const controller = require('../controllers/doctor.controller');

router.post('/register', controller.registerDoctor);
router.post('/verify/:doctorID', controller.verifyDoctor);
router.get('/:doctorID', controller.getDoctor);

module.exports = router;
