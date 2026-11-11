// Konfigurasi Base URL yang membaca variabel dari Vercel atau .env.development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Helper untuk menyertakan header standar dan token JWT
const getHeaders = () => {
  const token = localStorage.getItem('rev_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};  

// ==========================================
// 1. AUTH & USERS (Tabel: users)
// ==========================================
export const authService = {
  login: async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      return await res.json();
    } catch (error) {
      console.error('Error login:', error);
      throw error;
    }
  },
  register: async (userData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });
      return await res.json();
    } catch (error) {
      console.error('Error register:', error);
      throw error;
    }
  },
};

// ==========================================
// 2. BARANG & MARKETPLACE (Tabel: items)
// ==========================================
export const itemService = {
  getAllItems: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/items`);
      const data = await res.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  },

  getItemById: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${id}`);
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching item details:', error);
      return null;
    }
  },

  createItem: async (itemData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(itemData),
      });
      return await res.json();
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  },

  deleteItem: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return await res.json();
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },
};

// ==========================================
// 3. BARTER & PENAWARAN (Tabel: offers)
// ==========================================
export const barterService = {
  createOffer: async (offerData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/barter`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(offerData),
      });
      return await res.json();
    } catch (error) {
      console.error('Error creating barter offer:', error);
      throw error;
    }
  },

  getUserOffers: async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/barter/user/${userId}`);
      const data = await res.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching user offers:', error);
      return [];
    }
  },

  updateOfferStatus: async (offerId: string, status: 'diterima' | 'ditolak') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/barter/${offerId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      return await res.json();
    } catch (error) {
      console.error('Error updating offer status:', error);
      throw error;
    }
  },
};

// ==========================================
// 4. CHAT & PESAN (Tabel: conversations & messages)
// ==========================================
export const chatService = {
  getConversations: async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/conversations/${userId}`);
      const data = await res.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  },
  getMessages: async (conversationId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages/${conversationId}`);
      const data = await res.json();
      // KEMBALIKAN KE AWAL: Array pesan
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },
  sendMessage: async (messageData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(messageData),
      });
      const data = await res.json();

      // PERBAIKAN DI SINI: Tangkap conversationId dari data backend
      return data.success ? {
        ...messageData,
        id: data.data.id,
        waktu: data.data.waktu,
        conversationId: data.conversationId // <--- Ini yang tadinya hilang
      } : null;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  markAsRead: async (conversationId: string, userId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ userId }),
      });
      return await res.json();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },
};

// ==========================================
// 5. KERANJANG (CART) & COMPATIBILITY LAYER
// ==========================================
// Layer kompatibilitas opsional jika masih ada komponen yang memanggil getDB/saveDB secara lokal
export const getDB = () => {
  try {
    const local = localStorage.getItem('rev_fallback_db');
    if (local) return JSON.parse(local);
  } catch { }
  return { users: [], items: [], offers: [], conversations: [], messages: [], notifications: [], cart: [] };
};

export const saveDB = (dbData: any) => {
  try {
    localStorage.setItem('rev_fallback_db', JSON.stringify(dbData));
  } catch { }
};

export const generateId = (prefix: string, list: any[]) => {
  return `${prefix}-${Date.now().toString().slice(-5)}`;
};

export default {
  auth: authService,
  items: itemService,
  barter: barterService,
  chat: chatService,
};