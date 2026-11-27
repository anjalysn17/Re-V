import {
  JualBeliDB,
  Item,
  Notification,
  FlashBarterConfig,
} from '../types/database';
import { API_ENABLED, notifyLocalChange, resetLocalCacheForApi } from './api';

export const DB_STORAGE_KEY = 'jualbeliDB';
export const CURRENT_USER_KEY = 'currentUser';
export const FLASH_BARTER_DOC_ID = 'SYS-FLASH-BARTER';

export const INITIAL_SEED: JualBeliDB = {
  users: [
    {
      id: 'USR-000',
      nama: 'Admin',
      email: 'admin@techno.ac.id',
      password: 'admin123',
      foto_profil: '/assets/seed-images/avatar-placeholder.svg',
      lokasi: 'Kampus UNNES',
      rating: 5.0,
      role: 'admin',
      is_verified: true,
    },
    {
      id: 'USR-001',
      nama: 'Selly Anggun Ramadhani',
      email: 'selly@students.unnes.ac.id',
      password: 'milikkita',
      foto_profil: '/assets/seed-images/avatar-placeholder.svg',
      lokasi: 'Sekaran, Gunungpati',
      rating: 4.9,
      role: 'user',
      is_verified: true,
    },
    {
      id: 'USR-002',
      nama: 'Anjaly Sallima Nafia',
      email: 'anjaly@students.unnes.ac.id',
      password: 'milikkita',
      foto_profil: '/assets/seed-images/avatar-placeholder.svg',
      lokasi: 'Patemon, Gunungpati',
      rating: 4.8,
      role: 'user',
      is_verified: true,
    },
    {
      id: 'USR-003',
      nama: 'Afifah Hasna Nafisa',
      email: 'afifah@students.unnes.ac.id',
      password: 'milikkita',
      foto_profil: '/assets/seed-images/avatar-placeholder.svg',
      lokasi: 'Sekaran, Gunungpati',
      rating: 4.7,
      role: 'user',
      is_verified: true,
    },
    {
      id: 'USR-004',
      nama: 'Haikal Akhsan Darmawan',
      email: 'haikal@students.unnes.ac.id',
      password: 'milikkita',
      foto_profil: '/assets/seed-images/avatar-placeholder.svg',
      lokasi: 'Ngaliyan, Semarang',
      rating: 4.8,
      role: 'user',
      is_verified: true,
    },
  ],
  items: [],
  offers: [],
  conversations: [],
  messages: [],
  notifications: [],
  cart: [],
};

function getDBApiMode(): JualBeliDB {
  const empty: JualBeliDB = {
    users: [],
    items: [],
    offers: [],
    conversations: [],
    messages: [],
    notifications: [],
    cart: [],
  };
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as JualBeliDB) };
  } catch {
    return empty;
  }
}

export function getDB(): JualBeliDB {
  if (API_ENABLED) return getDBApiMode();
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      saveDB(INITIAL_SEED);
      return INITIAL_SEED;
    }
    const db: JualBeliDB = JSON.parse(raw);
    let updated = false;

    if (!Array.isArray(db.cart)) {
      db.cart = [];
      updated = true;
    }
    if (!Array.isArray(db.notifications)) {
      db.notifications = [];
      updated = true;
    }

    db.users = db.users.map((u) => {
      if (!u.role) {
        updated = true;
        return { ...u, role: u.email === 'admin@techno.ac.id' ? 'admin' : 'user' };
      }
      return u;
    });

    if (!db.users.some((u) => u.email === 'admin@techno.ac.id')) {
      const adminUser = INITIAL_SEED.users.find((u) => u.email === 'admin@techno.ac.id');
      if (adminUser) {
        db.users.unshift(adminUser);
        updated = true;
      }
    }

    if (Array.isArray(db.items)) {
      db.items = db.items.map((item) => {
        if (item.kategori && typeof item.kategori === 'string') {
          const trimmed = item.kategori.trim();
          if (trimmed !== item.kategori) {
            updated = true;
            return { ...item, kategori: trimmed };
          }
        }
        return item;
      });
    }

    // Dedup percakapan ganda antar pasangan user yang sama
    if (Array.isArray(db.conversations) && Array.isArray(db.messages)) {
      const pairMap = new Map<string, typeof db.conversations>();
      for (const conv of db.conversations) {
        const pairKey = [conv.id_user_a, conv.id_user_b].sort().join(':::');
        if (!pairMap.has(pairKey)) pairMap.set(pairKey, []);
        pairMap.get(pairKey)!.push(conv);
      }

      let convsChanged = false;
      const deduplicatedConversations: typeof db.conversations = [];

      for (const [, convGroup] of pairMap.entries()) {
        if (convGroup.length === 1) {
          deduplicatedConversations.push(convGroup[0]);
          continue;
        }
        convsChanged = true;
        const primaryConv = convGroup[0];
        deduplicatedConversations.push(primaryConv);

        const duplicateConvIds = new Set(convGroup.slice(1).map((c) => c.id));
        db.messages = db.messages.map((msg) =>
          duplicateConvIds.has(msg.id_conversation)
            ? { ...msg, id_conversation: primaryConv.id }
            : msg
        );

        const lastConvWithItem = [...convGroup].reverse().find((c) => c.id_item_terkait);
        if (lastConvWithItem?.id_item_terkait) {
          primaryConv.id_item_terkait = lastConvWithItem.id_item_terkait;
        }
      }

      if (convsChanged) {
        db.conversations = db.conversations.filter((c) =>
          deduplicatedConversations.some((d) => d.id === c.id)
        );
        updated = true;
      }
    }

    if (updated) saveDB(db);
    return db;
  } catch (error) {
    console.error('Gagal membaca database dari localStorage:', error);
    return INITIAL_SEED;
  }
}

export function saveDB(db: JualBeliDB): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new Event('rev-db-updated'));
    if (API_ENABLED) notifyLocalChange();
  } catch (error) {
    console.error('Gagal menyimpan database ke localStorage:', error);
  }
}

export function resetDB(): JualBeliDB {
  if (API_ENABLED) {
    resetLocalCacheForApi();
    return getDBApiMode();
  }
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(INITIAL_SEED));
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem('jualbeli_seed_items_cleared_v1', 'true');
  } catch (error) {
    console.error('Gagal mereset database:', error);
  }
  return INITIAL_SEED;
}

/**
 * Generator ID anti-bentrok berbasis UUID/timestamp+acak.
 */
export function generateId(prefix: string, _existingList?: { id: string }[]): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const shortUuid = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    return `${prefix}-${shortUuid}`;
  }
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Helper terpusat untuk parsing harga agar tidak terpotong pemisah ribuan (misal "150.000" -> 150000).
 */
export function parseSafePrice(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
  }
  if (typeof value === 'string') {
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) return 0;
    const parsed = Number(digitsOnly);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Helper terpusat untuk menentukan grade kondisi barang secara konsisten di seluruh halaman.
 */
export function resolveGrade(kondisi?: string): 'A' | 'B' | 'C' {
  const k = (kondisi || '').toLowerCase();
  if (k.includes('grade a') || k.includes('seperti baru') || k.includes('baru') || k.includes('mulus')) {
    return 'A';
  }
  if (k.includes('grade b') || k.includes('baik') || k.includes('layak pakai')) {
    return 'B';
  }
  if (k.includes('grade c') || k.includes('minus') || k.includes('rusak')) {
    return 'C';
  }
  return 'B';
}

/**
 * Helper terpusat untuk mengecek apakah barang sudah terjual / habis.
 */
export function isItemSold(item?: Partial<Item> | null): boolean {
  if (!item) return true;
  return item.terjual === true || item.status === 'sold';
}

/**
 * Mengembalikan daftar barang katalog publik (mengecualikan dokumen konfigurasi sistem seperti Flash Barter).
 */
export function getCatalogItems(db: JualBeliDB): Item[] {
  if (!Array.isArray(db.items)) return [];
  return db.items.filter(
    (item) => item && item.id !== FLASH_BARTER_DOC_ID && !item.is_system_config
  );
}

/**
 * Membaca konfigurasi Flash Barter yang diatur oleh Admin.
 */
export function getFlashBarterConfig(db?: JualBeliDB): FlashBarterConfig {
  const source = db ?? getDB();
  const doc = Array.isArray(source.items)
    ? source.items.find((i) => i && (i.id === FLASH_BARTER_DOC_ID || i.config_type === 'flash_barter'))
    : undefined;

  if (doc) {
    return {
      id: FLASH_BARTER_DOC_ID,
      is_system_config: true,
      config_type: 'flash_barter',
      is_active: Boolean(doc.is_active),
      end_time: typeof doc.end_time === 'string' ? doc.end_time : new Date(Date.now() + 2 * 3600_000).toISOString(),
      item_ids: Array.isArray(doc.item_ids) ? doc.item_ids.map(String) : [],
      updated_at: doc.updated_at,
    };
  }

  return {
    id: FLASH_BARTER_DOC_ID,
    is_system_config: true,
    config_type: 'flash_barter',
    is_active: false,
    end_time: new Date(Date.now() + 2 * 3600_000).toISOString(),
    item_ids: [],
  };
}

/**
 * Menyimpan konfigurasi Flash Barter oleh Admin dan memicu sinkronisasi.
 */
export function saveFlashBarterConfig(config: {
  is_active: boolean;
  end_time: string;
  item_ids: string[];
}): FlashBarterConfig {
  const db = getDB();
  if (!Array.isArray(db.items)) db.items = [];

  const nextConfig: FlashBarterConfig = {
    id: FLASH_BARTER_DOC_ID,
    is_system_config: true,
    config_type: 'flash_barter',
    is_active: Boolean(config.is_active),
    end_time: config.end_time,
    item_ids: [...new Set(config.item_ids.map(String))],
    updated_at: new Date().toISOString(),
  };

  const idx = db.items.findIndex((i) => i && i.id === FLASH_BARTER_DOC_ID);
  if (idx >= 0) {
    db.items[idx] = nextConfig as unknown as Item;
  } else {
    db.items.unshift(nextConfig as unknown as Item);
  }

  saveDB(db);
  return nextConfig;
}

/**
 * Helper terpusat untuk mengirim notifikasi nyata (chat, barter, pembaruan pesanan)
 * dan langsung memperbarui UI/sinkronisasi.
 */
export function pushNotification(params: {
  userId: string;
  tipe: 'barter' | 'chat' | 'success' | 'order';
  teks: string;
  link_page?: 'chat' | 'orders' | 'my-items';
  target_id?: string;
}): Notification | null {
  if (!params.userId || !params.teks.trim()) return null;
  const db = getDB();
  if (!Array.isArray(db.notifications)) db.notifications = [];

  const notif: Notification = {
    id: generateId('NTF'),
    id_user: String(params.userId),
    tipe: params.tipe,
    teks: params.teks.trim().slice(0, 450),
    waktu: new Date().toISOString(),
    sudah_dibaca: false,
    ...(params.link_page ? { link_page: params.link_page } : {}),
    ...(params.target_id ? { target_id: params.target_id } : {}),
  };

  db.notifications.unshift(notif);
  // Batasi maksimal 100 notifikasi terbaru di cache agar localStorage tetap ringan
  if (db.notifications.length > 100) {
    db.notifications = db.notifications.slice(0, 100);
  }
  saveDB(db);
  return notif;
}

/**
 * Menandai satu atau semua notifikasi milik user sebagai sudah dibaca.
 */
export function markNotificationsRead(userId: string, notifId?: string): void {
  const db = getDB();
  if (!Array.isArray(db.notifications)) return;
  let changed = false;

  db.notifications = db.notifications.map((n) => {
    if (String(n.id_user) !== String(userId)) return n;
    if (notifId && n.id !== notifId) return n;
    if (!n.sudah_dibaca) {
      changed = true;
      return { ...n, sudah_dibaca: true };
    }
    return n;
  });

  if (changed) saveDB(db);
}