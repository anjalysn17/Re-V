import Footer from '../components/Footer';
import { getDB } from '../services/db';

interface SearchResultsPageProps {
  query: string;
  onNavigate: (page: string, params?: any) => void;
}

export default function SearchResultsPage({ query, onNavigate }: SearchResultsPageProps) {
  const db = getDB();
  const trimmedQuery = (query || '').trim().toLowerCase();

  // Filter barang yang nama ATAU deskripsi ATAU kategori-nya mengandung query (case-insensitive)
  const filteredItems = db.items.filter(item => {
    if (!trimmedQuery) return true;
    const matchName = item.nama && item.nama.toLowerCase().includes(trimmedQuery);
    const matchDesc = item.deskripsi && item.deskripsi.toLowerCase().includes(trimmedQuery);
    const matchCategory = item.kategori && item.kategori.toLowerCase().includes(trimmedQuery);
    return matchName || matchDesc || matchCategory;
  });

  const products = filteredItems.map((item, idx) => ({
    id: item.id,
    name: item.nama,
    price: `Rp ${item.harga.toLocaleString('id-ID')}`,
    location: item.lokasi.split(',')[0],
    img: item.foto,
    grade: item.kondisi.includes('A') ? 'A' : item.kondisi.includes('B') ? 'B' : item.kondisi.includes('C') ? 'C' : 'A',
    barter: item.status === 'barter' || item.status === 'keduanya',
    sold: (idx % 8) + 2,
    kategori: item.kategori || 'Lainnya',
  }));

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
        <span>/</span>
        <span className="text-gray-900 font-bold truncate max-w-xs">"{query}"</span>
      </nav>

      {/* Header Hasil Pencarian */}
      <div className="border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <h1
          className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Hasil Pencarian
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {products.length > 0 ? (
            <>
              Menampilkan <span className="font-bold text-gray-800">{products.length}</span> barang untuk kata kunci <span className="font-bold text-gray-800">"{query}"</span>
            </>
          ) : (
            <>
              Tidak ada hasil yang ditemukan untuk <span className="font-bold text-gray-800">"{query}"</span>
            </>
          )}
        </p>
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
              Tidak ada barang yang cocok dengan kata kunci "{query}". Coba gunakan kata kunci lain yang lebih umum, periksa ejaan, atau jelajahi kategori yang tersedia.
            </p>
          </div>
          <div className="pt-2">
            <button
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
              className="rounded-2xl border overflow-hidden text-left group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
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
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem] text-gray-900">
                  {product.name}
                </p>
                <p
                  className="text-base font-black mt-1.5"
                  style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
                >
                  {product.price}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0ebe2] text-[11px] text-gray-600">
                    <svg className="w-3 h-3 shrink-0 fill-current text-gray-500" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{product.location}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
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
