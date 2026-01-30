const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Patient = sequelize.define('Patient', {
    patientId: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        field: 'patient_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'date_of_birth'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    aadharNumber: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
        field: 'aadhar_number'
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
    },
    fingerprintTemplateId: {
        type: DataTypes.INTEGER,
        field: 'fingerprint_template_id'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    lastLogin: {
        type: DataTypes.DATE,
        field: 'last_login'
    }
}, {
    tableName: 'patients',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Hash password before saving
Patient.beforeCreate(async (patient) => {
    if (patient.passwordHash) {
        patient.passwordHash = await bcrypt.hash(patient.passwordHash, 10);
    }
});

// Method to compare passwords
Patient.prototype.comparePassword = async function(password) {
    return bcrypt.compare(password, this.passwordHash);
};

module.exports = Patient;
