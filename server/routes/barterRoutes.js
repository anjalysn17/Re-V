const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { randomUUID } = require('crypto');

// GET /api/barter - Ambil semua penawaran barter
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM offers ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data penawaran', error: error.message });
  }
});

// GET /api/barter/user/:userId - Ambil penawaran barter berdasarkan user (pengirim atau penerima)
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM offers WHERE id_pengirim = ? OR id_penerima = ? ORDER BY created_at DESC',
      [userId, userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data penawaran user', error: error.message });
  }
});

// POST /api/barter - Kirim penawaran barter baru
router.post('/', async (req, res) => {
  const { id, item_ditawarkan, item_diminta, id_pengirim, id_penerima, selisih_harga } = req.body;
  try {
    const offerId = id || `OFR-${randomUUID().slice(0, 8)}`;
    await db.query(
      `INSERT INTO offers (id, item_ditawarkan, item_diminta, status, id_pengirim, id_penerima, selisih_harga) 
       VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
      [offerId, item_ditawarkan, item_diminta, id_pengirim, id_penerima, selisih_harga || 0]
    );

    // Ambil data offer yang baru dibuat untuk dikembalikan ke client
    const [newRows] = await db.query('SELECT * FROM offers WHERE id = ?', [offerId]);
    const newOffer = newRows[0] || { id: offerId };

    res.status(201).json({
      success: true,
      message: 'Penawaran barter berhasil dikirim!',
      offerId,
      data: newOffer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengirim penawaran barter', error: error.message });
  }
});

// Handler untuk update status barter (mendukung 'diterima' / 'ditolak' / 'accepted' / 'rejected')
const updateStatusHandler = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.query('UPDATE offers SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: `Status penawaran berhasil diubah menjadi ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status penawaran', error: error.message });
  }
};

// Mendukung PUT dan PATCH sekaligus agar aman dari perbedaan method di frontend
router.put('/:id/status', updateStatusHandler);
router.patch('/:id/status', updateStatusHandler);

module.exports = router;