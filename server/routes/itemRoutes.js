const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/items - Ambil semua barang
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM items ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data barang', error: error.message });
  }
});

// POST /api/items - Tambah barang baru
router.post('/', async (req, res) => {
  const { id, id_pemilik, nama_barang, deskripsi, harga, kategori, kondisi, foto } = req.body;
  try {
    await db.query(
      `INSERT INTO items (id, id_pemilik, nama_barang, deskripsi, harga, kategori, kondisi, foto, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'tersedia')`,
      [id, id_pemilik, nama_barang, deskripsi, harga || 0, kategori, kondisi, foto || '']
    );
    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan barang', error: error.message });
  }
});

module.exports = router;