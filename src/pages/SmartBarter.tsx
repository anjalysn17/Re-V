import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB, generateId } from '../services/db';
import { Item, User, Offer, Conversation, Message, Notification } from '../types/database';
import { createOfferAndConversation, getOrCreateConversation } from '../utils/barterActions';

interface SmartBarterProps {
  onNavigate: (page: string, param?: string | any, conversationId?: string) => void;
  onOpenAddItem?: () => void;
  onCartUpdated?: () => void;
}

const CATEGORIES = [
  'Semua',
  'Elektronik',
  'Buku & Alat Tulis',
  'Fashion',
  'Perlengkapan',
  'Tas',
];

interface MatchResultItem {
  item: Item;
  owner: User;
  match: number;
  distance: string;
}

export default function SmartBarter({ onNavigate, onOpenAddItem, onCartUpdated }: SmartBarterProps) {
  const { currentUser, openAuthModal } = useAuth();

  // State pencarian & filter
  const [searchTarget, setSearchTarget] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [radiusKm, setRadiusKm] = useState(5);
  const [sortBy, setSortBy] = useState<'Kecocokan' | 'Terdekat' | 'Rating'>('Kecocokan');
  const [searched, setSearched] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResultItem[]>([]);
  const [validationMsg, setValidationMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [sentOfferIds, setSentOfferIds] = useState<Set<string>>(new Set());

  // Ambil database terkini
  const db = getDB();

  // Kolom 1: Barang barter milik user yang sedang login
  const myBarterItems = useMemo(() => {
    if (!currentUser) return [];
    return db.items.filter(
      item =>
        item.id_pemilik === currentUser.id &&
        (item.status === 'barter' || item.status === 'keduanya')
    );
  }, [db.items, currentUser]);

  // ID barang saya yang sedang dipilih di Kolom 1
  const [selectedMyItemId, setSelectedMyItemId] = useState<string | null>(() => {
    return myBarterItems.length > 0 ? myBarterItems[0].id : null;
  });

  const selectedMyItem = myBarterItems.find(it => it.id === selectedMyItemId) || null;

  // Jika currentUser belum login, tampilkan modal/pesan "Perlu Masuk Akun"
  if (!currentUser) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-16 text-center">
        <div
          className="max-w-md mx-auto p-8 rounded-2xl border shadow-sm space-y-4"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Perlu Masuk Akun
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Silakan masuk untuk menggunakan fitur Smart Barter dan mencocokkan barang barter milikmu dengan pengguna lain.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            style={{ background: 'var(--color-accent)' }}
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    );
  }

  // Handler tombol "Temukan Pasangan Barter"
  const handlePerformSearch = () => {
    setValidationMsg('');
    if (!selectedMyItem) {
      setValidationMsg('Pilih salah satu barang yang kamu miliki di Kolom 1 terlebih dahulu.');
      return;
    }

    const currentDB = getDB();
    const otherItems = (currentDB.items || []).filter(item => {
      // 1. Bukan milik sendiri
      if (item.id_pemilik === currentUser.id) return false;
      // 2. Status barter atau keduanya
      if (item.status !== 'barter' && item.status !== 'keduanya') return false;
      // 3. Filter kategori
      if (selectedCategory !== 'Semua') {
        if (item.kategori.toLowerCase().trim() !== selectedCategory.toLowerCase().trim()) {
          return false;
        }
      }
      // 4. Filter teks pencarian (case-insensitive)
      if (searchTarget.trim()) {
        const q = searchTarget.trim().toLowerCase();
        const inName = item.nama.toLowerCase().includes(q);
        const inDesc = item.deskripsi.toLowerCase().includes(q);
        if (!inName && !inDesc) return false;
      }
      return true;
    });

    const results: MatchResultItem[] = otherItems.map(item => {
      const owner = currentDB.users.find(u => u.id === item.id_pemilik) || {
        id: item.id_pemilik,
        nama: 'Pengguna Barterin',
        email: '',
        password: '',
        foto_profil: '/assets/seed-images/avatar-placeholder.svg',
        rating: 4.8,
        lokasi: item.lokasi,
        role: 'user' as const,
      };

      // Hitung skor kecocokan berdasarkan kedekatan harga
      const myPrice = selectedMyItem.harga;
      const theirPrice = item.harga;
      const priceDiff = Math.abs(myPrice - theirPrice);
      const maxPrice = Math.max(myPrice, theirPrice, 1);
      const ratio = priceDiff / maxPrice;
      let match = Math.round(98 - ratio * 45);
      if (match < 50) match = 50;
      if (match > 98) match = 98;

      return {
        item,
        owner,
        match,
        distance: item.lokasi.split(',')[0] || 'Sekitar Kampus',
      };
    });

    // Urutkan hasil
    if (sortBy === 'Kecocokan') {
      results.sort((a, b) => b.match - a.match);
    } else if (sortBy === 'Rating') {
      results.sort((a, b) => b.owner.rating - a.owner.rating);
    }

    // Dedup berdasarkan item.id sebelum disimpan ke state
    const seenIds = new Set<string>();
    const hasilBaru: MatchResultItem[] = [];
    for (const res of results) {
      if (!seenIds.has(res.item.id)) {
        seenIds.add(res.item.id);
        hasilBaru.push(res);
      }
    }

    // PENTING: SET ULANG SEPENUHNYA dengan hasil pencarian terbaru (BUKAN append prev => [...prev, ...hasilBaru])
    setMatchResults(hasilBaru);
    setSearched(true);
  };

  // Handler pengurutan hasil
  const handleSortChange = (newSort: 'Kecocokan' | 'Terdekat' | 'Rating') => {
    setSortBy(newSort);
    setMatchResults(prev => {
      const sorted = [...prev];
      if (newSort === 'Kecocokan') {
        sorted.sort((a, b) => b.match - a.match);
      } else if (newSort === 'Rating') {
        sorted.sort((a, b) => b.owner.rating - a.owner.rating);
      }
      return sorted;
    });
  };

  // Pengaman tambahan: dedup berdasarkan item.id sebelum ditampilkan ke UI
  const searchResults: MatchResultItem[] = useMemo(() => {
    const seen = new Set<string>();
    return matchResults.filter(res => {
      if (!res.item || !res.item.id) return false;
      if (seen.has(res.item.id)) return false;
      seen.add(res.item.id);
      return true;
    });
  }, [matchResults]);

  // Handler tombol "Kirim Tawaran Tukar"
  const handleSendOffer = (targetItem: Item) => {
    if (!selectedMyItem || !currentUser) return;

    const { convId } = createOfferAndConversation({
      myItem: selectedMyItem,
      targetItem,
      currentUser,
    });

    setSentOfferIds(prev => new Set(prev).add(targetItem.id));

    // Arahkan user ke halaman chat dengan percakapan ini terbuka
    onNavigate('chat', convId);
  };

  // Handler tombol "Buka Obrolan"
  const handleOpenChat = (targetItem: Item) => {
    if (!currentUser) return;

    const { convId } = getOrCreateConversation({
      targetItem,
      currentUser,
    });

    onNavigate('chat', convId);
  };

  // Handler tombol "Simpan ke Keranjang"
  const handleSaveToCart = (targetItem: Item) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    const currentDB = getDB();
    if (!Array.isArray(currentDB.cart)) currentDB.cart = [];

    const alreadyInCart = currentDB.cart.some(
      c => c.id_user === currentUser.id && c.id_item === targetItem.id
    );

    if (alreadyInCart) {
      setToastMsg('Barang ini sudah ada di keranjangmu');
      setTimeout(() => setToastMsg(''), 3000);
      return;
    }

    const newCartItem = {
      id: generateId('CRT', currentDB.cart),
      id_user: currentUser.id,
      id_item: targetItem.id,
      ditambahkan_pada: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };

    currentDB.cart.unshift(newCartItem);
    saveDB(currentDB);
    setToastMsg('✓ Berhasil disimpan ke keranjang!');
    setTimeout(() => setToastMsg(''), 3000);
    if (onCartUpdated) {
      onCartUpdated();
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Toast Notifikasi Sukses */}
      {toastMsg && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4"
          style={{ background: 'var(--color-success, #4a8c5c)' }}
        >
          <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Matching Interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Kolom 1: Barang yang Saya Miliki */}
        <div 
          className="rounded-2xl p-5 border flex flex-col justify-between shadow-sm"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'var(--color-primary)' }}
              >
                1
              </span>
              <h2 className="font-bold text-sm text-gray-900">
                Barang yang Saya Miliki
              </h2>
            </div>

            {myBarterItems.length === 0 ? (
              <div
                className="p-6 text-center space-y-2 rounded-xl border border-dashed my-2"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee' }}
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto text-gray-400 border" style={{ borderColor: 'var(--color-border)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-gray-800">Belum Ada Barang Barter</p>
                <p className="text-[11px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Kamu belum mengunggah barang dengan status Barter. Tambahkan barang baru ke etalasemu.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddItem}
                  className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 cursor-pointer shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  + Tambah Barang Baru
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myBarterItems.map(item => {
                  const grade = item.kondisi.includes('A') ? 'A' : item.kondisi.includes('B') ? 'B' : item.kondisi.includes('C') ? 'C' : 'A';
                  const isSelected = selectedMyItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedMyItemId(isSelected ? null : item.id);
                        setValidationMsg('');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer"
                      style={{
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        background: isSelected ? '#56725715' : '#f8f4ee',
                      }}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={item.foto}
                          alt={item.nama}
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                          }}
                        />
                        <span 
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black text-white flex items-center justify-center"
                          style={{ background: grade === 'A' ? 'var(--color-primary)' : '#c9852b' }}
                        >
                          {grade}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight truncate text-gray-800">{item.nama}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                          {item.kategori} · Rp {item.harga.toLocaleString('id-ID')}
                        </p>
                      </div>
                      {isSelected && (
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'var(--color-primary)' }}
                        >
                          <svg className="w-2.5 h-2.5 text-white fill-white" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={onOpenAddItem}
            className="w-full py-2 mt-3 rounded-xl text-xs border border-dashed font-medium transition-all hover:bg-black/5 cursor-pointer"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            + Tambah Barang ke Etalase
          </button>
        </div>

        {/* Kolom 2: Barang yang Saya Cari */}
        <div 
          className="rounded-2xl p-5 border flex flex-col justify-between shadow-sm"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'var(--color-accent)' }}
              >
                2
              </span>
              <h2 className="font-bold text-sm text-gray-900">
                Barang yang Saya Cari
              </h2>
            </div>

            {/* Pesan Validasi */}
            {validationMsg && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {validationMsg}
              </div>
            )}

            {/* Input Search dengan Ikon Kaca Pembesar */}
            <div className="relative flex items-center">
              <svg 
                className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={2}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
              <input
                type="text"
                value={searchTarget}
                onChange={e => setSearchTarget(e.target.value)}
                placeholder="Cari nama barang..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all focus:border-gray-400"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              />
            </div>

            {/* Category Chips dari Kategori Aplikasi */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {CATEGORIES.map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer"
                  style={{
                    background: selectedCategory === cat ? 'var(--color-primary)' : '#f0ebe2',
                    color: selectedCategory === cat ? 'white' : 'var(--color-muted)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Radius Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--color-muted)' }}>
                <span>Radius pencarian</span>
                <span className="font-bold" style={{ color: 'var(--color-primary)' }}>≤ {radiusKm} km</span>
              </div>
              <input
                type="range" 
                min={1} 
                max={20} 
                value={radiusKm}
                onChange={e => setRadiusKm(+e.target.value)}
                className="w-full accent-green-700 h-1.5 rounded cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                * Fitur radius akan aktif setelah lokasi presisi didukung
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePerformSearch}
            className="w-full py-2.5 mt-3 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            style={{ background: 'var(--color-accent)' }}
          >
            <span>Temukan Pasangan Barter</span>
          </button>
        </div>
      </div>

      {/* Results Section */}
      {searched && (
        <div className="space-y-4 pt-2">
          {/* Header Hasil Pencocokan */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Hasil Penelusuran
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ditemukan {searchResults.length} barang barter yang sesuai
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Urutkan:</span>
              {(['Kecocokan', 'Terdekat', 'Rating'] as const).map(s => (
                <button 
                  key={s} 
                  type="button"
                  onClick={() => handleSortChange(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
                  style={{ 
                    background: sortBy === s ? 'var(--color-primary)' : '#f0ebe2', 
                    color: sortBy === s ? 'white' : 'var(--color-muted)' 
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {searchResults.length === 0 ? (
            <div
              className="p-10 rounded-2xl border text-center space-y-3"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Tidak ada barang barter yang cocok</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Belum ada pengguna lain yang menawarkan barang barter dengan kriteria ini. Coba pilih kategori "Semua" atau gunakan kata kunci lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map(result => (
                <div 
                  key={result.item.id}
                  className="rounded-2xl border overflow-hidden hover:shadow-md transition-all"
                  style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <div className="p-4 space-y-3">
                    {/* User info */}
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        <img
                          src={result.owner.foto_profil}
                          alt={result.owner.nama}
                          className="w-11 h-11 rounded-full object-cover border"
                          style={{ borderColor: 'var(--color-border)' }}
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/assets/seed-images/avatar-placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-gray-900 leading-none">{result.owner.nama}</h3>
                        <div className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: 'var(--color-muted)' }}>
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-amber-500 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="font-semibold text-gray-700">{result.owner.rating}</span>
                          </div>
                          <span>·</span>
                          <span>{result.distance}</span>
                        </div>
                      </div>
                    </div>

                    {/* Swap visualization */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="flex-1 rounded-xl p-2.5 text-center flex flex-col items-center justify-center min-w-0"
                        style={{ background: '#56725710', border: '1px solid #56725725' }}
                      >
                        <img
                          src={result.item.foto}
                          alt={result.item.nama}
                          className="w-12 h-12 rounded-lg object-cover mx-auto"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                          }}
                        />
                        <p className="text-xs font-semibold mt-1.5 leading-tight truncate w-full">{result.item.nama}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-accent)' }}>
                          Rp {result.item.harga.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-2xl font-black shrink-0" style={{ color: 'var(--color-muted)' }}>⇌</div>
                      <div 
                        className="flex-1 rounded-xl p-2.5 text-center flex flex-col items-center justify-center min-w-0"
                        style={{ background: '#e07b3910', border: '1px solid #e07b3925' }}
                      >
                        <img
                          src={selectedMyItem?.foto || '/assets/seed-images/placeholder.svg'}
                          alt={selectedMyItem?.nama || 'Barang Kamu'}
                          className="w-12 h-12 rounded-lg object-cover mx-auto"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                          }}
                        />
                        <p className="text-xs font-semibold mt-1.5 leading-tight truncate w-full">
                          {selectedMyItem?.nama || 'Barang Kamu'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>= barang kamu</p>
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenChat(result.item)}
                          className="flex-1 py-2 rounded-xl border text-xs font-bold transition-all hover:opacity-80 cursor-pointer"
                          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                        >
                          Buka Obrolan
                        </button>
                        <button
                          type="button"
                          disabled={sentOfferIds.has(result.item.id)}
                          onClick={() => handleSendOffer(result.item)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            sentOfferIds.has(result.item.id)
                              ? 'opacity-80 cursor-default text-white'
                              : 'text-white hover:opacity-90 active:scale-98 cursor-pointer'
                          }`}
                          style={{ background: sentOfferIds.has(result.item.id) ? '#4a8c5c' : 'var(--color-primary)' }}
                        >
                          {sentOfferIds.has(result.item.id) ? '✓ Tawaran Terkirim' : 'Kirim Tawaran Tukar'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveToCart(result.item)}
                        className="w-full py-1.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span>Simpan ke Keranjang</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}