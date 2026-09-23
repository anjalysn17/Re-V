import { JualBeliDB } from '../types/database';

export const DB_STORAGE_KEY = 'jualbeliDB';
export const CURRENT_USER_KEY = 'currentUser';

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
    },
  ],
  items: [],
  offers: [
    {
      id: 'OFR-001',
      item_ditawarkan: 'ITM-002',
      item_diminta: 'ITM-001',
      status: 'pending',
      id_pengirim: 'USR-002',
      id_penerima: 'USR-001',
      selisih_harga: 400000,
    },
  ],
  conversations: [
    {
      id: 'CONV-001',
      id_user_a: 'USR-001',
      id_user_b: 'USR-002',
      id_item_terkait: 'ITM-001',
    },
    {
      id: 'CONV-002',
      id_user_a: 'USR-001',
      id_user_b: 'USR-003',
      id_item_terkait: 'ITM-003',
    },
    {
      id: 'CONV-003',
      id_user_a: 'USR-001',
      id_user_b: 'USR-004',
      id_item_terkait: 'ITM-004',
    },
  ],
  messages: [
    {
      id: 'MSG-001',
      id_conversation: 'CONV-001',
      id_pengirim: 'USR-002',
      teks: 'Halo kak! Saya tertarik barter laptop kamu dengan iPad Air saya. Kondisi sama-sama grade A.',
      waktu: '14:20',
      status_baca: true,
      type: 'text',
    },
    {
      id: 'MSG-002',
      id_conversation: 'CONV-001',
      id_pengirim: 'USR-001',
      teks: 'Hei Rizky! Boleh, iPad Air 5th gen ya? Kondisinya gimana sekarang?',
      waktu: '14:22',
      status_baca: true,
      type: 'text',
    },
    {
      id: 'MSG-003',
      id_conversation: 'CONV-001',
      id_pengirim: 'USR-002',
      teks: 'Masih mulus banget kak, beli 6 bulan lalu. Ada dus + case original. Bisa CEK langsung kok.',
      waktu: '14:24',
      status_baca: true,
      type: 'text',
    },
    {
      id: 'MSG-004',
      id_conversation: 'CONV-001',
      id_pengirim: 'USR-002',
      teks: '📋 Tawaran Barter Resmi\n\nMereka tawarkan: iPad Air 5th Gen (Rp 4.200.000)\nKamu tawarkan: Laptop Lenovo ThinkPad E14 (Rp 3.800.000)\nEstimasi selisih: Rp 400.000\n\nTerima atau negosiasi?',
      waktu: '14:25',
      status_baca: true,
      type: 'offer',
    },
    {
      id: 'MSG-005',
      id_conversation: 'CONV-001',
      id_pengirim: 'USR-001',
      teks: 'Mantap! Selisihnya bisa ditambah cash Rp 300rb dari saya biar fair. Gimana?',
      waktu: '14:28',
      status_baca: true,
      type: 'text',
    },
    {
      id: 'MSG-006',
      id_conversation: 'CONV-001',
      id_pengirim: 'USR-002',
      teks: 'Deal! Gimana kalo kita COD di depan GSG besok?',
      waktu: '14:32',
      status_baca: true,
      type: 'text',
    },
    {
      id: 'MSG-007',
      id_conversation: 'CONV-002',
      id_pengirim: 'USR-003',
      teks: 'Oke kak, saya transfer sekarang ya',
      waktu: '12:15',
      status_baca: true,
      type: 'text',
    },
    {
      id: 'MSG-008',
      id_conversation: 'CONV-003',
      id_pengirim: 'USR-004',
      teks: 'Bisa kurang 50rb nggak kak?',
      waktu: '10:48',
      status_baca: true,
      type: 'text',
    },
    {
      id: 'MSG-009',
      id_conversation: 'CONV-001',
      id_pengirim: 'USR-002',
      teks: 'Makasih kak, barang udah sampai! ⭐⭐⭐⭐⭐',
      waktu: 'Kemarin',
      status_baca: true,
      type: 'text',
    },
  ],
  notifications: [
    {
      id: 'NTF-001',
      id_user: 'USR-001',
      tipe: 'barter',
      teks: 'Tawaran barter dari Selly diterima',
      waktu: '2m lalu',
      sudah_dibaca: false,
    },
    {
      id: 'NTF-002',
      id_user: 'USR-001',
      tipe: 'chat',
      teks: 'Pesan baru dari Afifah tentang Laptop',
      waktu: '15m lalu',
      sudah_dibaca: false,
    },
    {
      id: 'NTF-003',
      id_user: 'USR-001',
      tipe: 'success',
      teks: 'Transaksi #TRX001 selesai',
      waktu: '1j lalu',
      sudah_dibaca: true,
    },
    {
      id: 'NTF-004',
      id_user: 'USR-001',
      tipe: 'barter',
      teks: 'Tawaran barter baru dari Haikal untuk Meja Lipat',
      waktu: '3j lalu',
      sudah_dibaca: false,
    },
    {
      id: 'NTF-005',
      id_user: 'USR-001',
      tipe: 'chat',
      teks: 'Anjaly menyukai barang Laptop Lenovo milikmu',
      waktu: '5j lalu',
      sudah_dibaca: true,
    },
  ],
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

    // Pastikan cart array tersedia
    if (!Array.isArray(db.cart)) {
      db.cart = [];
      updated = true;
    }

    // Pastikan user memiliki field role
    db.users = db.users.map(u => {
      if (!u.role) {
        updated = true;
        return { ...u, role: u.email === 'admin@techno.ac.id' ? 'admin' : 'user' };
      }
      return u;
    });

    // Pastikan akun admin ada
    if (!db.users.some(u => u.email === 'admin@techno.ac.id')) {
      const adminUser = INITIAL_SEED.users.find(u => u.email === 'admin@techno.ac.id');
      if (adminUser) {
        db.users.unshift(adminUser);
        updated = true;
      }
    }

    // Bersihkan seed items dummy lama hanya sekali jika ada, jangan hapus barang baru buatan user
    const SEED_CLEANED_KEY = 'jualbeli_seed_items_cleared_v1';
    if (!localStorage.getItem(SEED_CLEANED_KEY)) {
      const oldSeedIds = ['ITM-001', 'ITM-002', 'ITM-003', 'ITM-004', 'ITM-005', 'ITM-006', 'ITM-007', 'ITM-008', 'ITM-009', 'ITM-010'];
      if (db.items && db.items.some(item => oldSeedIds.includes(item.id))) {
        db.items = db.items.filter(item => !oldSeedIds.includes(item.id));
        updated = true;
      }
      localStorage.setItem(SEED_CLEANED_KEY, 'true');
    }

    // Normalisasi field kategori pada items (trim spasi berlebih)
    if (Array.isArray(db.items)) {
      db.items = db.items.map(item => {
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

    // Dedup percakapan ganda antar pasangan user yang sama (1 percakapan per pasangan user seperti WhatsApp)
    if (Array.isArray(db.conversations) && Array.isArray(db.messages)) {
      const pairMap = new Map<string, typeof db.conversations>();
      for (const conv of db.conversations) {
        const pairKey = [conv.id_user_a, conv.id_user_b].sort().join(':::');
        if (!pairMap.has(pairKey)) {
          pairMap.set(pairKey, []);
        }
        pairMap.get(pairKey)!.push(conv);
      }

      let convsChanged = false;
      const deduplicatedConversations: typeof db.conversations = [];

      for (const [, convGroup] of pairMap.entries()) {
        if (convGroup.length === 1) {
          deduplicatedConversations.push(convGroup[0]);
          continue;
        }

        // Ada duplikat percakapan untuk pasangan user ini
        convsChanged = true;
        const primaryConv = convGroup[0];
        deduplicatedConversations.push(primaryConv);

        const duplicateConvIds = new Set(convGroup.slice(1).map(c => c.id));

        // Pindahkan semua pesan dari conversation duplikat ke primaryConv.id
        db.messages = db.messages.map(msg => {
          if (duplicateConvIds.has(msg.id_conversation)) {
            return { ...msg, id_conversation: primaryConv.id };
          }
          return msg;
        });

        // Update konteks barang jika ada percakapan duplikat yang memiliki barang lebih baru
        const lastConvWithItem = [...convGroup].reverse().find(c => c.id_item_terkait);
        if (lastConvWithItem && lastConvWithItem.id_item_terkait) {
          primaryConv.id_item_terkait = lastConvWithItem.id_item_terkait;
        }
      }

      if (convsChanged) {
        db.conversations = db.conversations.filter(c =>
          deduplicatedConversations.some(d => d.id === c.id)
        );
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
    localStorage.setItem('jualbeli_seed_items_cleared_v1', 'true');
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

