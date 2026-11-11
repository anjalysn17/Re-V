const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Import Routes
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const barterRoutes = require('./routes/barterRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/barter', barterRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'API RE:V Backend Berjalan Normal di Railway!' });
});

// Import pool database untuk verifikasi kesiapan sebelum server listen
const pool = require('./config/db');

// Gunakan Async IIFE agar server hanya menyala setelah database siap
(async () => {
  try {
    // Tes koneksi database terlebih dahulu
    await pool.query('SELECT 1');
    console.log('Koneksi Database MySQL berhasil diverifikasi.');

    // Nyalakan server setelah database dan tabel siap
    initTables().then(() => {
      app.listen(process.env.PORT || 5000, () => {
        console.log(`Server siap dan berjalan!`);
      });
    });
  } catch (error) {
    console.error('Gagal menyalakan server karena masalah database:', error.message);
  }
})();