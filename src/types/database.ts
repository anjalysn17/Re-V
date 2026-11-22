export type UserRole = 'user' | 'admin';

export type ItemCategory =
  | 'Elektronik'
  | 'Buku & Alat Tulis'
  | 'Fashion'
  | 'Perlengkapan'
  | 'Tas';

export type ItemTransactionType = 'jual' | 'barter' | 'keduanya';

export type OrderStatus = 'Menunggu COD' | 'Diproses' | 'Selesai' | 'Dibatalkan';

export type OrderType = 'beli' | 'barter';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface User {
  id: string; // format USR-001 (admin bawaan: USR-000)
  nama: string;
  email: string;
  password: string; // plain text di mode lokal; dikosongkan/tidak dikirim server di mode API
  foto_profil: string;
  lokasi: string;
  rating: number;
  role: UserRole;
  // Field opsional tambahan (aman terhadap kontrak PAKEM.md)
  is_verified?: boolean;
  titik_cod?: string;
  koordinat?: Coordinates;
}

export interface Item {
  id: string; // format ITM-001
  nama: string;
  kategori: string; // 5 kategori baku: Elektronik, Buku & Alat Tulis, Fashion, Perlengkapan, Tas
  harga: number;
  kondisi: string; // format Grade A / Grade B
  foto: string;
  status: ItemTransactionType | 'sold' | 'available';
  id_pemilik: string; // relasi ke User.id
  lokasi: string;
  deskripsi: string;

  // Alias field yang disinkronkan server (WAJIB dipertahankan untuk kompatibilitas halaman)
  title?: string;
  nama_barang?: string;
  id_user?: string;
  ownerId?: string;
  price?: number;
  transactionType?: ItemTransactionType;

  // Field opsional untuk edit barang, status terjual, & konfigurasi lokasi
  titik_cod?: string;
  koordinat?: Coordinates;
  terjual?: boolean;
  updated_at?: string;
}

export interface Offer {
  id: string; // format OFR-001
  item_ditawarkan: string; // Item.id
  item_diminta: string; // Item.id
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  id_pengirim: string; // User.id
  id_penerima: string; // User.id
  selisih_harga: number;
  lokasi_cod?: string;
}

export interface Conversation {
  id: string; // format CONV-001
  id_user_a: string; // User.id
  id_user_b: string; // User.id
  id_item_terkait: string; // Item.id
}

export interface Message {
  id: string; // format MSG-001
  id_conversation: string; // Conversation.id
  id_pengirim: string; // User.id
  teks: string;
  waktu: string;
  status_baca: boolean;
  type?: 'text' | 'offer' | 'system';
}

export interface Notification {
  id: string; // format NTF-001
  id_user: string; // User.id
  tipe: 'barter' | 'chat' | 'success';
  teks: string;
  waktu: string;
  sudah_dibaca: boolean;
}

export interface CartItem {
  id: string; // format CRT-001
  id_user: string; // User.id
  id_item: string; // Item.id
  ditambahkan_pada: string; // format tanggal/waktu
}

export interface OrderRecord {
  id: string; // format ORD-<timestamp>-<acak>
  id_pembeli: string; // User.id
  id_penjual: string; // User.id
  id_item: string; // Item.id
  nama_item: string;
  foto_item?: string;
  harga: number;
  type: OrderType;
  status: OrderStatus;
  tanggal: string;
  lokasi_cod?: string;
  catatan?: string;
  alasan_batal?: string;
}

export interface JualBeliDB {
  users: User[];
  items: Item[];
  offers: Offer[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  cart: CartItem[];
}