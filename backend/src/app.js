const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  const result = await pool.query('SELECT NOW()');
  res.json({ message: 'Backend OK', time: result.rows[0] });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
