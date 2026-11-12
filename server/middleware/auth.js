const jwt = require('jsonwebtoken');
require('dotenv').config();

// Hentikan startup jika JWT_SECRET kosong
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET belum diset di environment variables!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Berisi { id: 'USR-...' }
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token tidak valid atau kedaluwarsa.' });
  }
};