import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { itemService, barterService } from '../services/db';
import Footer from '../components/Footer';
import { createOfferAndConversation } from '../utils/barterActions';

interface CartPageProps {
  onNavigate: (page: string, params?: any) => void;
  onCartUpdated?: () => void;
}

export default function CartPage({ onNavigate, onCartUpdated }: CartPageProps) {
  const { currentUser, openAuthModal } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [barterTargetItem, setBarterTargetItem] = useState<any | null>(null);
  const [selectedMyItemId, setSelectedMyItemId] = useState<string>('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // 1. SEMUA HOOKS DI ATAS SEBELUM KONDISI LOGIN
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const allItems = await itemService.getAllItems();
        setItems(allItems || []);
        if (currentUser) {
          const storedCart = localStorage.getItem(`rev_cart_${currentUser.id}`);
          const userCart = storedCart ? JSON.parse(storedCart) : [];
          setCartItems(userCart);
        }
      } catch (error) {
        console.error("Gagal memuat data keranjang:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  // 2. KONDISI LOGIN DILAKUKAN SETELAH SEMUA HOOKS SELESAI
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

  const cartEntries = cartItems.map(c => {
    const item = items.find(i => i.id === c.id_item);
    return {
      cartId: c.id,
      addedAt: c.ditambahkan_pada || 'Baru saja',
      item: item || null,
      itemId: c.id_item,
    };
  });

  const handleRemoveFromCart = (cartId: string) => {
    const updatedCart = cartItems.filter((c: any) => c.id !== cartId);
    setCartItems(updatedCart);
    localStorage.setItem(`rev_cart_${currentUser.id}`, JSON.stringify(updatedCart));
    if (onCartUpdated) onCartUpdated();
  };

  const myItems = items.filter(
    i => i.id_pemilik === currentUser.id && (i.status === 'barter' || i.status === 'keduanya')
  );

  const handleSendBarterOffer = async () => {
    if (!barterTargetItem || !selectedMyItemId) return;
    const myItem = myItems.find(i => i.id === selectedMyItemId);
    if (!myItem) return;

    setIsSubmittingOffer(true);
    try {
      const result = await createOfferAndConversation({
        myItem: myItem,
        targetItem: barterTargetItem,
        currentUser: currentUser
      });

      if (result.success) {
        setBarterTargetItem(null);
        setSelectedMyItemId('');
        setToastMsg('🎉 Tawaran barter berhasil dikirim!');
        setTimeout(() => setToastMsg(''), 3000);
        if (onCartUpdated) onCartUpdated();
        // Pastikan mengirim ID lawan!
        onNavigate('chat', { conversationId: result.convId, targetUserId: barterTargetItem.id_pemilik, targetItemId: barterTargetItem.id });
      } else {
        setToastMsg(result.message || 'Gagal mengirim tawaran.');
        setTimeout(() => setToastMsg(''), 3000);
      }
    } catch (error) {
      console.error(error);
      setToastMsg('Terjadi kesalahan jaringan.');
      setTimeout(() => setToastMsg(''), 3000);
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {toastMsg && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-xl flex items-center gap-2"
          style={{ background: 'var(--color-success, #4a8c5c)' }}
        >
          <span>{toastMsg}</span>
        </div>
      )}
      <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Keranjang Barang
          </h1>
          <p className="text-xs text-gray-500 mt-1">Daftar barang yang kamu simpan untuk ditinjau ({cartEntries.length} barang)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-gray-500 text-sm">Memuat keranjang...</div>
      ) : cartEntries.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center space-y-4 my-6"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-base font-bold text-gray-800">Keranjang Kamu Masih Kosong</h3>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm cursor-pointer"
            style={{ background: 'var(--color-accent)' }}
          >
            Mulai Eksplorasi Barang
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cartEntries.map(({ cartId, addedAt, item }) => {
            if (!item) return null;
            const itemName = item.nama_barang || item.nama;
            const canBarter = item.status === 'barter' || item.status === 'keduanya';
            return (
              <div
                key={cartId}
                className="p-4 md:p-5 rounded-2xl border flex items-center justify-between gap-4 bg-white shadow-xs"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={item.foto}
                    alt={itemName}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 border"
                    onError={e => { (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg'; }}
                  />
                  <div className="min-w-0 space-y-1">
                    <h3 onClick={() => onNavigate('product', { productId: item.id })} className="text-sm font-bold text-gray-900 truncate hover:underline cursor-pointer">
                      {itemName}
                    </h3>
                    <p className="text-sm font-black text-[var(--color-accent)]">
                      Rp {Number(item.harga).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-gray-400">{item.lokasi || 'Sekaran, Gunungpati'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canBarter && (
                    <button
                      onClick={() => {
                        setBarterTargetItem(item);
                        setSelectedMyItemId(myItems.length > 0 ? myItems[0].id : '');
                      }}
                      className="px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-xs cursor-pointer"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      Ajukan Barter
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveFromCart(cartId)}
                    className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Footer />
    </div>
  );
}