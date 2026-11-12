const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { randomUUID } = require('crypto');
const verifyToken = require('../middleware/auth');

// GET /api/chat/conversations/:userId - Ambil semua kamar obrolan (Protected)
router.get('/conversations/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  
  // Validasi: User hanya boleh mengakses obrolannya sendiri
  if (userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Akses ditolak: Tidak dapat melihat obrolan pengguna lain' });
  }

  try {
    const [convs] = await db.query(
      `SELECT c.*, 
              u1.id as user_a_id, u1.nama as user_a_nama, u1.foto_profil as user_a_foto, u1.lokasi as user_a_lokasi, u1.rating as user_a_rating,
              u2.id as user_b_id, u2.nama as user_b_nama, u2.foto_profil as user_b_foto, u2.lokasi as user_b_lokasi, u2.rating as user_b_rating,
              i.id as item_id, i.nama_barang as item_nama, i.harga as item_harga, i.foto as item_foto, i.kondisi as item_kondisi
       FROM conversations c
       LEFT JOIN users u1 ON c.id_user_a = u1.id
       LEFT JOIN users u2 ON c.id_user_b = u2.id
       LEFT JOIN items i ON c.id_item_terkait = i.id
       WHERE c.id_user_a = ? OR c.id_user_b = ?
       ORDER BY c.created_at DESC`,
      [userId, userId]
    );

    const formattedConvs = await Promise.all(convs.map(async (c) => {
      const isUserA = c.id_user_a === userId;
      const otherUser = {
        id: isUserA ? c.user_b_id : c.user_a_id,
        nama: isUserA ? c.user_b_nama : c.user_a_nama,
        foto_profil: isUserA ? c.user_b_foto : c.user_a_foto,
        lokasi: isUserA ? c.user_b_lokasi : c.user_a_lokasi,
        rating: isUserA ? c.user_b_rating : c.user_a_rating
      };
      
      const relatedItem = c.item_id ? { id: c.item_id, nama_barang: c.item_nama, harga: c.item_harga, foto: c.item_foto, kondisi: c.item_kondisi } : null;

      const [lastMsgRows] = await db.query(`SELECT * FROM messages WHERE id_conversation = ? ORDER BY created_at DESC LIMIT 1`, [c.id]);
      const [unreadRows] = await db.query(`SELECT COUNT(*) as count FROM messages WHERE id_conversation = ? AND id_pengirim != ? AND status_baca = 0`, [c.id, userId]);
      
      return {
        id: c.id, id_user_a: c.id_user_a, id_user_b: c.id_user_b, id_item_terkait: c.id_item_terkait,
        created_at: c.created_at, otherUser, relatedItem,
        lastMessage: lastMsgRows.length > 0 ? lastMsgRows[0] : null,
        unreadCount: unreadRows[0].count || 0
      };
    }));
    res.json({ success: true, data: formattedConvs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar obrolan', error: error.message });
  }
});

// GET /api/chat/messages/:conversationId - Ambil isi pesan (Protected)
router.get('/messages/:conversationId', verifyToken, async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    // Validasi: Pastikan pengguna tergabung di dalam conversation
    const [convs] = await db.query('SELECT id_user_a, id_user_b FROM conversations WHERE id = ?', [conversationId]);
    if (convs.length === 0) return res.status(404).json({ success: false, message: 'Obrolan tidak ditemukan' });
    if (convs[0].id_user_a !== userId && convs[0].id_user_b !== userId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Bukan anggota obrolan' });
    }

    const [rows] = await db.query(`SELECT * FROM messages WHERE id_conversation = ? ORDER BY created_at ASC`, [conversationId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil pesan', error: error.message });
  }
});

// POST /api/chat/messages - Kirim pesan baru (Protected)
router.post('/messages', verifyToken, async (req, res) => {
  // Ambil pengirim otomatis dari token (Mencegah impersonation IDOR)
  const id_pengirim = req.user.id; 
  const { id, id_conversation, teks, waktu, type, targetUserId, targetItemId } = req.body;

  try {
    let targetConvId = id_conversation;
    if (!targetConvId && targetUserId) {
      const [existingConvs] = await db.query(
        `SELECT id FROM conversations WHERE (id_user_a = ? AND id_user_b = ?) OR (id_user_a = ? AND id_user_b = ?)`,
        [id_pengirim, targetUserId, targetUserId, id_pengirim]
      );
      if (existingConvs.length > 0) {
        targetConvId = existingConvs[0].id;
        if (targetItemId) await db.query(`UPDATE conversations SET id_item_terkait = ? WHERE id = ?`, [targetItemId, targetConvId]);
      } else {
        targetConvId = `CONV-${randomUUID().slice(0, 8)}`;
        await db.query(`INSERT INTO conversations (id, id_user_a, id_user_b, id_item_terkait) VALUES (?, ?, ?, ?)`, 
          [targetConvId, id_pengirim, targetUserId, targetItemId || null]);
      }
    }

    if (!targetConvId) return res.status(400).json({ success: false, message: 'id_conversation atau targetUserId wajib diisi' });

    const msgId = id || `MSG-${randomUUID().slice(0, 8)}`;
    const timeStr = waktu || new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

    await db.query(
      `INSERT INTO messages (id, id_conversation, id_pengirim, teks, waktu, status_baca, type) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [msgId, targetConvId, id_pengirim, teks, timeStr, type || 'text']
    );

    const [newMsgRows] = await db.query('SELECT * FROM messages WHERE id = ?', [msgId]);
    res.status(201).json({ success: true, message: 'Pesan berhasil dikirim!', data: newMsgRows[0], conversationId: targetConvId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengirim pesan', error: error.message });
  }
});

// PUT /api/chat/conversations/:id/read - Tandai pesan sudah dibaca (Protected)
router.put('/conversations/:id/read', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // Identitas aman

  try {
    await db.query(
      `UPDATE messages SET status_baca = 1 WHERE id_conversation = ? AND id_pengirim != ?`,
      [id, userId]
    );
    res.json({ success: true, message: 'Pesan ditandai sudah dibaca' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui status baca', error: error.message });
  }
});

module.exports = router;