import Footer from '../components/Footer';
import { getDB } from '../services/db';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
}

const categoryCards = [
  { icon: '/elektronik.jpg', label: 'Elektronik', count: '240+ barang', color: '#3a6ea5' },
  { icon: '/bukk.jpg', label: 'Buku & Alat Tulis', count: '580+ barang', color: '#7a5c3b' },
  { icon: '/bajuu.jpg', label: 'Fashion', count: '310+ barang', color: '#9b4b6a' },
  { icon: '/perlengkapan.jpg', label: 'Perlengkapan', count: '190+ barang', color: '#567257' },
  { icon: '/tas.jpg', label: 'Tas', count: '140+ barang', color: '#8b7355' },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  const allProducts = getDB().items.map((item, idx) => ({
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

  const barterProducts = allProducts.filter(p => p.barter);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-5 space-y-8">
      {/* Hero Banner Polos Minimalis */}
      <div 
        className="rounded-2xl relative px-8 py-10 md:px-12 md:py-12 flex flex-col justify-center items-start shadow-sm"
        style={{ background: 'linear-gradient(135deg, #3e5540 0%, var(--color-primary) 50%, #7a9b7b 100%)' }}
      >
        {/* Badge Kategori Atas */}
        <div className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-sm mb-3">
          Platform Jual, Beli & Barter
        </div>

        {/* Headline Pas 2 Baris */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-snug tracking-tight max-w-2xl">
          Bingung Mau Dikemanain? <br />
          Barter ke Teman Kampus Aja
        </h1>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => {
              if (allProducts.length > 0) {
                onNavigate('product', { productId: allProducts[0].id });
              } else {
                onNavigate('home');
              }
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-white hover:bg-gray-100 transition-all shadow-sm"
            style={{ color: 'var(--color-primary)' }}
          >
            Mulai Belanja
          </button>
          <button
            onClick={() => onNavigate('barter')}
            className="px-6 py-2.5 rounded-xl font-bold text-sm border-2 border-white text-white hover:bg-white/10 transition-all"
          >
            Barter Sekarang
          </button>
        </div>
      </div>

      {/* Categories - Ukuran Kompak & Rapi Sejajar Rata Kiri */}
      <div>
        <h2 className="text-lg font-black mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Kategori
        </h2>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {categoryCards.map(cat => (
            <button
              key={cat.label}
              onClick={() => onNavigate('category', cat.label)}
              className="group w-36 shrink-0 flex flex-col items-center justify-between py-3 px-2 rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-md border bg-white cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Kotak Gambar */}
              <div className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 group-hover:bg-gray-100/80 transition-colors p-1.5">
                <img
                  src={cat.icon}
                  alt={cat.label}
                  className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Teks Kategori */}
              <div className="text-center mt-2">
                <p className="text-xs font-bold text-gray-800 leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                  {cat.label}
                </p>
                <p className="text-[10px] mt-0.5 text-gray-400 font-medium">
                  {cat.count}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Flash promo strip */}
      <div className="rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
        style={{ background: 'linear-gradient(90deg, #c0392b, #e07b39)' }}>
        <div className="shrink-0">
          <p className="text-white font-black text-sm" style={{ fontFamily: 'var(--font-display)' }}>Flash Barter</p>
          <p className="text-white/80 text-xs">Berakhir dalam</p>
          <div className="flex gap-1 mt-1">
            {['02', '14', '38'].map((t, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-xs font-black text-white" style={{ background: 'rgba(0,0,0,0.3)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-1 flex gap-3 overflow-x-auto pb-1">
          {barterProducts.length === 0 ? (
            <div className="flex items-center px-4 py-2 text-white/80 text-xs italic">
              Belum ada barang barter yang tersedia saat ini
            </div>
          ) : (
            barterProducts.slice(0, 5).map((p) => (
              <button key={p.id}
                onClick={() => onNavigate('product', { productId: p.id })}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl hover:opacity-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-8 h-8 rounded-lg object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                  }}
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-white leading-tight max-w-[100px] truncate">{p.name}</p>
                  <p className="text-[10px] text-white/80">{p.price}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Product grid: Baru Diposting */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black" style={{ fontFamily: 'var(--font-display)' }}>Baru Diposting</h2>
          {allProducts.length > 0 && (
            <button className="text-sm font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              Lihat Semua →
            </button>
          )}
        </div>

        {allProducts.length === 0 ? (
          <div
            className="p-12 rounded-2xl border text-center space-y-4 my-2"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="w-14 h-14 rounded-full bg-[#567257]/10 text-[#567257] flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-800">
                Belum ada barang yang diposting
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Jadi yang pertama upload barang, yuk! Klik tombol <strong className="text-[var(--color-accent)]">"Tambah Barang"</strong> di atas untuk mulai menawarkan barangmu.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {allProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onNavigate('product', { productId: product.id })}
                className="rounded-2xl border overflow-hidden text-left group hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
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
                  <p className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</p>
                  <p
                    className="text-base font-black mt-1.5"
                    style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
                  >
                    {product.price}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0ebe2] text-[11px] text-gray-600">
                      <svg 
                        className="w-3 h-3 shrink-0 fill-current text-gray-500" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      <span>{product.location}</span>
                    </div>
                    <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{product.sold} terjual</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}