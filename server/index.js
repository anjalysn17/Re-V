const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const itemRoutes = require('./routes/itemRoutes');
const authRoutes = require('./routes/authRoutes');
const barterRoutes = require('./routes/barterRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // Atau masukkan URL Vercel spesifik: ['https://re-v-xxx.vercel.app', 'http://localhost:5173']
  credentials: true
}));
app.use(express.json());

// Register API Routes
app.use('/api/items', itemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/barter', barterRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ success: true, message: 'Server RE:V & Database terhubung!', result: rows[0].result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal koneksi ke database', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server RE:V Backend berjalan di port ${PORT}`);
});