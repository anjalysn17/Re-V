import { useMemo, useState } from 'react';
import Footer from '../components/Footer';
import { getDB } from '../services/db';

interface SearchResultsPageProps {
  query: string;
  onNavigate: (page: string, params?: any) => void;
}

function parseSafePrice(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const digits = raw.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }
  return 0;
}

export default function SearchResultsPage({ query, onNavigate }: SearchResultsPageProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  const db = getDB();
  const trimmedQuery = (query || '').trim().toLowerCase();

  // Normalisasi item agar aman terhadap alias field backend & data lama yang belum lengkap
  const normalizedItems = useMemo(() => {
    return (db.items || []).map((item, idx) => {
      const raw = item as any;
      const name: string = item.nama || raw.title || raw.nama_barang || 'Barang Tanpa Nama';
      const description: string = item.deskripsi || '';
      const category: string = item.kategori || 'Lainnya';
      const safePrice = parseSafePrice(item.harga ?? raw.price ?? 0);
      const fullLocation: string = (item.lokasi || 'Kampus UNNES').trim();
      const shortLocation: string = fullLocation.split(',')[0].trim() || 'Kampus UNNES';
      const kondisi: string = item.kondisi || 'Grade A';
      const offerType: string = raw.transactionType || item.status || 'jual';
      const isSold: boolean = Boolean(raw.terjual) || item.status === 'sold';

      return {
        id: item.id,
        name,
        description,
        category,
        rawPrice: safePrice,
        price:
          safePrice === 0 && offerType === 'barter'
            ? 'Barter'
            : `Rp ${safePrice.toLocaleString('id-ID')}`,
        fullLocation,
        location: shortLocation,
        img: item.foto || '/assets/seed-images/placeholder.svg',
        grade: kondisi.includes('A') ? 'A' : kondisi.includes('B') ? 'B' : kondisi.includes('C') ? 'C' : 'A',
        barter: offerType === 'barter' || offerType === 'keduanya',
        isSold,
        sold: (idx % 8) + 2,
      };
    });
  }, [db.items]);

  // Daftar lokasi unik dari katalog untuk filter lokasi
  const availableLocations = useMemo(() => {
    const unique = new Set<string>();
    normalizedItems.forEach(item => {
      if (item.location) unique.add(item.location);
    });
    return Array.from(unique);
  }, [normalizedItems]);

  // Filter berdasarkan kata kunci (nama, deskripsi, kategori, atau lokasi) + filter lokasi aktif
  const products = useMemo(() => {
    return normalizedItems.filter(item => {
      const matchesLocation =
        selectedLocation === 'all' ||
        item.location.toLowerCase() === selectedLocation.toLowerCase();

      if (!matchesLocation) return false;
      if (!trimmedQuery) return true;

      return (
        item.name.toLowerCase().includes(trimmedQuery) ||
        item.description.toLowerCase().includes(trimmedQuery) ||
        item.category.toLowerCase().includes(trimmedQuery) ||
        item.fullLocation.toLowerCase().includes(trimmedQuery)
      );
    });
  }, [normalizedItems, selectedLocation, trimmedQuery]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb Navigasi */}
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
        <span>Pencarian</span>
        {query && (
          <>
            <span>/</span>
            <span className="text-gray-900 font-bold truncate max-w-xs">"{query}"</span>
          </>
        )}
      </nav>

      {/* Header Hasil Pencarian & Filter Lokasi */}
      <div
        className="border-b pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1
            className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hasil Pencarian
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {products.length > 0 ? (
              <>
                Menampilkan <span className="font-bold text-gray-800">{products.length}</span> barang
                {query ? (
                  <>
                    {' '}untuk kata kunci <span className="font-bold text-gray-800">"{query}"</span>
                  </>
                ) : null}
                {selectedLocation !== 'all' ? (
                  <>
                    {' '}di area <span className="font-bold text-gray-800">{selectedLocation}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                Tidak ada hasil yang ditemukan
                {query ? (
                  <>
                    {' '}untuk <span className="font-bold text-gray-800">"{query}"</span>
                  </>
                ) : null}
                {selectedLocation !== 'all' ? (
                  <>
                    {' '}di area <span className="font-bold text-gray-800">{selectedLocation}</span>
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>

        {/* Filter Lokasi COD */}
        {availableLocations.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-500 mr-1">Lokasi:</span>
            <button
              type="button"
              onClick={() => setSelectedLocation('all')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
              style={
                selectedLocation === 'all'
                  ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }
                  : { background: 'var(--color-card)', color: '#4b5563', borderColor: 'var(--color-border)' }
              }
            >
              Semua
            </button>
            {availableLocations.map(loc => {
              const active = selectedLocation.toLowerCase() === loc.toLowerCase();
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setSelectedLocation(loc)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
                  style={
                    active
                      ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }
                      : { background: 'var(--color-card)', color: '#4b5563', borderColor: 'var(--color-border)' }
                  }
                >
                  {loc}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Hasil Pencarian */}
      {products.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center space-y-4 my-4"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-800">
              Barang tidak ditemukan
            </h3>
            <p className="text-xs text-gray-500">
              Tidak ada barang yang cocok dengan kriteria pencarian saat ini. Coba ubah filter lokasi, gunakan kata kunci yang lebih umum, atau jelajahi semua barang di beranda.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
            {selectedLocation !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedLocation('all')}
                className="px-4 py-2.5 rounded-xl font-bold text-xs border transition-all hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: 'var(--color-border)', color: '#374151' }}
              >
                Reset Filter Lokasi
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--color-accent)' }}
            >
              Lihat Semua Barang di Beranda
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map(product => (
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
                <p className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem] text-gray-900">
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