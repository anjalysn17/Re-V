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
import AuthModal from './components/AuthModal';
import AddItemModal from './components/AddItemModal';

export interface NavigationParams {
  category?: string;
  productId?: string;
  conversationId?: string;
  searchQuery?: string;
  targetUserId?: string;
  targetItemId?: string;
  initialMessage?: string;
}

export type NavigateFunction = (
  p: string,
  params?: string | NavigationParams,
  extraParam?: string
) => void;

type Page =
  | 'home'
  | 'product'
  | 'barter'
  | 'chat'
  | 'admin'
  | 'my-items'
  | 'category'
  | 'search'
  | 'cart'
  | 'profile'
  | 'orders';

function MainLayout() {
  const { currentUser } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('Elektronik');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string | undefined>(undefined);
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string | undefined>(undefined);
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
      if (params.targetUserId) setSelectedTargetUserId(params.targetUserId);
      if (params.targetItemId) setSelectedTargetItemId(params.targetItemId);
    } else if (typeof params === 'string') {
      if (p === 'category') setSelectedCategory(params);
      if (p === 'product') setSelectedProductId(params);
      if (p === 'chat') setSelectedConversationId(params);
      if (p === 'search') setSearchQuery(params);
    }
    if (extraParam && p === 'chat') {
      setSelectedConversationId(extraParam);
    }
    setPage(p as Page);
  };

// useEffect(() => {
//   (window as any).revNavigate = navigate;
//}, []);

  // Hitung jumlah item keranjang dengan membaca localStorage milik user yang sedang login
  const cartCount = currentUser 
    ? (JSON.parse(localStorage.getItem(`rev_cart_${currentUser.id}`) || '[]')).length 
    : 0;

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      {/* Header Utama */}
      <Header
        activePage={page}
        onNavigate={navigate}
        onOpenAddItem={() => setIsAddItemOpen(true)}
        cartCount={cartCount}
      />

      {/* Konten Halaman */}
      <main className="pb-10">
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
            onOpenAddItem={() => setIsAddItemOpen(true)}
            onCartUpdated={handleCartUpdated}
          />
        )}
        {page === 'profile' && (
          currentUser 
            ? <ProfilePage onNavigate={navigate} /> 
            : <div className="text-center py-20 font-bold text-red-500">Akses Ditolak: Harap masuk (login) terlebih dahulu.</div>
        )}
        
        {page === 'orders' && (
          currentUser 
            ? <OrdersPage /> 
            : <div className="text-center py-20 font-bold text-red-500">Akses Ditolak: Harap masuk (login) terlebih dahulu.</div>
        )}
        {page === 'barter' && (
          <SmartBarter
            onNavigate={navigate}
            onOpenAddItem={() => setIsAddItemOpen(true)}
            onCartUpdated={handleCartUpdated}
          />
        )}
        {page === 'chat' && (
          <ChatPage
            key={`${refreshKey}-${selectedConversationId || 'default'}`}
            openConversationId={selectedConversationId}
            targetUserId={selectedTargetUserId} // Tambahan baru
            targetItemId={selectedTargetItemId} // Tambahan baru
            onNavigate={navigate}
          />
        )}
        {page === 'admin' && (
          currentUser?.role === 'admin' 
            ? <AdminDashboard onNavigate={navigate} /> 
            : <div className="text-center py-20 font-bold text-red-500">Akses Ditolak: Halaman ini khusus Administrator.</div>
        )}
        {page === 'my-items' && (
          <MyItemsPage
            key={refreshKey}
            onNavigate={navigate}
            onOpenAddItem={() => setIsAddItemOpen(true)}
          />
        )}
      </main>

      {/* Modal & Overlay */}
      <AuthModal onLoginSuccess={role => navigate(role === 'admin' ? 'admin' : 'home')} />
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onItemAdded={() => setRefreshKey(prev => prev + 1)}
      />
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