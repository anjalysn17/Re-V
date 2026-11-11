const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { randomUUID } = require('crypto');

// GET /api/items - Ambil semua barang beserta informasi pemiliknya
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             u.nama AS owner_name, 
             u.foto_profil AS owner_photo, 
             u.lokasi AS owner_location 
      FROM items i
      LEFT JOIN users u ON i.id_pemilik = u.id
      ORDER BY i.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data barang', error: error.message });
  }
});

// GET /api/items/:id - Ambil detail 1 barang berdasarkan ID beserta info pemilik
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT i.*, 
             u.nama AS owner_name, 
             u.foto_profil AS owner_photo, 
             u.lokasi AS owner_location 
      FROM items i
      LEFT JOIN users u ON i.id_pemilik = u.id
      WHERE i.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail barang', error: error.message });
  }
});

// POST /api/items - Tambah barang baru
router.post('/', async (req, res) => {
  const { id, id_pemilik, nama_barang, deskripsi, harga, kategori, kondisi, foto, status, lokasi } = req.body;

  if (!id_pemilik || !nama_barang || !kategori) {
    return res.status(400).json({ success: false, message: 'Data wajib (id_pemilik, nama_barang, kategori) belum lengkap.' });
  }

  try {
    const itemId = id || `ITM-${randomUUID().slice(0, 8)}`;    // Menyesuaikan status kiriman frontend ('jual', 'barter', 'keduanya') atau default 'keduanya'
    const itemStatus = status || 'keduanya';
    const itemLokasi = lokasi || 'Sekaran, Gunungpati';

    await db.query(
      `INSERT INTO items (id, id_pemilik, nama_barang, deskripsi, harga, kategori, kondisi, foto, status, lokasi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        id_pemilik,
        nama_barang,
        deskripsi || '',
        Number(harga) || 0,
        kategori,
        kondisi || 'Grade A',
        foto || '',
        itemStatus,
        itemLokasi
      ]
    );

    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan!', itemId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan barang', error: error.message });
  }
});

// PATCH /api/items/:id/status - Update status barang (tersedia / barter / terjual / dll)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.query('UPDATE items SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Status barang berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui status barang', error: error.message });
  }
});

// DELETE /api/items/:id - Hapus barang milik pengguna
router.delete('/:id', async (req, res) => {   // <-- Ubah 'nuxtParam' menjadi 'req'
  const { id } = req.params;
  try {
    await db.query('DELETE FROM items WHERE id = ?', [id]);
    res.json({ success: true, message: 'Barang berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus barang', error: error.message });
  }
});

module.exports = router;