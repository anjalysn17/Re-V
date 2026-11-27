import { useMemo, useState } from 'react';
import Footer from '../components/Footer';
import { getDB } from '../services/db';

interface CategoryPageProps {
  category: string;
  onNavigate: (page: string, params?: any) => void;
}

const ALL_CATEGORIES = [
  { label: 'Elektronik', icon: '/elektronik.jpg' },
  { label: 'Buku & Alat Tulis', icon: '/bukk.jpg' },
  { label: 'Fashion', icon: '/bajuu.jpg' },
  { label: 'Perlengkapan', icon: '/perlengkapan.jpg' },
  { label: 'Tas', icon: '/tas.jpg' },
  { label: 'Lainnya', icon: '/assets/seed-images/placeholder.svg' },
];

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
  const [offerFilter, setOfferFilter] = useState<'all' | 'jual' | 'barter'>('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [hideSold, setHideSold] = useState<boolean>(false);

  const db = getDB() as any;
  const activeCategory = category || 'Elektronik';

  const categoryProducts = useMemo(() => {
    const items: any[] = db.items || [];
    const targetCat = activeCategory.toLowerCase().trim();

    return items
      .filter((item) => {
        const itemCat = String(item.kategori || item.category || 'Lainnya')
          .toLowerCase()
          .trim();

        if (targetCat === 'lainnya') {
          const knownCats = ['elektronik', 'buku & alat tulis', 'fashion', 'perlengkapan', 'tas'];
          return itemCat === 'lainnya' || !knownCats.some((k) => itemCat.includes(k));
        }

        return (
          itemCat === targetCat ||
          itemCat.includes(targetCat) ||
          targetCat.includes(itemCat)
        );
      })
      .map((item, idx) => {
        const numericPrice = parseSafePrice(item.harga ?? item.price ?? 0);
        const rawStatus = String(item.status || '').toLowerCase();
        const offerType =
          item.transactionType ||
          (['jual', 'barter', 'keduanya'].includes(rawStatus) ? rawStatus : 'jual');
        const fullLocation = (item.lokasi || item.location || 'Kampus UNNES').trim();
        const shortLocation = fullLocation.split(',')[0].trim() || 'Kampus UNNES';

        return {
          id: item.id,
          name: item.nama || item.title || item.nama_barang || 'Tanpa Nama',
          numericPrice,
          price:
            numericPrice === 0 && offerType === 'barter'
              ? 'Khusus Barter'
              : `Rp ${numericPrice.toLocaleString('id-ID')}`,
          location: shortLocation,
          img: item.foto || item.image || '/assets/seed-images/placeholder.svg',
          grade: resolveGrade(item.kondisi),
          offerType,
          canSell: offerType === 'jual' || offerType === 'keduanya',
          canBarter: offerType === 'barter' || offerType === 'keduanya',
          isSold: isItemSold(item),
          createdAt: item.createdAt || item.tanggal || '',
          orderIndex: idx,
        };
      });
  }, [db.items, activeCategory]);

  const filteredAndSorted = useMemo(() => {
    const list = categoryProducts.filter((p) => {
      if (hideSold && p.isSold) return false;
      if (offerFilter === 'jual' && !p.canSell) return false;
      if (offerFilter === 'barter' && !p.canBarter) return false;
      if (gradeFilter !== 'all' && p.grade !== gradeFilter) return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.numericPrice - b.numericPrice);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.numericPrice - a.numericPrice);
    }
    return list;
  }, [categoryProducts, hideSold, offerFilter, gradeFilter, sortBy]);

  const resetFilters = () => {
    setOfferFilter('all');
    setGradeFilter('all');
    setSortBy('newest');
    setHideSold(false);
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-5 space-y-6">
      {/* Breadcrumb & Tombol Kembali */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 py-1 touch-manipulation"
        >
          <span>←</span> Beranda
        </button>
        <span className="text-xs text-gray-400">
          Kategori / <strong className="text-gray-700">{activeCategory}</strong>
        </span>
      </div>

      {/* Header Banner Kategori */}
      <div
        className="rounded-2xl p-5 sm:p-7 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #3e5540 0%, var(--color-primary) 100%)' }}
      >
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 mb-2">
            Jelajah Kategori
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {activeCategory}
          </h1>
          <p className="text-xs sm:text-sm text-white/85 mt-1">
            Menampilkan {filteredAndSorted.length} dari {categoryProducts.length} barang tersedia di sekitar kampus
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('barter')}
          className="self-start sm:self-center min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-gray-100 transition-colors shrink-0 touch-manipulation"
          style={{ color: 'var(--color-primary)' }}
        >
          ⇄ Cek Kecocokan Barter
        </button>
      </div>

      {/* Navigasi Cepat Antar Kategori */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {ALL_CATEGORIES.map((cat) => {
          const isCurrent = cat.label.toLowerCase() === activeCategory.toLowerCase();
          return (
            <button
              type="button"
              key={cat.label}
              onClick={() => onNavigate('category', cat.label)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all touch-manipulation ${
                isCurrent
                  ? 'text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              style={
                isCurrent
                  ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                  : { borderColor: 'var(--color-border)' }
              }
            >
              <img
                src={cat.icon}
                alt={cat.label}
                className="w-5 h-5 rounded-md object-cover bg-gray-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                }}
              />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bar Filter & Urutkan */}
      <div
        className="rounded-2xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Jenis Penawaran */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'jual', label: 'Dijual' },
              { id: 'barter', label: 'Bisa Barter' },
            ].map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setOfferFilter(opt.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors touch-manipulation ${
                  offerFilter === opt.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filter Grade */}
          <select
            aria-label="Filter Grade Kondisi"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border bg-white text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="all">Semua Grade</option>
            <option value="A">Grade A (Seperti Baru)</option>
            <option value="B">Grade B (Layak Pakai)</option>
            <option value="C">Grade C (Cacat Minor)</option>
          </select>

          {/* Sembunyikan Terjual */}
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-white text-xs font-semibold text-gray-700 cursor-pointer select-none" style={{ borderColor: 'var(--color-border)' }}>
            <input
              type="checkbox"
              checked={hideSold}
              onChange={(e) => setHideSold(e.target.checked)}
              className="accent-emerald-700"
            />
            <span>Sembunyikan Terjual</span>
          </label>
        </div>

        {/* Urutkan */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-gray-500 whitespace-nowrap">Urutkan:</span>
          <select
            aria-label="Urutkan Barang"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl border bg-white text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="newest">Terbaru</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="price_desc">Harga Tertinggi</option>
          </select>
        </div>
      </div>

      {/* Grid Produk Kategori */}
      {filteredAndSorted.length === 0 ? (
        <div
          className="p-10 sm:p-12 rounded-2xl border text-center space-y-3"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-base font-bold text-gray-800">
            Belum ada barang yang sesuai pada kategori {activeCategory}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Coba atur ulang filter kondisi/penawaran di atas atau jelajahi kategori barang kampus lainnya.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {(offerFilter !== 'all' || gradeFilter !== 'all' || hideSold) && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold text-white touch-manipulation"
                style={{ background: 'var(--color-primary)' }}
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold border bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredAndSorted.map((product) => (
            <button
              type="button"
              key={product.id}
              onClick={() => onNavigate('product', { productId: product.id })}
              className={`rounded-2xl border overflow-hidden text-left group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer touch-manipulation ${
                product.isSold ? 'opacity-75' : ''
              }`}
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                  src={product.img}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                  }}
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{
                      background:
                        product.grade === 'A'
                          ? 'var(--color-primary)'
                          : product.grade === 'B'
                          ? '#c9852b'
                          : '#6b7280',
                    }}
                  >
                    Grade {product.grade}
                  </span>
                  {product.canBarter && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
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
                <p className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem] text-gray-900">
                  {product.name}
                </p>
                <p
                  className="text-sm sm:text-base font-black mt-1.5 break-words"
                  style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
                >
                  {product.price}
                </p>
                <div className="mt-2">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0ebe2] text-[11px] text-gray-600 max-w-full">
                    <svg className="w-3 h-3 shrink-0 fill-current text-gray-500" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="truncate">{product.location}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Footer onNavigate={onNavigate} />
    </div>
  );
}