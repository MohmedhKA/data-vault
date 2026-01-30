const { getContract } = require('../fabric/network');

exports.registerDoctor = async (req, res) => {
  try {
    const { doctorID, name, licenseNumber, specialization, hospitalName } = req.body;

    const { contract, gateway } = await getContract('admin');

    await contract.submitTransaction(
      'RegisterDoctor',
      doctorID,
      name,
      licenseNumber,
      specialization,
      hospitalName
    );

    await gateway.disconnect();

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDoctor = async (req, res) => {
  try {
    const { contract, gateway } = await getContract('admin');

    const result = await contract.evaluateTransaction(
      'GetDoctor',
      req.params.doctorID
    );

    await gateway.disconnect();

    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

exports.verifyDoctor = async (req, res) => {
  try {
    const { contract, gateway } = await getContract('HealthRegistryMSP');

    await contract.submitTransaction(
      'VerifyDoctor',
      req.params.doctorID
    );

    await gateway.disconnect();

    res.json({ success: true });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
};
