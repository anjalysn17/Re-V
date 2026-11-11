const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { randomUUID } = require('crypto');
const verifyToken = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

// Konfigurasi Cloudinary (Pastikan env CLD_NAME, CLD_KEY, CLD_SECRET terpasang di Railway)
cloudinary.config({
  cloud_name: process.env.CLD_NAME,
  api_key: process.env.CLD_KEY,
  api_secret: process.env.CLD_SECRET
});

// Gunakan verifyToken di endpoint yang memodifikasi data
router.post('/', verifyToken, async (req, res) => {
  const { id_pemilik, nama_barang, deskripsi, harga, kategori, kondisi, foto, status, lokasi } = req.body;
  
  // Keamanan ekstra: Gunakan ID dari token, bukan dari body request
  const userId = req.user.id; 

  try {
    const itemId = `ITM-${randomUUID().slice(0, 8)}`;
    let fotoUrl = foto;

    // Jika foto berupa base64, upload ke Cloudinary untuk meringankan query DB
    if (foto && foto.startsWith('data:image')) {
      const uploadRes = await cloudinary.uploader.upload(foto, { folder: 'rev_items' });
      fotoUrl = uploadRes.secure_url;
    }

    await db.query(
      `INSERT INTO items (id, id_pemilik, nama_barang, deskripsi, harga, kategori, kondisi, foto, status, lokasi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, userId, nama_barang, deskripsi || '', Number(harga) || 0, kategori, kondisi, fotoUrl || '', status || 'keduanya', lokasi]
    );
    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan!', itemId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan barang', error: error.message });
  }
});

// Terapkan verifyToken juga di router.delete('/:id')