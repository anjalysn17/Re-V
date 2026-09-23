export interface User {
  id: string; // format USR-001
  nama: string;
  email: string;
  password: string; // plain text
  foto_profil: string;
  lokasi: string;
  rating: number;
  role: 'user' | 'admin';
}

export interface Item {
  id: string; // format ITM-001
  nama: string;
  kategori: string;
  harga: number;
  kondisi: string; // format Grade A / Grade B
  foto: string;
  status: 'jual' | 'barter' | 'keduanya';
  id_pemilik: string; // relasi ke User.id
  lokasi: string;
  deskripsi: string;
}

export interface Offer {
  id: string; // format OFR-001
  item_ditawarkan: string; // Item.id
  item_diminta: string; // Item.id
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  id_pengirim: string; // User.id
  id_penerima: string; // User.id
  selisih_harga: number;
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

export interface JualBeliDB {
  users: User[];
  items: Item[];
  offers: Offer[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  cart: CartItem[];
}

