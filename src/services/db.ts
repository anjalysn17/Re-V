import { JualBeliDB } from '../types/database';

export const DB_STORAGE_KEY = 'jualbeliDB';
export const CURRENT_USER_KEY = 'currentUser';

export const INITIAL_SEED: JualBeliDB = {
  users: [
    {
      id: 'USR-000',
      nama: 'Admin RE:V',
      email: 'admin@techno.ac.id',
      password: 'admin123',
      foto_profil: '/assets/seed-images/avatar-placeholder.svg',
      lokasi: 'Kampus UNNES Gunungpati',
      rating: 5.0,
      role: 'admin',
    },
  ],
  items: [],
  offers: [],
  conversations: [],
  messages: [],
  notifications: [],
  cart: [],
};

export function getDB(): JualBeliDB {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      saveDB(INITIAL_SEED);
      return INITIAL_SEED;
    }
    const db: JualBeliDB = JSON.parse(raw);
    let updated = false;

    // Pastikan struktur array dasar selalu tersedia
    if (!Array.isArray(db.cart)) {
      db.cart = [];
      updated = true;
    }
    if (!Array.isArray(db.items)) {
      db.items = [];
      updated = true;
    }
    if (!Array.isArray(db.offers)) {
      db.offers = [];
      updated = true;
    }
    if (!Array.isArray(db.conversations)) {
      db.conversations = [];
      updated = true;
    }
    if (!Array.isArray(db.messages)) {
      db.messages = [];
      updated = true;
    }
    if (!Array.isArray(db.notifications)) {
      db.notifications = [];
      updated = true;
    }

    // Pastikan akun admin selalu ada
    if (!db.users.some(u => u.email === 'admin@techno.ac.id')) {
      const adminUser = INITIAL_SEED.users.find(u => u.email === 'admin@techno.ac.id');
      if (adminUser) {
        db.users.unshift(adminUser);
        updated = true;
      }
    }

    if (updated) {
      saveDB(db);
    }

    return db;
  } catch (error) {
    console.error('Gagal membaca database dari localStorage:', error);
    return INITIAL_SEED;
  }
}

export function saveDB(db: JualBeliDB): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Gagal menyimpan database ke localStorage:', error);
  }
}

export function resetDB(): JualBeliDB {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(INITIAL_SEED));
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Gagal mereset database:', error);
  }
  return INITIAL_SEED;
}

export function generateId(prefix: string, existingList: { id: string }[] = []): string {
  const nums = existingList
    .map(x => parseInt(x.id.replace(prefix + '-', ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}