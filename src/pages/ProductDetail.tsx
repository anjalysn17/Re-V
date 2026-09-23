import { useState } from 'react';
import ReturnModal from '../components/ReturnModal';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB, generateId } from '../services/db';
import { Item, User } from '../types/database';
import { createOfferAndConversation, getOrCreateConversation } from '../utils/barterActions';
import { APP_NAME } from '../constants/brand';

interface ProductDetailProps {
  productId?: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAddItem?: () => void;
  onCartUpdated?: () => void;
}

export default function ProductDetail({ productId, onNavigate, onOpenAddItem, onCartUpdated }: ProductDetailProps) {
  const { currentUser, openAuthModal } = useAuth();
  const [barterOpen, setBarterOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedMyItemId, setSelectedMyItemId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [toastMsg, setToastMsg] = useState('');

  // Ambil database terbaru
  const db = getDB();

  // Cari item berdasarkan productId
  const item: Item | undefined = db.items.find(i => i.id === productId);

  // Cari data penjual / pemilik barang
  const seller: User | undefined = item ? db.users.find(u => u.id === item.id_pemilik) : undefined;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // State: Jika barang tidak ditemukan di database
  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div
          className="max-w-md mx-auto p-8 rounded-2xl border shadow-sm space-y-4"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Barang Tidak Ditemukan
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Barang yang kamu cari mungkin telah dihapus, sudah selesai dibarter, atau tautan yang kamu buka tidak valid.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            style={{ background: 'var(--color-primary)' }}
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Fallback informasi penjual
  const sellerName = seller?.nama || `Pengguna ${APP_NAME}`;
  const sellerPhoto = seller?.foto_profil || '/assets/seed-images/avatar-placeholder.svg';
  const sellerRating = seller?.rating ?? 4.8;
  const sellerLocation = seller?.lokasi || item.lokasi;

  // Hitung rentang estimasi nilai barter (±5%)
  const minBarter = Math.round((item.harga * 0.95) / 1000) * 1000;
  const maxBarter = Math.round((item.harga * 1.05) / 1000) * 1000;

  // Daftar barang milik user login yang siap dibarter
  const myBarterItems: Item[] = currentUser
    ? db.items.filter(
        i =>
          i.id_pemilik === currentUser.id &&
          (i.status === 'barter' || i.status === 'keduanya')
      )
    : [];

  const isOwnItem = currentUser && currentUser.id === item.id_pemilik;

  // Handler klik tombol "Ajukan Barter"
  const handleOpenBarterModal = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isOwnItem) {
      showToast('Ini adalah barang milikmu sendiri!');
      return;
    }
    setBarterOpen(true);
  };

  // Handler konfirmasi kirim tawaran barter
  const handleConfirmBarter = () => {
    if (!currentUser || !selectedMyItemId) return;

    const myItem = myBarterItems.find(i => i.id === selectedMyItemId);
    if (!myItem) return;

    const { convId } = createOfferAndConversation({
      myItem,
      targetItem: item,
      currentUser,
    });

    setBarterOpen(false);
    onNavigate('chat', { conversationId: convId });
  };

  // Handler klik tombol "Chat"
  const handleChat = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isOwnItem) {
      showToast('Kamu tidak bisa memulai obrolan dengan diri sendiri.');
      return;
    }

    const { convId } = getOrCreateConversation({
      targetItem: item,
      currentUser,
    });

    onNavigate('chat', { conversationId: convId });
  };

  // Handler klik tombol "Ajak COD via Chat"
  const handleAjakCOD = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isOwnItem) {
      showToast('Kamu tidak bisa mengajak COD pada barang milikmu sendiri.');
      return;
    }

    const codMessage = `Halo kak ${sellerName}, saya tertarik dengan barang "${item.nama}". Apakah bisa ketemuan langsung untuk cek barang & COD di area ${item.lokasi}?`;

    const { convId } = getOrCreateConversation({
      targetItem: item,
      currentUser,
      initialMessage: codMessage,
    });

    onNavigate('chat', { conversationId: convId });
  };

  // Handler klik tombol "Simpan ke Keranjang"
  const handleSaveToCart = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    const currentDB = getDB();
    if (!Array.isArray(currentDB.cart)) currentDB.cart = [];

    const alreadyInCart = currentDB.cart.some(
      c => c.id_user === currentUser.id && c.id_item === item.id
    );

    if (alreadyInCart) {
      showToast('Barang ini sudah ada di keranjangmu');
      return;
    }

    const newCartItem = {
      id: generateId('CRT', currentDB.cart),
      id_user: currentUser.id,
      id_item: item.id,
      ditambahkan_pada: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };

    currentDB.cart.unshift(newCartItem);
    saveDB(currentDB);
    showToast('✓ Berhasil disimpan ke keranjang!');
    if (onCartUpdated) {
      onCartUpdated();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in"
          style={{ background: 'var(--color-primary)' }}
        >
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Breadcrumb Navigasi */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
        <button className="hover:text-gray-800 cursor-pointer" onClick={() => onNavigate('home')}>
          Beranda
        </button>
        <span>/</span>
        <button
          className="hover:text-gray-800 cursor-pointer"
          onClick={() => onNavigate('category', { category: item.kategori })}
        >
          {item.kategori}
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{item.nama}</span>
      </nav>

      {/* Card Utama */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* SISI KIRI: Foto Asli Produk */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center p-2 relative shadow-xs">
              <img
                src={item.foto}
                alt={item.nama}
                className="w-full h-full object-contain"
                onError={e => {
                  (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                }}
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {item.kondisi}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                  {item.status === 'keduanya'
                    ? 'Jual & Barter'
                    : item.status === 'barter'
                    ? 'Barter'
                    : 'Jual Beli'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Lokasi: {item.lokasi}</span>
            </div>
          </div>

          {/* SISI KANAN: Detail & Aksi */}
          <div className="md:col-span-7 flex flex-col">
            {/* Tag Kategori & Kondisi */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                {item.kondisi}
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-md font-medium">
                {item.status === 'keduanya'
                  ? 'Tersedia Barter & Beli'
                  : item.status === 'barter'
                  ? 'Tersedia Barter'
                  : 'Tersedia Beli'}
              </span>
            </div>

            {/* Judul Produk */}
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
              {item.nama}
            </h1>

            {/* Info Rating Penjual & Kategori */}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-amber-500 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-gray-900 font-semibold">{sellerRating}</span>
              </div>
              <span>•</span>
              <span>Kategori: {item.kategori}</span>
              <span>•</span>
              <span>Penjual Mahasiswa UNNES</span>
            </div>

            {/* Harga Beli */}
            <div className="my-5 pb-4 border-b border-gray-100 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900 tracking-tight">
                Rp {item.harga.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Box Estimasi Barter */}
            {(item.status === 'barter' || item.status === 'keduanya') && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Estimasi Nilai Barter</span>
                  <span className="font-semibold text-gray-900">
                    Rp {minBarter.toLocaleString('id-ID')} – Rp {maxBarter.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Nilai estimasi untuk barang yang sepadan diajukan sebagai barter.
                </p>
              </div>
            )}

            {/* Jumlah Pembelian */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs text-gray-500 font-medium">Jumlah:</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 py-1 hover:bg-gray-100 text-gray-600 text-sm cursor-pointer"
                >
                  −
                </button>
                <span className="px-3 py-1 text-xs font-semibold min-w-[2rem] text-center text-gray-800">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  className="px-3 py-1 hover:bg-gray-100 text-gray-600 text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-gray-400">Tersedia 1 unit</span>
            </div>

            {/* Profil Penjual */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 mb-6">
              <div className="flex items-center gap-3">
                <img
                  src={sellerPhoto}
                  alt={sellerName}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/assets/seed-images/avatar-placeholder.svg';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{sellerName}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      Mahasiswa UNNES
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Rating {sellerRating} • {sellerLocation}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleChat}
                className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Chat Penjual
              </button>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              {(item.status === 'barter' || item.status === 'keduanya') && (
                <button
                  type="button"
                  onClick={handleOpenBarterModal}
                  className="flex-1 min-w-[120px] py-3 text-white font-semibold text-xs md:text-sm rounded-xl transition-all shadow-xs hover:opacity-90 cursor-pointer"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Ajukan Barter
                </button>
              )}
              <button
                type="button"
                className="flex-1 min-w-[120px] py-3 border border-gray-300 hover:border-gray-400 bg-white text-gray-800 font-semibold text-xs md:text-sm rounded-xl transition-all cursor-pointer"
              >
                Beli Sekarang
              </button>
              <button
                type="button"
                onClick={handleSaveToCart}
                className="px-3.5 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Simpan ke Keranjang"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>Simpan</span>
              </button>
              <button
                type="button"
                onClick={handleChat}
                className="px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs md:text-sm rounded-xl transition-all cursor-pointer"
              >
                Chat
              </button>
            </div>

            {/* Garansi Ringkas */}
            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-2.5">
              <span>Garansi Retur 2×24 jam jika kondisi tidak sesuai deskripsi.</span>
              <button
                type="button"
                onClick={() => setReturnOpen(true)}
                className="underline text-gray-700 hover:text-black font-medium cursor-pointer"
              >
                Pelajari
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Bawah: Deskripsi & Titik COD */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Deskripsi Kondisi Fisik */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Deskripsi & Kondisi Barang
            </h2>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              {item.kondisi}
            </span>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-700 leading-relaxed space-y-3">
            <p className="whitespace-pre-wrap">{item.deskripsi || 'Tidak ada deskripsi tambahan untuk barang ini.'}</p>
          </div>
        </div>

        {/* Kolom Titik COD */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Titik Ketemuan / COD
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Penjual bersedia melakukan transaksi ketemuan langsung (COD) di sekitar area:
            </p>

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-gray-100 bg-gray-50">
              <svg className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-xs font-bold text-gray-800">{item.lokasi}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Lokasi disepakati bersama via obrolan</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAjakCOD}
            className="w-full mt-6 py-2.5 bg-gray-900 hover:bg-black text-white font-medium text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Ajak COD via Chat
          </button>
        </div>
      </div>

      {/* Modal Ajukan Barter */}
      {barterOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={e => e.target === e.currentTarget && setBarterOpen(false)}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Ajukan Penawaran Barter</h3>
              <button
                type="button"
                onClick={() => setBarterOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs text-gray-500 block mb-2 font-medium">Barang yang diinginkan:</span>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <img
                    src={item.foto}
                    alt={item.nama}
                    className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{item.nama}</p>
                    <p className="text-xs text-emerald-800 font-semibold">
                      Rp {item.harga.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 block mb-2 font-medium">
                  Pilih barang milikmu untuk ditukarkan:
                </span>

                {myBarterItems.length === 0 ? (
                  <div className="p-5 text-center space-y-2 rounded-xl border border-dashed bg-gray-50 border-gray-200">
                    <p className="text-xs font-bold text-gray-700">Kamu Belum Punya Barang Barter</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Kamu belum mengunggah barang dengan status Barter. Upload barang ke etalasemu sekarang.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBarterOpen(false);
                        if (onOpenAddItem) onOpenAddItem();
                      }}
                      className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      + Tambah Barang Baru
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {myBarterItems.map(myItem => {
                      const isSelected = selectedMyItemId === myItem.id;
                      const priceDiff = Math.abs(myItem.harga - item.harga);
                      return (
                        <button
                          key={myItem.id}
                          type="button"
                          onClick={() => setSelectedMyItemId(isSelected ? null : myItem.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={myItem.foto}
                            alt={myItem.nama}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{myItem.nama}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              <span className="font-bold text-gray-800">
                                Rp {myItem.harga.toLocaleString('id-ID')}
                              </span>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500">
                                Selisih: Rp {priceDiff.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBarterOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 font-medium text-xs text-gray-600 rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!selectedMyItemId}
                  onClick={handleConfirmBarter}
                  className="flex-1 py-2.5 font-medium text-xs text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Kirim Tawaran Barter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {returnOpen && <ReturnModal onClose={() => setReturnOpen(false)} />}
    </div>
  );
}