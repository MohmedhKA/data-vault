const { getContract } = require('../fabric/network');
const logger = require('../../utils/logger');
const authService = require('../services/auth.service');

// Register a new doctor (ADD PASSWORD SUPPORT)
exports.registerDoctor = async (req, res) => {
    try {
        const {
            name,
            licenseNumber,
            specialization,
            hospitalName,
            password  // NEW: Add password
        } = req.body;

        // Validate required fields
        if (!name || !licenseNumber || !specialization || !hospitalName || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        logger.info('Registering new doctor...');

        // Generate unique doctor ID
        const doctorID = `D${Math.floor(1000 + Math.random() * 9000)}`;

        // Get contract
        const { contract } = await getContract('hospitalApolloAdmin');

        // Register on blockchain
        await contract.submitTransaction(
            'RegisterDoctor',
            doctorID,
            name,
            licenseNumber,
            specialization,
            hospitalName
        );

        // Register in auth system with password
        await authService.registerDoctor(doctorID, password, {
            name,
            licenseNumber,
            specialization,
            hospitalName
        });

        logger.info(`Doctor registered successfully: ${doctorID}`);

        res.status(201).json({
            success: true,
            message: 'Doctor registered successfully',
            data: { doctorID }
        });

    } catch (error) {
        logger.error(`Failed to register doctor: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to register doctor',
            details: error.message
        });
    }
};

// Get doctor details
exports.getDoctor = async (req, res) => {
    try {
        const { doctorID } = req.params;

        logger.info(`Fetching doctor: ${doctorID}`);

        const { contract } = await getContract('admin');

        const result = await contract.evaluateTransaction(
            'GetDoctor',
            doctorID
        );

        const doctor = JSON.parse(result.toString());

        res.status(200).json({
            success: true,
            data: doctor
        });

    } catch (error) {
        logger.error(`Failed to get doctor: ${error.message}`);
        
        if (error.message.includes('does not exist')) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found',
                details: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve doctor',
            details: error.message
        });
    }
};

// Verify a doctor (only AuditOrg can do this)
exports.verifyDoctor = async (req, res) => {
    try {
        const { doctorID } = req.params;

        logger.info(`Verifying doctor: ${doctorID}`);

        // Use AuditOrg admin identity for verification
        const { contract } = await getContract('auditOrgAdmin');

        await contract.submitTransaction(
            'VerifyDoctor',
            doctorID
        );

        logger.info(`Doctor verified successfully: ${doctorID}`);

        res.status(200).json({
            success: true,
            message: 'Doctor verified successfully',
            data: { doctorID, verified: true }
        });

    } catch (error) {
        logger.error(`Failed to verify doctor: ${error.message}`);
        
        if (error.message.includes('only AuditOrg')) {
            return res.status(403).json({
                success: false,
                error: 'Permission denied',
                details: 'Only AuditOrg can verify doctors'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to verify doctor',
            details: error.message
        });
    }
};
