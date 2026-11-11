const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'rev_secret_key_2026';

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