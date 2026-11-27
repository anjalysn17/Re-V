import { useMemo, useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { getDB } from '../services/db';

interface SearchResultsPageProps {
  query?: string;
  onNavigate: (page: string, params?: any) => void;
}

const CATEGORIES = [
  'Semua',
  'Elektronik',
  'Buku & Alat Tulis',
  'Fashion',
  'Perlengkapan',
  'Tas',
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

export default function SearchResultsPage({ query = '', onNavigate }: SearchResultsPageProps) {
  const [keyword, setKeyword] = useState<string>(query);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [offerFilter, setOfferFilter] = useState<'all' | 'jual' | 'barter'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  useEffect(() => {
    setKeyword(query);
  }, [query]);

  const db = getDB() as any;

  const normalizedItems = useMemo(() => {
    const items: any[] = db.items || [];
    return items.map((item, idx) => {
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
        description: item.deskripsi || item.description || '',
        numericPrice,
        price:
          numericPrice === 0 && offerType === 'barter'
            ? 'Khusus Barter'
            : `Rp ${numericPrice.toLocaleString('id-ID')}`,
        location: shortLocation,
        fullLocation,
        img: item.foto || item.image || '/assets/seed-images/placeholder.svg',
        grade: resolveGrade(item.kondisi || item.condition),
        barter: offerType === 'barter' || offerType === 'keduanya',
        sellable: offerType === 'jual' || offerType === 'keduanya',
        isSold: isItemSold(item),
        sold: (idx % 8) + 2,
        category: item.kategori || item.category || 'Lainnya',
        createdAt: item.createdAt || item.tanggal || '',
      };
    });
  }, [db.items]);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    const list = normalizedItems.filter((item) => {
      if (q) {
        const matchText =
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.fullLocation.toLowerCase().includes(q);
        if (!matchText) return false;
      }

      if (selectedCategory !== 'Semua') {
        if (item.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      if (offerFilter === 'barter' && !item.barter) return false;
      if (offerFilter === 'jual' && !item.sellable) return false;

      return true;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.numericPrice - b.numericPrice);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.numericPrice - a.numericPrice);
    }
    return list;
  }, [normalizedItems, keyword, selectedCategory, offerFilter, sortBy]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Input Pencarian */}
      <div
        className="rounded-2xl p-5 border shadow-xs space-y-4"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 mb-1 inline-flex items-center gap-1 touch-manipulation"
            >
              <span>←</span> Kembali ke Beranda
            </button>
            <h1 className="text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
              {keyword.trim() ? `Hasil Pencarian "${keyword.trim()}"` : 'Semua Barang Kampus'}
            </h1>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Menampilkan <strong className="text-gray-900">{filteredItems.length}</strong> barang
          </span>
        </div>

        {/* Bar Pencarian + Pengurutan */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari judul barang, kategori, atau lokasi COD (mis. Sekaran, buku, kipas)..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border text-xs sm:text-sm bg-white focus:outline-none focus:border-[#567257]"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                aria-label="Hapus kata kunci"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 px-1.5 py-0.5 touch-manipulation"
              >
                ✕
              </button>
            )}
          </div>

          <select
            aria-label="Urutkan hasil"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3.5 py-2.5 rounded-xl border text-xs font-semibold bg-white text-gray-700 focus:outline-none cursor-pointer"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="newest">Urutkan: Terbaru</option>
            <option value="price-asc">Harga: Terendah ke Tertinggi</option>
            <option value="price-desc">Harga: Tertinggi ke Terendah</option>
          </select>
        </div>

        {/* Filter Kategori & Tipe Penawaran */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors touch-manipulation ${
                  selectedCategory === cat
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedCategory === cat ? { background: 'var(--color-primary)' } : undefined}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'all', label: 'Semua Tipe' },
              { id: 'jual', label: 'Bisa Dibeli' },
              { id: 'barter', label: 'Bisa Barter' },
            ].map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setOfferFilter(opt.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors touch-manipulation ${
                  offerFilter === opt.id
                    ? 'border-[#567257] bg-[#567257]/10 text-[#3e5540]'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Hasil Pencarian */}
      {filteredItems.length === 0 ? (
        <div
          className="rounded-2xl p-10 border text-center space-y-3"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm font-bold text-gray-800">
            Tidak ditemukan barang yang sesuai dengan filter pencarianmu
          </p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Coba gunakan kata kunci yang lebih umum atau atur ulang filter kategori dan jenis penawaran.
          </p>
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setSelectedCategory('Semua');
              setOfferFilter('all');
              setSortBy('newest');
            }}
            className="min-h-[40px] px-5 py-2 rounded-xl text-xs font-bold text-white touch-manipulation"
            style={{ background: 'var(--color-primary)' }}
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredItems.map((product) => (
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
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: product.grade === 'A' ? 'var(--color-primary)' : '#c9852b',
                      color: 'white',
                    }}
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
                <p className="text-[10px] font-semibold text-gray-400 mb-0.5">{product.category}</p>
                <p className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </p>
                <p
                  className="text-sm sm:text-base font-black mt-1.5 break-words"
                  style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
                >
                  {product.price}
                </p>
                <div className="flex items-center justify-between gap-1.5 mt-2">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0ebe2] text-[11px] text-gray-600 max-w-[68%]">
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

      <Footer onNavigate={onNavigate} />
    </div>
  );
}