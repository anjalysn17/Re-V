import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { itemService } from '../services/db';

interface CategoryPageProps {
  category: string;
  onNavigate: (page: string, params?: any) => void;
}

export default function CategoryPage({ category, onNavigate }: CategoryPageProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        // MINTA DATA LANGSUNG SESUAI KATEGORI KE SERVER
        const data = await itemService.getAllItems({ kategori: category, limit: 50 });
        setItems(data || []);
      } catch (error) {
        console.error("Gagal mengambil data kategori:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [category]); // Tambahkan dependency category

  // Array map langsung dari state items, tidak perlu .filter() manual lagi
  const products = items.map((item, idx) => ({
    id: item.id,
    name: item.nama_barang || item.nama,
    price: `Rp ${Number(item.harga).toLocaleString('id-ID')}`,
    location: (item.lokasi || 'Kampus UNNES').split(',')[0],
    img: item.foto,
    grade: item.kondisi.match(/Grade ([A-C])/) ? item.kondisi.match(/Grade ([A-C])/)[1] : 'A',
    barter: item.status === 'barter' || item.status === 'keduanya',
    sold: (idx % 8) + 2,
    kategori: item.kategori,
  }));

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* ... (Breadcrumb & Header HTML persis sama seperti kodemu) ... */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <button onClick={() => onNavigate('home')} className="hover:text-gray-900 transition-colors flex items-center gap-1 font-medium cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Beranda</span>
        </button>
        <span>/</span><span>Kategori</span><span>/</span>
        <span className="text-gray-900 font-bold">{category}</span>
      </nav>

      <div className="border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {category}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {isLoading ? <span>Memuat data kategori...</span> : <>Menampilkan {products.length} barang dalam kategori {category}</>}
        </p>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-gray-500 text-sm">Sedang memuat data dari server...</div>
      ) : products.length === 0 ? (
        <div className="p-12 rounded-2xl border text-center space-y-4 my-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-base font-bold text-gray-800">Belum ada barang di kategori {category}</h3>
          <button onClick={() => onNavigate('home')} className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold border hover:bg-black/5 transition-colors cursor-pointer">Kembali ke Beranda</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* ... (Render list barang persis sama seperti kodemu) ... */}
          {products.map((product) => (
             <button
               key={product.id}
               onClick={() => onNavigate('product', { productId: product.id })}
               className="rounded-2xl border overflow-hidden text-left group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
               style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
             >
               <div className="relative aspect-square overflow-hidden bg-gray-100">
                 <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg'; }} />
               </div>
               <div className="p-3">
                 <p className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem] text-gray-900">{product.name}</p>
                 <p className="text-base font-black mt-1.5" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>{product.price}</p>
               </div>
             </button>
           ))}
        </div>
      )}
      <Footer />
    </div>
  );
}