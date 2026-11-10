const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/chat/conversations/:userId - Ambil semua kamar obrolan milik user
router.get('/conversations/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT * FROM conversations 
       WHERE id_user_a = ? OR id_user_b = ? 
       ORDER BY created_at DESC`,
      [userId, userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar obrolan', error: error.message });
  }
});

// GET /api/chat/messages/:conversationId - Ambil isi pesan dari kamar obrolan tertentu
router.get('/messages/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT * FROM messages WHERE id_conversation = ? ORDER BY created_at ASC`,
      [conversationId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil pesan', error: error.message });
  }
});

// POST /api/chat/messages - Kirim pesan baru
router.post('/messages', async (req, res) => {
  const { id, id_conversation, id_pengirim, teks, waktu, type } = req.body;
  try {
    const msgId = id || `MSG-${Date.now().toString().slice(-5)}`;
    
    await db.query(
      `INSERT INTO messages (id, id_conversation, id_pengirim, teks, waktu, status_baca, type)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [msgId, id_conversation, id_pengirim, teks, waktu || 'Baru saja', type || 'text']
    );

    res.status(201).json({ success: true, message: 'Pesan berhasil dikirim!', msgId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengirim pesan', error: error.message });
  }
});

module.exports = router;