import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB } from '../services/db';
import { Item } from '../types/database';

interface MyItemsPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAddItem: () => void;
}

export default function MyItemsPage({ onNavigate, onOpenAddItem }: MyItemsPageProps) {
  const { currentUser, openAuthModal } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (currentUser) {
      const db = getDB();
      const myItems = db.items.filter(item => item.id_pemilik === currentUser.id);
      setItems(myItems);
    } else {
      setItems([]);
    }
  }, [currentUser]);

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
            Silakan masuk untuk melihat daftar barang yang kamu tawarkan untuk jual atau barter.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-accent)' }}
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Barang Saya
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Daftar barang yang kamu iklankan di UniSwap ({items.length} barang)
          </p>
        </div>

        <button
          onClick={onOpenAddItem}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 shrink-0"
          style={{ background: 'var(--color-accent)', fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Tambah Barang Baru</span>
        </button>
      </div>

      {/* Konten Daftar Barang */}
      {items.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center space-y-4"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-800">Belum Ada Barang yang Diunggah</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Punya barang tak terpakai atau ingin barter dengan teman kampus? Pasang iklan sekarang juga!
          </p>
          <button
            onClick={onOpenAddItem}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            Mulai Pasang Iklan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <div
              key={item.id}
              className="rounded-2xl border overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={item.foto}
                    alt={item.nama}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                    }}
                  />
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {item.kondisi}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white">
                      {item.status === 'keduanya' ? 'Jual & Barter' : item.status === 'barter' ? 'Barter' : 'Jual'}
                    </span>
                  </div>

                  {/* Badge Ketersediaan */}
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                      Tersedia
                    </span>
                  </div>
                </div>

                <div className="p-3.5 space-y-1.5">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    {item.kategori}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                    {item.nama}
                  </h4>
                  <p
                    className="text-base font-black"
                    style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
                  >
                    Rp {item.harga.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {item.deskripsi}
                  </p>
                </div>
              </div>

              <div className="p-3.5 pt-0 border-t mt-2 flex items-center justify-between text-xs" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[11px] text-gray-500">{item.lokasi}</span>
                <button
                  onClick={() => onNavigate('product', { productId: item.id })}
                  className="font-bold hover:underline text-xs"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Detail →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
