const express = require('express');
const app = express();

app.use(express.json());

app.use('/api/patient', require('./routes/patient.routes'));
app.use('/api/doctor', require('./routes/doctor.routes'));
app.use('/api/access', require('./routes/access.routes'));

app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
