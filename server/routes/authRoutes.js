const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/auth/register - Pendaftaran Mahasiswa UNNES Baru
router.post('/register', async (req, res) => {
  const { id, nama, email, password, lokasi } = req.body;
  
  if (!email || !password || !nama) {
    return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
  } // <-- Diperbaiki: Kurung kurawal tutup yang sebelumnya kurang

  try {
    // Cek apakah email sudah terdaftar
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const userId = id || `USR-${Date.now().toString().slice(-5)}`;
    const userLokasi = lokasi || 'Sekaran, Gunungpati';

    await db.query(
      `INSERT INTO users (id, nama, email, password, foto_profil, lokasi, rating, role) 
       VALUES (?, ?, ?, ?, '/assets/seed-images/avatar-placeholder.svg', ?, 5.0, 'user')`,
      [userId, nama, email, password, userLokasi]
    );

    const newUser = {
      id: userId,
      nama,
      email,
      foto_profil: '/assets/seed-images/avatar-placeholder.svg',
      lokasi: userLokasi,
      rating: 5.0,
      role: 'user'
    };

    // Mengirimkan 'user' dan 'data' sekaligus agar aman untuk berbagai versi AuthContext
    res.status(201).json({ 
      success: true, 
      message: 'Registrasi berhasil!', 
      user: newUser,
      data: newUser 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal melakukan registrasi', error: error.message });
  }
});

// POST /api/auth/login - Masuk ke Akun RE:V
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
         
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const user = rows[0];
    // Sembunyikan password saat dikirim kembali ke client
    delete user.password;

    // Mengirimkan 'user' dan 'data' sekaligus untuk kompatibilitas frontend
    res.json({ 
      success: true, 
      message: 'Login berhasil!', 
      user,
      data: user 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal proses login', error: error.message });
  }
});

module.exports = router;