-- Membuat Database (opsional untuk lokal, di Railway akan dibuatkan otomatis)
CREATE DATABASE IF NOT EXISTS jualbeli_rev;
USE jualbeli_rev;

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  foto_profil VARCHAR(255) DEFAULT '/assets/seed-images/avatar-placeholder.svg',
  lokasi VARCHAR(100) DEFAULT 'Kampus UNNES',
  rating DECIMAL(3, 1) DEFAULT 5.0,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Items (Barang Dagangan/Barter Mahasiswa)
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(50) PRIMARY KEY,
  id_pemilik VARCHAR(50) NOT NULL,
  nama_barang VARCHAR(150) NOT NULL,
  deskripsi TEXT,
  harga INT NOT NULL DEFAULT 0,
  kategori VARCHAR(50) NOT NULL,
  kondisi VARCHAR(50) NOT NULL,
  foto TEXT,
  status ENUM('tersedia', 'barter', 'terjual') DEFAULT 'tersedia',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pemilik) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tabel Offers (Penawaran Barter)
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(50) PRIMARY KEY,
  item_ditawarkan VARCHAR(50) NOT NULL,
  item_diminta VARCHAR(50) NOT NULL,
  status ENUM('pending', 'diterima', 'ditolak') DEFAULT 'pending',
  id_pengirim VARCHAR(50) NOT NULL,
  id_penerima VARCHAR(50) NOT NULL,
  selisih_harga INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_ditawarkan) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (item_diminta) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (id_pengirim) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (id_penerima) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Tabel Conversations (Kamar Chat Pasangan Mahasiswa)
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(50) PRIMARY KEY,
  id_user_a VARCHAR(50) NOT NULL,
  id_user_b VARCHAR(50) NOT NULL,
  id_item_terkait VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_user_a) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (id_user_b) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (id_item_terkait) REFERENCES items(id) ON DELETE SET NULL
);

-- 5. Tabel Messages (Pesan Obrolan & Tawaran Barter)
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(50) PRIMARY KEY,
  id_conversation VARCHAR(50) NOT NULL,
  id_pengirim VARCHAR(50) NOT NULL,
  teks TEXT NOT NULL,
  waktu VARCHAR(50) NOT NULL,
  status_baca TINYINT(1) DEFAULT 0,
  type ENUM('text', 'offer') DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_conversation) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (id_pengirim) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Tabel Notifications (Notifikasi Aktivitas)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  id_user VARCHAR(50) NOT NULL,
  tipe VARCHAR(50) NOT NULL,
  teks TEXT NOT NULL,
  waktu VARCHAR(50) NOT NULL,
  sudah_dibaca TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed awal Akun Admin Resmi RE:V
INSERT IGNORE INTO users (id, nama, email, password, foto_profil, lokasi, rating, role)
VALUES ('USR-000', 'Admin RE:V', 'admin@techno.ac.id', 'admin123', '/assets/seed-images/avatar-placeholder.svg', 'Kampus UNNES Gunungpati', 5.0, 'admin');