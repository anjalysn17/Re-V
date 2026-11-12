// server/middleware/verifyAdmin.js
const { pool } = require('../config/db');

const verifyAdmin = async (req, res, next) => {
  try {
    // req.user.id didapatkan dari middleware verifyToken sebelumnya
    const userId = req.user.id;

    // Cek role asli dari database, BUKAN dari body request atau client
    const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);

    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akses Ditolak: Tindakan ini hanya diizinkan untuk Administrator.' 
      });
    }

    // Jika terbukti admin, lanjutkan ke handler rute
    next();
  } catch (error) {
    console.error('Error verifikasi admin:', error);
    res.status(500).json({ success: false, message: 'Gagal memverifikasi hak akses.' });
  }
};

module.exports = verifyAdmin;