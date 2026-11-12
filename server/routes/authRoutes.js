const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const db = require('../config/db');

// Ambil pool dari db (karena db.js sekarang mengekspor { pool, initTables })
const pool = db.pool || db;
const JWT_SECRET = process.env.JWT_SECRET || 'rev_secret_key_2026';

// POST /api/auth/register - Daftar akun baru
router.post('/register', async (req, res) => {
  const { nama, email, password, lokasi } = req.body;
  if (!nama || !email || !password) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  try {
    // Cek apakah email sudah terdaftar
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `USR-${randomUUID().slice(0, 8)}`;
    const userLokasi = lokasi || 'Kampus UNNES';
    const fotoProfil = '/assets/seed-images/avatar-placeholder.svg';

    await pool.query(
      `INSERT INTO users (id, nama, email, password, foto_profil, lokasi)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, nama, email, hashedPassword, fotoProfil, userLokasi]
    );

    const user = { id: userId, nama, email, role: 'user', lokasi: userLokasi, foto_profil: fotoProfil, rating: 5.0 };
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ success: true, message: 'Registrasi berhasil', user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal registrasi', error: error.message });
  }
});

// POST /api/auth/login - Masuk ke akun
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL) {
      user.role = 'admin';
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, message: 'Login berhasil', user: userWithoutPassword, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal login', error: error.message });
  }
});

module.exports = router;