const FabricGateway = require('./gateway');

// Multiple gateway instances for different identities
const gateways = {};

async function getContract(identity = 'admin') {
    if (!gateways[identity]) {
        gateways[identity] = new FabricGateway();
        await gateways[identity].connect(identity);
    }
    
    return {
        contract: gateways[identity].getContract(),
        network: gateways[identity].getNetwork(),
        gateway: gateways[identity]
    };
}

async function disconnectGateway(identity = null) {
    if (identity) {
        if (gateways[identity]) {
            await gateways[identity].disconnect();
            delete gateways[identity];
        }
    } else {
        // Disconnect all
        for (const key in gateways) {
            await gateways[key].disconnect();
            delete gateways[key];
        }
    }
}

module.exports = { getContract, disconnectGateway };
