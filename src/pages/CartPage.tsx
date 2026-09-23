import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB } from '../services/db';
import { Item } from '../types/database';
import { createOfferAndConversation } from '../utils/barterActions';
import Footer from '../components/Footer';

interface CartPageProps {
  onNavigate: (page: string, params?: any) => void;
  onCartUpdated?: () => void;
}

export default function CartPage({ onNavigate, onCartUpdated }: CartPageProps) {
  const { currentUser, openAuthModal } = useAuth();
  const [barterTargetItem, setBarterTargetItem] = useState<Item | null>(null);
  const [selectedMyItemId, setSelectedMyItemId] = useState<string>('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Jika belum login, tampilkan state Perlu Masuk Akun
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
          <h2 className="text-lg font-bold text-gray-900">Perlu Masuk Akun</h2>
          <p className="text-xs text-gray-500">
            Silakan masuk untuk melihat daftar barang yang sudah kamu simpan ke keranjang.
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

  const db = getDB();
  const userCart = (db.cart || []).filter(c => c.id_user === currentUser.id);

  // Map item keranjang dengan item aktual
  const cartEntries = userCart.map(c => {
    const item = db.items.find(i => i.id === c.id_item);
    return {
      cartId: c.id,
      addedAt: c.ditambahkan_pada,
      item: item || null,
      itemId: c.id_item,
    };
  });

  const handleRemoveFromCart = (cartId: string) => {
    const currentDB = getDB();
    currentDB.cart = (currentDB.cart || []).filter(c => c.id !== cartId);
    saveDB(currentDB);
    if (onCartUpdated) {
      onCartUpdated();
    }
  };

  // Barang milik user untuk modal barter
  const myItems = db.items.filter(
    i => i.id_pemilik === currentUser.id && (i.status === 'barter' || i.status === 'keduanya')
  );

  const handleSendBarterOffer = () => {
    if (!barterTargetItem || !selectedMyItemId) return;
    const myItem = myItems.find(i => i.id === selectedMyItemId);
    if (!myItem) return;

    setIsSubmittingOffer(true);
    try {
      const res = createOfferAndConversation({
        myItem,
        targetItem: barterTargetItem,
        currentUser,
      });
      setBarterTargetItem(null);
      setSelectedMyItemId('');
      if (onCartUpdated) onCartUpdated();
      onNavigate('chat', { conversationId: res.convId });
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <button
          onClick={() => onNavigate('home')}
          className="hover:text-gray-900 transition-colors flex items-center gap-1 font-medium cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Beranda</span>
        </button>
        <span>/</span>
        <span className="text-gray-900 font-bold">Keranjang (Simpan untuk Nanti)</span>
      </nav>

      {/* Header Halaman */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1
            className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Keranjang Barang
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Daftar barang yang kamu simpan untuk ditinjau, diajukan barter, atau dibeli nanti ({cartEntries.length} barang)
          </p>
        </div>
        {cartEntries.length > 0 && (
          <button
            onClick={() => onNavigate('home')}
            className="text-xs font-semibold hover:underline text-left sm:text-right cursor-pointer"
            style={{ color: 'var(--color-primary)' }}
          >
            + Cari Barang Lain
          </button>
        )}
      </div>

      {/* Konten Keranjang */}
      {cartEntries.length === 0 ? (
        <div
          className="p-12 md:p-16 rounded-2xl border text-center space-y-4 my-6"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-16 h-16 rounded-full bg-[#567257]/10 text-[#567257] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-800">
              Keranjang Kamu Masih Kosong
            </h3>
            <p className="text-xs text-gray-500">
              Simpan barang incaranmu saat melihat katalog atau hasil Smart Barter agar kamu bisa dengan mudah meninjau atau mengajukan barter kapan saja.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('home')}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--color-accent)' }}
            >
              Mulai Eksplorasi Barang
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {cartEntries.map(({ cartId, addedAt, item, itemId }) => {
            if (!item) {
              return (
                <div
                  key={cartId}
                  className="p-4 rounded-2xl border flex items-center justify-between gap-4 bg-gray-50/80"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400 text-xs shrink-0">
                      Tidak Ada
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-700">Barang Tidak Tersedia Lagi</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Barang ini mungkin sudah dihapus atau laku oleh pemiliknya.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFromCart(cartId)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium shrink-0 transition-colors cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              );
            }

            const canBarter = item.status === 'barter' || item.status === 'keduanya';

            return (
              <div
                key={cartId}
                className="p-4 md:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-xs"
                style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                {/* Info Produk */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100 relative">
                    <img
                      src={item.foto}
                      alt={item.nama}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                      }}
                    />
                    <span
                      className="absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-xs"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {item.kondisi.split(' ')[0]}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 text-gray-600">
                        {item.kategori}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Disimpan {addedAt}
                      </span>
                    </div>

                    <h3
                      onClick={() => onNavigate('product', { productId: item.id })}
                      className="text-sm md:text-base font-bold text-gray-900 leading-snug truncate hover:underline cursor-pointer"
                    >
                      {item.nama}
                    </h3>

                    <p
                      className="text-sm font-black"
                      style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
                    >
                      Rp {item.harga.toLocaleString('id-ID')}
                    </p>

                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <svg className="w-3 h-3 fill-current text-gray-400 shrink-0" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{item.lokasi}</span>
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {canBarter && (
                    <button
                      onClick={() => {
                        setBarterTargetItem(item);
                        setSelectedMyItemId(myItems.length > 0 ? myItems[0].id : '');
                      }}
                      className="px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition-all hover:opacity-90 cursor-pointer"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      Ajukan Barter
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate('product', { productId: item.id })}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold text-xs transition-colors cursor-pointer bg-white"
                  >
                    Lihat Detail
                  </button>

                  <button
                    onClick={() => handleRemoveFromCart(cartId)}
                    title="Hapus dari Keranjang"
                    className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Ajukan Barter Langsung dari Keranjang */}
      {barterTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="font-bold text-base text-gray-900">Ajukan Penawaran Barter</h3>
                <p className="text-xs text-gray-500">Pilih salah satu barangmu untuk ditukar dengan barang ini</p>
              </div>
              <button
                onClick={() => setBarterTargetItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Item Ringkas */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3">
              <img
                src={barterTargetItem.foto}
                alt={barterTargetItem.nama}
                className="w-12 h-12 rounded-lg object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">{barterTargetItem.nama}</p>
                <p className="text-xs font-semibold text-emerald-700">
                  Rp {barterTargetItem.harga.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Pilihan Barang Milik User */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Pilih Barang Milikmu ({myItems.length} tersedia untuk barter):
              </label>

              {myItems.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed text-center space-y-2 bg-amber-50/50 border-amber-200">
                  <p className="text-xs text-gray-600">
                    Kamu belum memiliki barang yang siap dibarter (status 'barter' atau 'keduanya').
                  </p>
                  <button
                    onClick={() => {
                      setBarterTargetItem(null);
                      onNavigate('my-items');
                    }}
                    className="text-xs font-bold underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Atur Barang Saya →
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {myItems.map(myItem => (
                    <button
                      type="button"
                      key={myItem.id}
                      onClick={() => setSelectedMyItemId(myItem.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        selectedMyItemId === myItem.id
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={myItem.foto}
                          alt={myItem.nama}
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{myItem.nama}</p>
                          <p className="text-[11px] text-gray-500">
                            Rp {myItem.harga.toLocaleString('id-ID')} • {myItem.kondisi}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {selectedMyItemId === myItem.id && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aksi Modal */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setBarterTargetItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedMyItemId || isSubmittingOffer}
                onClick={handleSendBarterOffer}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--color-primary)' }}
              >
                {isSubmittingOffer ? 'Mengirim...' : 'Kirim Tawaran Barter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
