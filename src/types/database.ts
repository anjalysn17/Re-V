export interface User {
  id: string; // USR-001
  nama: string;
  email: string;
  password?: string;
  foto_profil: string;
  lokasi: string;
  rating: number;
  role: 'user' | 'admin';
  phone?: string;
}

export interface Item {
  id: string; // ITM-001
  nama_barang?: string; // Kolom MySQL Railway
  nama?: string;        // Compatibility fallback
  kategori: string;
  harga: number;
  kondisi: string;
  foto: string;
  status: 'jual' | 'barter' | 'keduanya' | 'tersedia' | 'terjual';
  id_pemilik: string;
  lokasi: string;
  deskripsi: string;
  created_at?: string;
}

export interface Offer {
  id: string; // OFR-001
  item_ditawarkan: string;
  item_diminta: string;
  status: 'pending' | 'diterima' | 'ditolak' | 'accepted' | 'rejected' | 'negotiating';
  id_pengirim: string;
  id_penerima: string;
  selisih_harga: number;
  created_at?: string;
}

export interface Conversation {
  id: string; // CONV-001
  id_user_a: string;
  id_user_b: string;
  id_item_terkait: string;
  created_at?: string;
}

export interface Message {
  id: string; // MSG-001
  id_conversation: string;
  id_pengirim: string;
  teks: string;
  waktu: string;
  status_baca: boolean;
  type?: 'text' | 'offer' | 'system';
  created_at?: string;
}

export interface Notification {
  id: string; // NTF-001
  id_user: string;
  tipe: 'barter' | 'chat' | 'success';
  teks: string;
  waktu: string;
  sudah_dibaca: boolean;
  created_at?: string;
}

export interface CartItem {
  id: string; // CRT-001
  id_user: string;
  id_item: string;
  ditambahkan_pada: string;
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