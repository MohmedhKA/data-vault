const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importAuditOrgAdmin() {
    try {
        console.log('🔐 Importing AuditOrg admin identity...');

        const credPath = path.join(__dirname, 
            '../../Blockchain/compose/organizations/peerOrganizations/auditorg.healthcare.com/users/Admin@auditorg.healthcare.com/msp'
        );

        console.log('📂 Certificate path:', credPath);

        if (!fs.existsSync(credPath)) {
            throw new Error(`AuditOrg admin credentials not found`);
        }

        // Read certificate
        const certPath = path.join(credPath, 'signcerts/Admin@auditorg.healthcare.com-cert.pem');
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

        // Create identity
        const identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: 'AuditOrgMSP',
            type: 'X.509',
        };

        // Import to wallet
        await wallet.put('auditOrgAdmin', identity);
        
        console.log('✅ AuditOrg admin imported!');
        console.log('🔑 MSP ID: AuditOrgMSP');

    } catch (error) {
        console.error('❌ Failed:', error.message);
        process.exit(1);
    }
}

importAuditOrgAdmin();
