const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { randomUUID } = require('crypto');
const verifyToken = require('../middleware/auth');

// GET /api/barter - Khusus Admin (Mencegah kebocoran data semua offers)
router.get('/', verifyToken, async (req, res) => {
  try {
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0 || users[0].role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Endpoint khusus administrator' });
    }

    const [rows] = await db.query('SELECT * FROM offers ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data penawaran', error: error.message });
  }
});

// GET /api/barter/user/:userId - Ambil penawaran barter milik pengguna tertentu (Protected)
router.get('/user/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  
  if (userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Akses ditolak: Tidak dapat melihat riwayat barter orang lain' });
  }

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

// POST /api/barter - Kirim penawaran barter baru (Protected)
router.post('/', verifyToken, async (req, res) => {
  const id_pengirim = req.user.id; // Identitas dari token (Mencegah Spoofing Pengirim)
  const { id, item_ditawarkan, item_diminta, id_penerima, selisih_harga } = req.body;

  try {
    const offerId = id || `OFR-${randomUUID().slice(0, 8)}`;
    await db.query(
      `INSERT INTO offers (id, item_ditawarkan, item_diminta, status, id_pengirim, id_penerima, selisih_harga) 
       VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
      [offerId, item_ditawarkan, item_diminta, id_pengirim, id_penerima, selisih_harga || 0]
    );

    const [newRows] = await db.query('SELECT * FROM offers WHERE id = ?', [offerId]);
    res.status(201).json({ success: true, message: 'Penawaran barter berhasil dikirim!', offerId, data: newRows[0] || { id: offerId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengirim penawaran barter', error: error.message });
  }
});

// Handler untuk update status barter (Protected + Cek Otorisasi Kepemilikan)
const updateStatusHandler = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  try {
    const [offers] = await db.query('SELECT id_penerima, id_pengirim FROM offers WHERE id = ?', [id]);
    if (offers.length === 0) return res.status(404).json({ success: false, message: 'Penawaran tidak ditemukan' });

    // Hanya penerima atau pengirim (yang ingin membatalkan) yang berhak mengubah status
    if (offers[0].id_penerima !== userId && offers[0].id_pengirim !== userId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Kamu tidak berhak mengubah status penawaran ini' });
    }

    await db.query('UPDATE offers SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: `Status penawaran berhasil diubah menjadi ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status penawaran', error: error.message });
  }
};

router.put('/:id/status', verifyToken, updateStatusHandler);
router.patch('/:id/status', verifyToken, updateStatusHandler);

module.exports = router;