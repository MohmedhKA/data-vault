const connectToGateway = require('./gateway');

async function getContract(identity = 'admin') {
  const gateway = await connectToGateway(identity);
  const network = await gateway.getNetwork('healthdata-channel');
  const contract = network.getContract('healthcare');

  return { contract, gateway };
}

module.exports = { getContract };
