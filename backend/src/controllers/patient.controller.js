const { getContract } = require('../fabric/network');

exports.registerPatient = async (req, res) => {
  try {
    const {
      patientID,
      name,
      dateOfBirth,
      phone,
      aadharNumber,
      fingerprintTemplateID
    } = req.body;

    const { contract, gateway } = await getContract('admin');

    await contract.submitTransaction(
      'RegisterPatient',
      patientID,
      name,
      dateOfBirth,
      phone,
      aadharNumber,
      fingerprintTemplateID.toString()
    );

    await gateway.disconnect();

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPatient = async (req, res) => {
  try {
    const { contract, gateway } = await getContract('admin');

    const result = await contract.evaluateTransaction(
      'GetPatient',
      req.params.patientID
    );

    await gateway.disconnect();

    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};
