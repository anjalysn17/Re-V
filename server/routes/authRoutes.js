const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rev_secret_key_2026';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { id, nama, email, password, lokasi } = req.body;
  if (!email || !password || !nama) return res.status(400).json({ success: false, message: 'Wajib diisi' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });

    const { randomUUID } = require('crypto');
    const userId = id || `USR-${randomUUID().slice(0,8)}`;
    const hashedPassword = await bcrypt.hash(password, 10); // Enkripsi password

    await db.query(
      `INSERT INTO users (id, nama, email, password, foto_profil, lokasi, rating, role)
       VALUES (?, ?, ?, ?, '/assets/seed-images/avatar-placeholder.svg', ?, 5.0, 'user')`,
      [userId, nama, email, hashedPassword, lokasi || 'Sekaran, Gunungpati']
    );

    const newUser = { id: userId, nama, email, foto_profil: '/assets/seed-images/avatar-placeholder.svg', lokasi, rating: 5.0, role: 'user' };
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ success: true, message: 'Registrasi berhasil!', user: newUser, data: newUser, token });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Email salah' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password); // Bandingkan enkripsi
    if (!isMatch) return res.status(401).json({ success: false, message: 'Password salah' });

    delete user.password;
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, message: 'Login berhasil!', user, data: user, token });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;