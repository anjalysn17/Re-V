import { useMemo, useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  getDB,
  getCatalogItems,
  parseSafePrice,
  resolveGrade,
  isItemSold,
} from '../services/db';
import { estimateLocationDistance, DEFAULT_LOCATION_ID } from '../constants/locations';

interface SearchResultsPageProps {
  query?: string;
  onNavigate: (page: any, params?: any) => void;
}

const CATEGORIES = [
  'Semua',
  'Elektronik',
  'Buku & Alat Tulis',
  'Fashion',
  'Perlengkapan',
  'Tas',
];

export default function SearchResultsPage({ query = '', onNavigate }: SearchResultsPageProps) {
  const { currentUser } = useAuth();
  const [keyword, setKeyword] = useState<string>(query);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [offerFilter, setOfferFilter] = useState<'all' | 'jual' | 'barter'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [dbTick, setDbTick] = useState<number>(0);
  const [transientCoords, setTransientCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setKeyword(query);
  }, [query]);

  // Dengarkan pembaruan DB real-time tanpa perlu refresh halaman
  useEffect(() => {
    const handleDbUpdated = () => setDbTick((prev) => prev + 1);
    window.addEventListener('rev-db-updated', handleDbUpdated);
    return () => window.removeEventListener('rev-db-updated', handleDbUpdated);
  }, []);

  // Ambil koordinat sementara hanya jika izin lokasi browser sudah diberikan (tidak disimpan ke DB)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted' && !cancelled) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!cancelled) {
                setTransientCoords({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                });
              }
            },
            () => {},
            { maximumAge: 60_000, timeout: 5_000 }
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedItems = useMemo(() => {
    const db = getDB();
    const items = getCatalogItems(db);

    return items.map((item) => {
      const numericPrice = parseSafePrice(item.harga ?? item.price ?? 0);
      const rawOffer = String(item.transactionType || item.status || '').toLowerCase();
      const offerType =
        rawOffer === 'jual_barter' || rawOffer === 'keduanya'
          ? 'keduanya'
          : rawOffer === 'barter'
          ? 'barter'
          : 'jual';

      const fullLocation = (item.lokasi || 'Kampus UNNES').trim();
      const shortLocation = fullLocation.split(',')[0].trim() || 'Kampus UNNES';
      const distInfo = estimateLocationDistance(
        currentUser?.lokasi || DEFAULT_LOCATION_ID,
        fullLocation,
        transientCoords
      );

      return {
        id: item.id,
        name: item.nama || item.title || item.nama_barang || 'Tanpa Nama',
        description: item.deskripsi || '',
        numericPrice,
        price:
          numericPrice === 0 && offerType === 'barter'
            ? 'Khusus Barter'
            : `Rp ${numericPrice.toLocaleString('id-ID')}`,
        location: shortLocation,
        fullLocation,
        distanceLabel: distInfo?.label || '',
        img: item.foto || '/assets/seed-images/placeholder.svg',
        grade: resolveGrade(item.kondisi),
        barter: offerType === 'barter' || offerType === 'keduanya',
        sellable: offerType === 'jual' || offerType === 'keduanya',
        isSold: isItemSold(item),
        category: item.kategori || 'Lainnya',
      };
    });
  }, [dbTick, currentUser?.lokasi, transientCoords]);

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
      <div
        className="rounded-2xl p-4 sm:p-5 border shadow-xs space-y-4"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="min-h-[40px] px-1 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-1 inline-flex items-center gap-1 touch-manipulation"
            >
              <span>←</span> Kembali ke Beranda
            </button>
            <h1 className="text-lg sm:text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
              {keyword.trim() ? `Hasil Pencarian "${keyword.trim()}"` : 'Semua Barang Kampus'}
            </h1>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Menampilkan <strong className="text-gray-900">{filteredItems.length}</strong> barang
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari judul barang, kategori, atau lokasi COD (mis. Sekaran, buku, kipas)..."
              className="w-full min-h-[44px] pl-9 pr-10 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:border-[#567257]"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-xs text-gray-400 hover:text-gray-700 touch-manipulation"
              >
                ✕
              </button>
            )}
          </div>

          <select
            aria-label="Urutkan hasil"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'price-asc' | 'price-desc')}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold bg-white text-gray-700 focus:outline-none cursor-pointer touch-manipulation"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="newest">Urutkan: Terbaru</option>
            <option value="price-asc">Harga: Terendah ke Tertinggi</option>
            <option value="price-desc">Harga: Tertinggi ke Terendah</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors touch-manipulation ${
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

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
            {[
              { id: 'all', label: 'Semua Tipe' },
              { id: 'jual', label: 'Bisa Dibeli' },
              { id: 'barter', label: 'Bisa Barter' },
            ].map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setOfferFilter(opt.id as 'all' | 'jual' | 'barter')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border shrink-0 transition-colors touch-manipulation ${
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

      {filteredItems.length === 0 ? (
        <div
          className="rounded-2xl p-8 sm:p-10 border text-center space-y-3"
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
            className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation"
            style={{ background: 'var(--color-primary)' }}
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredItems.map((product) => {
            const gradeBg =
              product.grade === 'A'
                ? 'var(--color-primary)'
                : product.grade === 'B'
                ? '#c9852b'
                : '#6b7280';

            return (
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
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/assets/seed-images/placeholder.svg';
                    }}
                  />
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: gradeBg, color: 'white' }}
                    >
                      Grade {product.grade}
                    </span>
                    {product.barter && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}
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
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0ebe2] text-[11px] text-gray-600 max-w-[65%]">
                      <svg className="w-3 h-3 shrink-0 fill-current text-gray-500" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="truncate">{product.location}</span>
                    </div>
                    {product.distanceLabel && (
                      <span
                        title={`Estimasi jarak ke ${product.fullLocation}`}
                        className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0"
                      >
                        {product.distanceLabel}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Footer onNavigate={onNavigate} />
    </div>
  );
}