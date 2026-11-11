const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/chat/conversations/:userId - Ambil semua kamar obrolan milik user beserta detail partner & item terkait
router.get('/conversations/:userId', async (req, res) => {
  const { userId } = req.params;
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

    // Format data agar sesuai dengan struktur state di frontend (ChatPage.tsx)
    const formattedConvs = await Promise.all(convs.map(async (c) => {
      const isUserA = c.id_user_a === userId;
      const otherUser = {
        id: isUserA ? c.user_b_id : c.user_a_id,
        nama: isUserA ? c.user_b_nama : c.user_a_nama,
        foto_profil: isUserA ? c.user_b_foto : c.user_a_foto,
        lokasi: isUserA ? c.user_b_lokasi : c.user_a_lokasi,
        rating: isUserA ? c.user_b_rating : c.user_a_rating
      };

      const relatedItem = c.item_id ? {
        id: c.item_id,
        nama_barang: c.item_nama,
        harga: c.item_harga,
        foto: c.item_foto,
        kondisi: c.item_kondisi
      } : null;

      // Ambil pesan terakhir untuk preview di list obrolan
      const [lastMsgRows] = await db.query(
        `SELECT * FROM messages WHERE id_conversation = ? ORDER BY created_at DESC LIMIT 1`,
        [c.id]
      );
      const lastMessage = lastMsgRows.length > 0 ? lastMsgRows[0] : null;

      // Hitung jumlah pesan yang belum dibaca (unreadCount)
      const [unreadRows] = await db.query(
        `SELECT COUNT(*) as count FROM messages WHERE id_conversation = ? AND id_pengirim != ? AND status_baca = 0`,
        [c.id, userId]
      );
      const unreadCount = unreadRows[0].count || 0;

      return {
        id: c.id,
        id_user_a: c.id_user_a,
        id_user_b: c.id_user_b,
        id_item_terkait: c.id_item_terkait,
        created_at: c.created_at,
        otherUser,
        relatedItem,
        lastMessage,
        unreadCount
      };
    }));

    res.json({ success: true, data: formattedConvs });
  } catch (error) {
    console.error('Error fetching conversations:', error);
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
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil pesan', error: error.message });
  }
});

// POST /api/chat/messages - Kirim pesan baru (sekaligus buat conversation baru jika belum ada)
router.post('/messages', async (req, res) => {
  const { id, id_conversation, id_pengirim, teks, waktu, type, targetUserId, targetItemId } = req.body;
  try {
    let targetConvId = id_conversation;

    // Jika id_conversation belum ada tapi ada targetUserId (inisiasi chat langsung dari halaman produk)
    if (!targetConvId && targetUserId && id_pengirim) {
      // Cek apakah conversation antara pengirim dan target user sudah ada
      const [existingConvs] = await db.query(
        `SELECT id FROM conversations WHERE (id_user_a = ? AND id_user_b = ?) OR (id_user_a = ? AND id_user_b = ?)`,
        [id_pengirim, targetUserId, targetUserId, id_pengirim]
      );

      if (existingConvs.length > 0) {
        targetConvId = existingConvs[0].id;
        // Perbarui item terkait jika ada
        if (targetItemId) {
          await db.query(`UPDATE conversations SET id_item_terkait = ? WHERE id = ?`, [targetItemId, targetConvId]);
        }
      } else {
        targetConvId = `CONV-${Date.now().toString().slice(-5)}`;
        await db.query(
          `INSERT INTO conversations (id, id_user_a, id_user_b, id_item_terkait) VALUES (?, ?, ?, ?)`,
          [targetConvId, id_pengirim, targetUserId, targetItemId || null]
        );
      }
    }

    if (!targetConvId) {
      return res.status(400).json({ success: false, message: 'id_conversation atau targetUserId wajib diisi' });
    }

    const msgId = id || `MSG-${Date.now().toString().slice(-5)}`;
    const timeStr = waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    await db.query(
      `INSERT INTO messages (id, id_conversation, id_pengirim, teks, waktu, status_baca, type)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [msgId, targetConvId, id_pengirim, teks, timeStr, type || 'text']
    );

    // Ambil data pesan yang baru dimasukkan untuk dikembalikan ke frontend
    const [newMsgRows] = await db.query('SELECT * FROM messages WHERE id = ?', [msgId]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Pesan berhasil dikirim!', 
      data: newMsgRows[0],
      conversationId: targetConvId 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Gagal mengirim pesan', error: error.message });
  }
});

// PUT /api/chat/conversations/:id/read - Tandai pesan sudah dibaca
router.put('/conversations/:id/read', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    await db.query(
      `UPDATE messages
       SET status_baca = 1
       WHERE id_conversation = ? AND id_pengirim != ?`,
      [id, userId]
    );
    res.json({ success: true, message: 'Pesan ditandai sudah dibaca' });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui status baca', error: error.message });
  }
});

module.exports = router;