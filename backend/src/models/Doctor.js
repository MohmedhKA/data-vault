const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Doctor = sequelize.define('Doctor', {
    doctorId: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        field: 'doctor_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    licenseNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'license_number'
    },
    specialization: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    hospitalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'hospital_name'
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_verified'
    },
    verifiedAt: {
        type: DataTypes.DATE,
        field: 'verified_at'
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
    tableName: 'doctors',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Hash password before saving
Doctor.beforeCreate(async (doctor) => {
    if (doctor.passwordHash) {
        doctor.passwordHash = await bcrypt.hash(doctor.passwordHash, 10);
    }
});

// Method to compare passwords
Doctor.prototype.comparePassword = async function(password) {
    return bcrypt.compare(password, this.passwordHash);
};

module.exports = Doctor;
