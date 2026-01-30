const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importAdminIdentity() {
    try {
        console.log('🔐 Importing admin identity from cryptogen certificates...');

        // Path to the admin that was used to create the channel
        const credPath = path.join(__dirname, 
            '../../Blockchain/compose/organizations/peerOrganizations/hospitalapollo.healthcare.com/users/Admin@hospitalapollo.healthcare.com/msp'
        );

        console.log('📂 Certificate path:', credPath);

        // Verify path exists
        if (!fs.existsSync(credPath)) {
            throw new Error(`Admin credentials not found at: ${credPath}`);
        }

        // Read certificate (FIXED FILENAME)
        const certPath = path.join(credPath, 'signcerts/Admin@hospitalapollo.healthcare.com-cert.pem');
        const certificate = fs.readFileSync(certPath, 'utf8');
        console.log('✅ Certificate loaded');

        // Read private key
        const keyPath = path.join(credPath, 'keystore');
        const keyFiles = fs.readdirSync(keyPath);
        const privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8');
        console.log('✅ Private key loaded');

        // Create wallet
        const walletPath = path.join(__dirname, '../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if admin already exists
        const adminExists = await wallet.get('admin');
        if (adminExists) {
            console.log('⚠️  Admin already exists, removing old identity...');
            await wallet.remove('admin');
        }

        // Create identity
        const identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: 'HospitalApolloMSP',
            type: 'X.509',
        };

        // Import to wallet
        await wallet.put('admin', identity);
        
        console.log('✅ Admin identity imported successfully!');
        console.log('📁 Wallet location:', walletPath);
        console.log('🔑 MSP ID: HospitalApolloMSP');
        console.log('');
        console.log('🎯 This admin has proper channel permissions');

    } catch (error) {
        console.error('❌ Failed to import admin identity:', error.message);
        process.exit(1);
    }
}

importAdminIdentity();
