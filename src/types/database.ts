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

export type PageName =
  | 'home'
  | 'product'
  | 'barter'
  | 'chat'
  | 'admin'
  | 'my-items'
  | 'category'
  | 'search'
  | 'cart'
  | 'profile'
  | 'orders'
  | 'info';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  nama: string;
  email: string;
  password: string;
  foto_profil: string;
  lokasi: string;
  rating: number;
  role: UserRole;
  is_verified?: boolean;
  titik_cod?: string;
  /** Hanya dipakai secara lokal/privat untuk hitung jarak Haversine, tidak diekspos publik */
  koordinat?: Coordinates;
}

export interface FlashBarterConfig {
  id: 'ITM-SYS-FLASH-BARTER' | 'SYS-FLASH-BARTER' | string;
  is_system_config: true;
  config_type: 'flash_barter';
  is_active: boolean;
  end_time: string;
  item_ids: string[];
  updated_at?: string;
}

export interface Item {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  kondisi: string;
  foto: string;
  /** Gunakan 'jual' | 'barter' | 'keduanya'. Untuk status terjual gunakan boolean `terjual` */
  status: ItemTransactionType | 'sold' | 'available';
  id_pemilik: string;
  lokasi: string;
  deskripsi: string;

  // Alias field yang disinkronkan server & komponen lama
  title?: string;
  nama_barang?: string;
  id_user?: string;
  ownerId?: string;
  price?: number;
  transactionType?: ItemTransactionType;

  // Field opsional untuk edit barang, status terjual, & titik preset COD
  titik_cod?: string;
  terjual?: boolean;
  updated_at?: string;

  // Penanda dokumen konfigurasi sistem (seperti Flash Barter)
  is_system_config?: boolean;
  config_type?: string;
  is_active?: boolean;
  end_time?: string;
  item_ids?: string[];
}

export interface Offer {
  id: string;
  item_ditawarkan: string;
  item_diminta: string;
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  id_pengirim: string;
  id_penerima: string;
  selisih_harga: number;
  lokasi_cod?: string;
}

export interface CodSpotRecommendation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  desc: string;
  distMidKm: number;
  distAKm: number | null;
  distBKm: number | null;
  distanceLabel?: string;
}

export interface Conversation {
  id: string;
  id_user_a: string;
  id_user_b: string;
  id_item_terkait: string;
  koordinat_a?: Coordinates;
  koordinat_b?: Coordinates;
  participantLocations?: Record<string, Coordinates & { updatedAt?: string }>;
  lokasi_cod_disepakati?: string;
  dealConfirmed?: boolean;
}

export interface BarterOfferMeta {
  offerId?: string;
  offeredItemId: string;
  offeredItemTitle: string;
  offeredItemPrice: number;
  offeredItemImage?: string;
  targetItemId: string;
  targetItemTitle: string;
  targetItemPrice: number;
  priceDifference: number;
  codLocation?: string;
  note?: string;
}

export interface Message {
  id: string;
  id_conversation: string;
  id_pengirim: string;
  teks: string;
  waktu: string;
  status_baca: boolean;
  type?: 'text' | 'offer' | 'barter_offer' | 'system' | 'cod_recommendation';
  barterOffer?: BarterOfferMeta;
  offerMeta?: {
    offerId?: string;
    offeredItemId: string;
    offeredItemName: string;
    offeredItemPrice: number;
    offeredItemImage?: string;
    targetItemId: string;
    targetItemName: string;
    targetItemPrice: number;
    targetItemImage?: string;
    priceDiff: number;
  };
  codMeta?: {
    recommendedSpot: CodSpotRecommendation;
    spots: CodSpotRecommendation[];
    userDistanceKm: number | null;
    advice: string;
    source: string;
  };
}

export interface Notification {
  id: string;
  id_user: string;
  tipe: 'barter' | 'chat' | 'success' | 'order';
  teks: string;
  waktu: string;
  sudah_dibaca: boolean;
  link_page?: PageName | string;
  target_id?: string;
  targetPage?: PageName | string;
  targetId?: string;
}

export interface CartItem {
  id: string;
  id_user: string;
  id_item: string;
  ditambahkan_pada: string;
}

export interface OrderRecord {
  id: string;
  id_pembeli?: string;
  userId: string;
  id_penjual?: string;
  sellerId: string;
  id_item?: string;
  itemId?: string;
  nama_item?: string;
  itemName?: string;
  foto_item?: string;
  harga?: number;
  totalPrice?: number;
  type: OrderType;
  status: OrderStatus;
  tanggal?: string;
  createdAt?: string;
  lokasi_cod?: string;
  catatan?: string;
  alasan_batal?: string;
  dibatalkan_oleh?: string;
}

export interface JualBeliDB {
  users: User[];
  items: Item[];
  offers: Offer[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  cart: CartItem[];
  orders?: OrderRecord[];
  flash_barter?: FlashBarterConfig;
}