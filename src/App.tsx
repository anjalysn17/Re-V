import { useState, useEffect } from 'react';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ProductDetail from './pages/ProductDetail';
import SmartBarter from './pages/SmartBarter';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard';
import MyItemsPage from './pages/MyItemsPage';
import CategoryPage from './pages/CategoryPage';
import SearchResultsPage from './pages/SearchResultsPage';
import CartPage from './pages/CartPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getDB } from './services/db';
import AuthModal from './components/AuthModal';
import AddItemModal from './components/AddItemModal';
import ResetDemoButton from './components/ResetDemoButton';

export interface NavigationParams {
  category?: string;
  productId?: string;
  conversationId?: string;
  searchQuery?: string;
}

export type NavigateFunction = (
  p: string,
  params?: string | NavigationParams,
  extraParam?: string
) => void;

type Page = 'home' | 'product' | 'barter' | 'chat' | 'admin' | 'my-items' | 'category' | 'search' | 'cart' | 'profile' | 'orders';

// --- KOMPONEN NAVIGASI BAWAH (KHUSUS MOBILE) ---
function BottomNavigation({ 
  activePage, 
  onNavigate, 
  onOpenAddItem,
}: { 
  activePage: string; 
  onNavigate: NavigateFunction; 
  onOpenAddItem: () => void;
}) {
  const navItems = [
    { id: 'home', label: 'Beranda', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    )},
    { id: 'barter', label: 'Barter', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
    )},
    { id: 'add', label: 'Jual/Barter', isAction: true, icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
    )},
    { id: 'chat', label: 'Chat', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    )},
    { id: 'profile', label: 'Profil', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )},
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-end justify-between px-3 pb-3 pt-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = activePage === item.id;
        if (item.isAction) {
          return (
            <button
              key={item.id}
              onClick={onOpenAddItem}
              className="flex flex-col items-center justify-center -mt-6 z-10"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95" style={{ background: 'var(--color-accent)' }}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold mt-1.5 text-gray-700">{item.label}</span>
            </button>
          );
        }
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center w-14 transition-colors ${isActive ? 'text-[#567257]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className="relative">
              {item.icon}
            </div>
            <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MainLayout() {
  const { currentUser, openAuthModal } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('Elektronik');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCartUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const navigate: NavigateFunction = (p, params, extraParam) => {
    if (typeof params === 'object' && params !== null) {
      if (params.category) setSelectedCategory(params.category);
      if (params.productId) setSelectedProductId(params.productId);
      if (params.conversationId) setSelectedConversationId(params.conversationId);
      if (params.searchQuery !== undefined) setSearchQuery(params.searchQuery);
    } else if (typeof params === 'string') {
      if (p === 'category') setSelectedCategory(params);
      if (p === 'product') setSelectedProductId(params);
      if (p === 'chat') setSelectedConversationId(params);
      if (p === 'search') setSearchQuery(params);
    }
    if (extraParam && p === 'chat') {
      setSelectedConversationId(extraParam);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Otomatis scroll ke atas saat pindah halaman
    setPage(p as Page);
  };

  useEffect(() => {
    (window as any).revNavigate = navigate;
  }, []);

  const cartCount = currentUser
    ? (getDB().cart || []).filter(c => c.id_user === currentUser.id).length
    : 0;

  // Handler tersentralisasi untuk mengecek login sebelum buka modal tambah barang
  const handleOpenAddItem = () => {
    if (!currentUser) {
      openAuthModal('login');
    } else {
      setIsAddItemOpen(true);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col" style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      {/* Header Utama */}
      <Header
        activePage={page}
        onNavigate={navigate}
        onOpenAddItem={handleOpenAddItem}
        cartCount={cartCount}
      />

      {/* Konten Halaman dengan padding bawah ekstra (pb-24) khusus mobile agar tidak tertutup Bottom Nav */}
      <main className="flex-1 pb-24 md:pb-10">
        {page === 'home' && <HomePage key={refreshKey} onNavigate={navigate} />}
        {page === 'category' && (
          <CategoryPage
            key={`${refreshKey}-${selectedCategory}`}
            category={selectedCategory}
            onNavigate={navigate}
          />
        )}
        {page === 'search' && (
          <SearchResultsPage
            key={`${refreshKey}-${searchQuery}`}
            query={searchQuery}
            onNavigate={navigate}
          />
        )}
        {page === 'cart' && (
          <CartPage
            key={refreshKey}
            onNavigate={navigate}
            onCartUpdated={handleCartUpdated}
          />
        )}
        {page === 'product' && (
          <ProductDetail
            key={selectedProductId || 'default'}
            productId={selectedProductId}
            onNavigate={navigate}
            onOpenAddItem={handleOpenAddItem}
            onCartUpdated={handleCartUpdated}
          />
        )}
        {page === 'profile' && <ProfilePage />}
        {page === 'orders' && <OrdersPage />}
        {page === 'barter' && (
          <SmartBarter
            onNavigate={navigate}
            onOpenAddItem={handleOpenAddItem}
            onCartUpdated={handleCartUpdated}
          />
        )}
        {page === 'chat' && (
          <ChatPage
            key={`${refreshKey}-${selectedConversationId || 'default'}`}
            openConversationId={selectedConversationId}
            onNavigate={navigate}
          />
        )}
        {page === 'admin' && <AdminDashboard onNavigate={navigate} />}
        {page === 'my-items' && (
          <MyItemsPage
            key={refreshKey}
            onNavigate={navigate}
            onOpenAddItem={handleOpenAddItem}
          />
        )}
      </main>

      {/* Menampilkan Navigasi Bawah Khusus di Layar Mobile */}
      <BottomNavigation 
        activePage={page} 
        onNavigate={navigate} 
        onOpenAddItem={handleOpenAddItem}
      />

      {/* Modal Autentikasi */}
      <AuthModal onLoginSuccess={role => navigate(role === 'admin' ? 'admin' : 'home')} />

      {/* Modal Tambah Barang */}
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onItemAdded={() => setRefreshKey(prev => prev + 1)}
      />

      {/* Tombol Reset Data (Sembunyikan di Mobile agar tidak mengganggu UI jempol) */}
      <div className="hidden md:block">
        <ResetDemoButton />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}