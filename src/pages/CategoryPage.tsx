import { useMemo, useState } from 'react';
import Footer from '../components/Footer';
import { getDB } from '../services/db';

interface CategoryPageProps {
  category: string;
  onNavigate: (page: string, params?: any) => void;
}

function parseSafePrice(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    if (/^\d+\.\d{1,2}$/.test(trimmed)) {
      return Math.max(0, Math.round(Number(trimmed)));
    }
    const digits = trimmed.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }
  return 0;
}

function isItemSold(item: any): boolean {
  const status = String(item?.status || '').toLowerCase();
  return (
    item?.terjual === true ||
    item?.isSold === true ||
    status === 'sold' ||
    status === 'terjual' ||
    status === 'dibarter'
  );
}

function resolveGrade(kondisi?: string): 'A' | 'B' | 'C' {
  const val = String(kondisi || '').trim();
  if (!val) return 'A';
  if (/\bGrade\s*C\b/i.test(val) || val === 'C' || /layak pakai/i.test(val)) return 'C';
  if (/\bGrade\s*B\b/i.test(val) || val === 'B' || /baik/i.test(val)) return 'B';
  return 'A';
}

export default function CategoryPage({ category, onNavigate }: CategoryPageProps) {
  const db = getDB();
  const [selectedLocation, setSelectedLocation] = useState<string>('Semua');

  // Filter produk berdasarkan kategori menggunakan pencocokan string persis (sesuai kontrak PAKEM)
  const filteredItems = useMemo(() => {
    return db.items.filter(item => {
      if (!item.kategori || !category) return false;
      return item.kategori.toLowerCase().trim() === category.toLowerCase().trim();
    });
  }, [db.items, category]);

  const allProducts = useMemo(() => {
    return filteredItems.map((rawItem, idx) => {
      const item = rawItem as any;
      const itemName = item.nama || item.title || item.nama_barang || 'Barang Tanpa Nama';
      const numericPrice = parseSafePrice(item.harga ?? item.price ?? 0);

      const fullLocation = (item.lokasi || 'Kampus UNNES').trim();
      const shortLocation = fullLocation.split(',')[0].trim() || 'Kampus UNNES';

      const grade = resolveGrade(item.kondisi);
      const rawStatus = String(item.status || '').toLowerCase();
      const offerType =
        item.transactionType ||
        (['jual', 'barter', 'keduanya'].includes(rawStatus) ? rawStatus : 'jual');
      const isBarter = offerType === 'barter' || offerType === 'keduanya';
      const soldFlag = isItemSold(item);

      return {
        id: item.id,
        name: itemName,
        price:
          numericPrice === 0 && offerType === 'barter'
            ? 'Khusus Barter'
            : `Rp ${numericPrice.toLocaleString('id-ID')}`,
        location: shortLocation,
        img: item.foto || '/assets/seed-images/placeholder.svg',
        grade,
        barter: isBarter,
        isSold: soldFlag,
        sold: (idx % 8) + 2,
        kategori: item.kategori,
      };
    });
  }, [filteredItems]);

  // Daftar lokasi unik untuk filter titik COD di kategori aktif
  const availableLocations = useMemo(() => {
    const unique = Array.from(new Set(allProducts.map(p => p.location).filter(Boolean)));
    return ['Semua', ...unique];
  }, [allProducts]);

  const activeLocation = availableLocations.includes(selectedLocation) ? selectedLocation : 'Semua';

  const products = useMemo(() => {
    if (activeLocation === 'Semua') return allProducts;
    return allProducts.filter(p => p.location === activeLocation);
  }, [allProducts, activeLocation]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb & Navigasi Kembali */}
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
        <span>Kategori</span>
        <span>/</span>
        <span className="text-gray-900 font-bold">{category}</span>
      </nav>

      {/* Header Kategori & Filter Lokasi */}
      <div
        className="border-b pb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1
            className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {category}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Menampilkan {products.length} barang dalam kategori {category}
            {activeLocation !== 'Semua' ? ` di area ${activeLocation}` : ''}
          </p>
        </div>

        {availableLocations.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-gray-500 mr-1">Lokasi COD:</span>
            {availableLocations.map(loc => {
              const active = activeLocation === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setSelectedLocation(loc)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer"
                  style={
                    active
                      ? {
                          background: 'var(--color-primary)',
                          borderColor: 'var(--color-primary)',
                          color: 'white',
                        }
                      : {
                          background: 'var(--color-card)',
                          borderColor: 'var(--color-border)',
                          color: '#4b5563',
                        }
                  }
                >
                  {loc}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Produk atau Empty State */}
      {products.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center space-y-4 my-6"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-14 h-14 rounded-full bg-[#567257]/10 text-[#567257] flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-800">
              {activeLocation !== 'Semua'
                ? `Belum ada barang di area ${activeLocation}`
                : `Belum ada barang di kategori ${category}`}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeLocation !== 'Semua'
                ? 'Coba pilih filter "Semua" untuk melihat barang di titik COD kampus lainnya.'
                : 'Belum ada pengguna yang memasang iklan untuk kategori ini. Yuk, jadi yang pertama upload barang!'}
            </p>
          </div>
          {activeLocation !== 'Semua' ? (
            <button
              onClick={() => setSelectedLocation('Semua')}
              className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold border hover:bg-black/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
            >
              Tampilkan Semua Lokasi
            </button>
          ) : (
            <button
              onClick={() => onNavigate('home')}
              className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold border hover:bg-black/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
            >
              ← Kembali ke Beranda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => onNavigate('product', { productId: product.id })}
              className={`rounded-2xl border overflow-hidden text-left group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer ${
                product.isSold ? 'opacity-75' : ''
              }`}
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                  src={product.img}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                  }}
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: product.grade === 'A' ? 'var(--color-primary)' : '#c9852b', color: 'white' }}
                  >
                    Grade {product.grade}
                  </span>
                  {product.barter && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                    >
                      Barter
                    </span>
                  )}
                  {product.isSold && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                      Terjual
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</p>
                <p
                  className="text-sm sm:text-base font-black mt-1.5 tabular-nums break-words"
                  style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
                >
                  {product.price}
                </p>
                <div className="flex items-center justify-between gap-1 mt-2">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0ebe2] text-[11px] text-gray-600 max-w-[70%]">
                    <svg className="w-3 h-3 shrink-0 fill-current text-gray-500" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="truncate">{product.location}</span>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--color-muted)' }}>
                    {product.sold} terjual
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Footer />
    </div>
  );
}