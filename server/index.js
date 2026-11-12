const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- PEMBARUAN CORS (Whitelist Vercel & Localhost & LAN) ---
const allowedOrigins = [
  process.env.CLIENT_URL,       // URL Vercel dari setting Railway (Production)
  'http://localhost:5173',      // Dev lokal (Vite di laptop)
  'http://127.0.0.1:5173',
  'http://192.168.1.3:8443',    // <--- TAMBAHKAN INI AGAR HP/LAN BISA AKSES
  'http://192.168.1.3:5173'     // (Cadangan jika kamu pakai port 5173 di LAN)
];

app.use(cors({
  origin: function (origin, callback) {
    // Izinkan request tanpa origin (seperti dari Postman) ATAU origin yang terdaftar di allowedOrigins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Akses CORS ditolak dari domain ini.'));
    }
  },
  credentials: true
}));
// ----------------------------------------------------

// Middleware Parsing
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

// Import pool database dan fungsi inisialisasi dari config/db.js
const { pool, initTables } = require('./config/db');

// Gunakan Async IIFE agar server hanya menyala setelah database siap
(async () => {
  try {
    // Tes koneksi database terlebih dahulu
    await pool.query('SELECT 1');
    console.log('Koneksi Database MySQL berhasil diverifikasi.');

    // Jalankan fungsi inisialisasi tabel
    await initTables();
    console.log('Struktur tabel berhasil dicek/diinisialisasi.');

    // Nyalakan server HANYA setelah database dan tabel siap
    app.listen(PORT, () => {
      console.log(`Server siap dan berjalan di port ${PORT}!`);
    });
  } catch (error) {
    console.error('Gagal menyalakan server karena masalah database:', error.message);
  }
})();