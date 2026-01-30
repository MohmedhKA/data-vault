const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

class AuthService {
    // Register patient
    async registerPatient(patientData) {
        const { patientId, name, dateOfBirth, phone, aadharNumber, password } = patientData;

        // Check if patient already exists
        const existing = await Patient.findByPk(patientId);
        if (existing) {
            throw new Error('Patient ID already exists');
        }

        // Create patient (password will be auto-hashed by beforeCreate hook)
        const patient = await Patient.create({
            patientId,
            name,
            dateOfBirth,
            phone,
            aadharNumber,
            passwordHash: password, // Will be hashed automatically
            fingerprintTemplateId: patientData.fingerprintTemplateId || null
        });

        return { patientId: patient.patientId };
    }

    // Register doctor
    async registerDoctor(doctorData) {
        const { doctorId, name, licenseNumber, specialization, hospitalName, password } = doctorData;

        // Check if doctor already exists
        const existing = await Doctor.findByPk(doctorId);
        if (existing) {
            throw new Error('Doctor ID already exists');
        }

        // Create doctor (password will be auto-hashed)
        const doctor = await Doctor.create({
            doctorId,
            name,
            licenseNumber,
            specialization,
            hospitalName,
            passwordHash: password // Will be hashed automatically
        });

        return { doctorId: doctor.doctorId };
    }

    // Login patient
    async loginPatient(patientId, password) {
        const patient = await Patient.findByPk(patientId);

        if (!patient || !patient.isActive) {
            throw new Error('Invalid credentials');
        }

        const isValid = await patient.comparePassword(password);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await patient.update({ lastLogin: new Date() });

        // Generate JWT token
        const token = jwt.sign(
            { patientId: patient.patientId, role: 'patient' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Return patient data (without password)
        const patientData = {
            patientId: patient.patientId,
            name: patient.name,
            dateOfBirth: patient.dateOfBirth,
            phone: patient.phone,
            aadharNumber: patient.aadharNumber
        };

        return { token, patient: patientData };
    }

    // Login doctor
    async loginDoctor(doctorId, password) {
        const doctor = await Doctor.findByPk(doctorId);

        if (!doctor || !doctor.isActive) {
            throw new Error('Invalid credentials');
        }

        const isValid = await doctor.comparePassword(password);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await doctor.update({ lastLogin: new Date() });

        // Generate JWT token
        const token = jwt.sign(
            { doctorId: doctor.doctorId, role: 'doctor' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Return doctor data (without password)
        const doctorData = {
            doctorId: doctor.doctorId,
            name: doctor.name,
            licenseNumber: doctor.licenseNumber,
            specialization: doctor.specialization,
            hospitalName: doctor.hospitalName,
            isVerified: doctor.isVerified
        };

        return { token, doctor: doctorData };
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }
}

module.exports = new AuthService();
