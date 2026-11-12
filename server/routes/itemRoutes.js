const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { randomUUID } = require('crypto');
const verifyToken = require('../middleware/auth'); // Perlindungan autentikasi

const pool = db.pool || db;

// Inisialisasi Cloudinary (Opsional agar tidak crash jika belum di-install)
let cloudinary = null;
try {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLD_NAME,
    api_key: process.env.CLD_KEY,
    api_secret: process.env.CLD_SECRET
  });
} catch (e) {
  console.warn("⚠️ Paket 'cloudinary' belum terinstall. Berjalan tanpa dukungan Cloudinary.");
}

// GET /api/items - Publik (Ambil semua barang dengan Filter Server-side & Pagination)
router.get('/', async (req, res) => {
  try {
    const { kategori, q, owner, exclude_owner, status, page, limit } = req.query;

    let sql = `
      SELECT i.*, 
             u.nama AS owner_name, 
             u.foto_profil AS owner_photo, 
             u.lokasi AS owner_location 
      FROM items i
      LEFT JOIN users u ON i.id_pemilik = u.id
      WHERE 1=1
    `;
    const params = [];

    // 1. Filter Kategori
    if (kategori && kategori !== 'Semua') {
      sql += ` AND i.kategori = ?`;
      params.push(kategori);
    }

    // 2. Filter Pencarian (Judul / Deskripsi)
    if (q) {
      sql += ` AND (i.nama_barang LIKE ? OR i.deskripsi LIKE ? OR i.kategori LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // 3. Filter Pemilik (Untuk MyItems / Profile)
    if (owner) {
      sql += ` AND i.id_pemilik = ?`;
      params.push(owner);
    }

    // 4. Pengecualian Pemilik (Untuk SmartBarter)
    if (exclude_owner) {
      sql += ` AND i.id_pemilik != ?`;
      params.push(exclude_owner);
    }

    // 5. Filter Status Jual/Barter
    if (status) {
      const statusArray = status.split(',');
      sql += ` AND i.status IN (${statusArray.map(() => '?').join(',')})`;
      params.push(...statusArray);
    }

    sql += ` ORDER BY i.created_at DESC`;

    // 6. Pagination (Mencegah pengiriman payload besar)
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20; 
    const offset = (pageNum - 1) * limitNum;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data barang', error: error.message });
  }
});

// GET /api/items/:id - Publik (Ambil detail 1 barang)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
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

// POST /api/items - Tambah barang baru (Protected)
router.post('/', verifyToken, async (req, res) => {
  const { id, nama_barang, deskripsi, harga, kategori, kondisi, foto, status, lokasi } = req.body;
  const id_pemilik = req.user.id; // Aman: Identitas valid dari token (bukan body)

  if (!nama_barang || !kategori) {
    return res.status(400).json({ success: false, message: 'Data wajib (nama_barang, kategori) belum lengkap.' });
  }

  try {
    const itemId = id || `ITM-${randomUUID().slice(0, 8)}`;
    const itemStatus = status || 'keduanya';
    const itemLokasi = lokasi || 'Sekaran, Gunungpati';
    let fotoUrl = foto || '';

    // Jika foto berupa base64 dan Cloudinary tersedia, upload
    if (fotoUrl.startsWith('data:image') && cloudinary) {
      const uploadRes = await cloudinary.uploader.upload(fotoUrl, { folder: 'rev_items' });
      fotoUrl = uploadRes.secure_url;
    }

    await pool.query(
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
        fotoUrl,
        itemStatus,
        itemLokasi
      ]
    );

    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan!', itemId });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan barang', error: error.message });
  }
});

// PATCH /api/items/:id/status - Update status barang (Protected + Cek Kepemilikan)
router.patch('/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  try {
    const [items] = await pool.query('SELECT id_pemilik FROM items WHERE id = ?', [id]);
    if (items.length === 0) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    
    if (items[0].id_pemilik !== userId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Kamu bukan pemilik barang ini.' });
    }

    await pool.query('UPDATE items SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Status barang berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui status barang', error: error.message });
  }
});

// DELETE /api/items/:id - Hapus barang (Protected + Cek Kepemilikan / Admin)
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    const isAdmin = users.length > 0 && users[0].role === 'admin';

    const [items] = await pool.query('SELECT id_pemilik FROM items WHERE id = ?', [id]);
    if (items.length === 0) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });

    if (items[0].id_pemilik !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Kamu tidak memiliki izin menghapus barang ini.' });
    }

    await pool.query('DELETE FROM items WHERE id = ?', [id]);
    res.json({ success: true, message: 'Barang berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus barang', error: error.message });
  }
});

module.exports = router;