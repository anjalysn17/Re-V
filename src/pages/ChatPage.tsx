import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB, generateId } from '../services/db';
import { Message, User, Item } from '../types/database';
import { APP_NAME } from '../constants/brand';

interface ChatPageProps {
  openConversationId?: string;
  onNavigate?: (page: string, param?: string) => void;
}

interface ConversationItem {
  id: string;
  otherUser: User;
  relatedItem: Item | null;
  lastMessage: Message | null;
  lastMsgText: string;
  lastTime: string;
  unreadCount: number;
}

export default function ChatPage({ openConversationId, onNavigate }: ChatPageProps) {
  const { currentUser, openAuthModal } = useAuth();
  const [db, setDb] = useState(() => getDB());
  const [activeConvId, setActiveConvId] = useState<string | null>(openConversationId || null);
  const [input, setInput] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Jika currentUser belum login, tampilkan kartu "Perlu Masuk Akun"
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
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Perlu Masuk Akun
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Silakan masuk untuk melihat obrolan dan mengirim pesan seputar barter dan jual beli.
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

  // Siapkan daftar percakapan milik currentUser dari database
  const conversationsList: ConversationItem[] = useMemo(() => {
    const rawConversations = (db.conversations || []).filter(
      c => c.id_user_a === currentUser.id || c.id_user_b === currentUser.id
    );

    const items: ConversationItem[] = rawConversations.map(c => {
      const otherUserId = c.id_user_a === currentUser.id ? c.id_user_b : c.id_user_a;
      const otherUser = db.users.find(u => u.id === otherUserId) || {
        id: otherUserId,
        nama: `Pengguna ${APP_NAME}`,
        email: '',
        password: '',
        foto_profil: '/assets/seed-images/avatar-placeholder.svg',
        rating: 4.8,
        lokasi: 'Semarang',
        role: 'user' as const,
      };

      const relatedItem = db.items.find(i => i.id === c.id_item_terkait) || null;

      // Ambil pesan-pesan dalam percakapan ini
      const convMsgs = (db.messages || []).filter(m => m.id_conversation === c.id);
      const lastMessage = convMsgs.length > 0 ? convMsgs[convMsgs.length - 1] : null;

      let lastMsgText = 'Mulai obrolan baru';
      if (lastMessage) {
        if (lastMessage.type === 'offer') {
          lastMsgText = '📋 [Tawaran Barter Resmi]';
        } else {
          lastMsgText = lastMessage.teks;
        }
      }

      const lastTime = lastMessage ? lastMessage.waktu : '';
      const unreadCount = convMsgs.filter(m => m.id_pengirim !== currentUser.id && !m.status_baca).length;

      return {
        id: c.id,
        otherUser,
        relatedItem,
        lastMessage,
        lastMsgText,
        lastTime,
        unreadCount,
      };
    });

    // Urutkan percakapan dari yang paling baru aktivitasnya
    items.sort((a, b) => {
      const aVal = a.lastMessage?.id || a.id;
      const bVal = b.lastMessage?.id || b.id;
      return bVal.localeCompare(aVal);
    });

    return items;
  }, [db, currentUser]);

  // Set percakapan aktif jika openConversationId diberikan atau default ke percakapan pertama
  useEffect(() => {
    if (openConversationId && conversationsList.some(c => c.id === openConversationId)) {
      setActiveConvId(openConversationId);
    } else if (!activeConvId && conversationsList.length > 0) {
      setActiveConvId(conversationsList[0].id);
    } else if (activeConvId && !conversationsList.some(c => c.id === activeConvId) && conversationsList.length > 0) {
      setActiveConvId(conversationsList[0].id);
    }
  }, [openConversationId, conversationsList, activeConvId]);

  // Fungsi menandai semua pesan masuk pada percakapan tertentu sebagai sudah dibaca
  const markAsRead = (convId: string) => {
    const currentDB = getDB();
    let hasUnread = false;
    currentDB.messages = (currentDB.messages || []).map(m => {
      if (m.id_conversation === convId && m.id_pengirim !== currentUser.id && !m.status_baca) {
        hasUnread = true;
        return { ...m, status_baca: true };
      }
      return m;
    });

    if (hasUnread) {
      saveDB(currentDB);
      setDb(currentDB);
    }
  };

  // Tandai pesan sudah dibaca setiap kali percakapan aktif berubah
  useEffect(() => {
    if (activeConvId) {
      markAsRead(activeConvId);
    }
  }, [activeConvId]);

  // Percakapan aktif saat ini
  const activeConversation = conversationsList.find(c => c.id === activeConvId) || null;

  // Pesan-pesan dalam percakapan aktif, diurutkan ascending
  const activeMessages: Message[] = useMemo(() => {
    if (!activeConvId) return [];
    return (db.messages || []).filter(m => m.id_conversation === activeConvId);
  }, [db.messages, activeConvId]);

  // Scroll otomatis ke pesan terbawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Handler memilih percakapan dari panel kiri
  const handleSelectConversation = (convId: string) => {
    setActiveConvId(convId);
    markAsRead(convId);
  };

  // Handler kirim pesan baru
  const sendMessage = (text: string, type: 'text' | 'offer' | 'system' = 'text') => {
    if (!text.trim() || !activeConvId) return;

    const currentDB = getDB();
    if (!Array.isArray(currentDB.messages)) currentDB.messages = [];

    const newMsgId = generateId('MSG', currentDB.messages);
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newMsg: Message = {
      id: newMsgId,
      id_conversation: activeConvId,
      id_pengirim: currentUser.id,
      teks: text.trim(),
      waktu: timeStr,
      status_baca: false,
      type,
    };

    currentDB.messages.push(newMsg);
    saveDB(currentDB);
    setDb(currentDB);
    setInput('');
  };

  // Empty state jika pengguna belum memiliki percakapan sama sekali
  if (conversationsList.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        <div 
          className="rounded-2xl border p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="w-16 h-16 rounded-full bg-[#567257]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
              Belum Ada Obrolan
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Belum ada percakapan aktif. Mulai barter dari fitur Smart Barter atau hubungi pengguna lain untuk memulai obrolan.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('barter')}
              className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
              style={{ background: 'var(--color-primary)' }}
            >
              Mulai di Smart Barter →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-4 h-[calc(100vh-130px)] flex gap-4">
      {/* LEFT: Conversation list */}
      <div 
        className="w-72 shrink-0 rounded-2xl border overflow-hidden flex flex-col"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-bold text-base text-gray-900">Massage</h2>
          <span className="text-[11px] font-semibold text-gray-500">
            {conversationsList.length} obrolan
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsList.map(c => {
            const isSelected = activeConvId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className="w-full flex items-center gap-3 p-3.5 text-left border-b transition-all hover:bg-black/5 cursor-pointer"
                style={{
                  borderColor: 'var(--color-border)',
                  background: isSelected ? '#56725710' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                }}
              >
                <div className="shrink-0">
                  <img
                    src={c.otherUser.foto_profil}
                    alt={c.otherUser.nama}
                    className="w-10 h-10 rounded-full object-cover border"
                    style={{ borderColor: 'var(--color-border)' }}
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/assets/seed-images/avatar-placeholder.svg';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate text-gray-900">{c.otherUser.nama}</span>
                    <span className="text-[10px] shrink-0 ml-1" style={{ color: 'var(--color-muted)' }}>
                      {c.lastTime}
                    </span>
                  </div>
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-muted)' }}>
                    {c.lastMsgText}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <div 
                    className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-xs"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    {c.unreadCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Chat window */}
      <div 
        className="flex-1 rounded-2xl border overflow-hidden flex flex-col"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              {/* User header */}
              <div 
                className="px-4 py-3 flex items-center gap-3"
                style={{ background: 'var(--color-primary)' }}
              >
                <div className="shrink-0">
                  <img
                    src={activeConversation.otherUser.foto_profil}
                    alt={activeConversation.otherUser.nama}
                    className="w-9 h-9 rounded-full object-cover border border-white/20"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/assets/seed-images/avatar-placeholder.svg';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">
                      {activeConversation.otherUser.nama}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-white/90">
                      <svg className="w-3 h-3 text-amber-300 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>{activeConversation.otherUser.rating}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/75 truncate mt-0.5">
                    {activeConversation.otherUser.lokasi}
                  </p>
                </div>
              </div>

              {/* Sticky product summary */}
              {activeConversation.relatedItem && (
                <div 
                  className="px-4 py-2.5 flex items-center gap-3"
                  style={{ background: '#f8f4ee', borderTop: '1px solid var(--color-border)' }}
                >
                  <img 
                    src={activeConversation.relatedItem.foto} 
                    alt={activeConversation.relatedItem.nama}
                    className="w-10 h-10 rounded-lg object-cover border"
                    style={{ borderColor: 'var(--color-border)' }}
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-gray-900">
                      {activeConversation.relatedItem.nama}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                        Rp {activeConversation.relatedItem.harga.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate">
                        · {activeConversation.relatedItem.kondisi}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span 
                      className="px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{
                        background: activeConversation.relatedItem.status === 'barter' ? '#56725715' : '#e07b3915',
                        color: activeConversation.relatedItem.status === 'barter' ? 'var(--color-primary)' : 'var(--color-accent)',
                      }}
                    >
                      {activeConversation.relatedItem.status === 'barter' ? 'Barter' : activeConversation.relatedItem.status === 'keduanya' ? 'Jual & Barter' : 'Beli Langsung'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{ background: '#faf7f2' }}
            >
              {activeMessages.map(msg => {
                const isMe = msg.id_pengirim === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {msg.type === 'offer' ? (
                      /* Bubble penawaran barter resmi */
                      <div 
                        className="max-w-[75%] rounded-2xl p-3.5 shadow-sm border"
                        style={{
                          background: 'var(--color-card)',
                          color: 'var(--color-text)',
                          borderColor: 'var(--color-border)',
                          borderBottomLeftRadius: isMe ? undefined : 4,
                          borderBottomRightRadius: isMe ? 4 : undefined,
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <p className="text-xs font-bold text-[#567257]">
                            Tawaran Barter Resmi
                          </p>
                        </div>
                        <div className="text-xs space-y-1.5">
                          {msg.teks.split('\n').filter(l => l && !l.includes('Tawaran Barter')).map((line, i) => (
                            <p key={i} style={{ color: line.toLowerCase().includes('selisih') ? 'var(--color-accent)' : undefined, fontWeight: line.includes(':') ? 600 : 400 }}>
                              {line}
                            </p>
                          ))}
                          {!isMe && (
                            <div className="flex gap-2 mt-3 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                              <button 
                                type="button"
                                onClick={() => sendMessage('Saya setuju dengan tawaran barter ini! Mari atur jadwal ketemuan/COD.')}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-xs" 
                                style={{ background: 'var(--color-primary)' }}
                              >
                                ✓ Terima Tawaran
                              </button>
                              <button 
                                type="button"
                                onClick={() => sendMessage('Bisa kita negosiasikan kembali untuk selisih harganya?')}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold border hover:bg-black/5 transition-colors cursor-pointer" 
                                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                              >
                                Negosiasi
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] block text-right mt-1.5" style={{ color: 'var(--color-muted)' }}>
                          {msg.waktu} {isMe && '✓✓'}
                        </span>
                      </div>
                    ) : msg.type === 'system' ? (
                      <div 
                        className="max-w-[75%] rounded-2xl p-3 shadow-sm border"
                        style={{ background: '#e8f4ea', borderColor: '#c3e6cb', color: 'var(--color-text)', borderBottomLeftRadius: 4 }}
                      >
                        <pre className="text-xs whitespace-pre-wrap font-sans">{msg.teks}</pre>
                        <span className="text-[10px] block text-right mt-1" style={{ color: 'var(--color-muted)' }}>
                          {msg.waktu}
                        </span>
                      </div>
                    ) : (
                      <div 
                        className="max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm"
                        style={{
                          background: isMe ? 'var(--color-primary)' : 'var(--color-card)',
                          color: isMe ? 'white' : 'var(--color-text)',
                          borderBottomRightRadius: isMe ? 4 : undefined,
                          borderBottomLeftRadius: isMe ? undefined : 4,
                          border: isMe ? 'none' : '1px solid var(--color-border)',
                        }}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.teks}</p>
                        <span 
                          className={`text-[10px] block text-right mt-0.5 ${isMe ? 'text-white/70' : ''}`}
                          style={!isMe ? { color: 'var(--color-muted)' } : {}}
                        >
                          {msg.waktu} {isMe && '✓✓'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div 
              className="border-t p-3 space-y-2.5" 
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all hover:opacity-85 cursor-pointer shadow-xs"
                  style={{ background: '#4a8c5c' }}
                >
                  Transaksi Selesai & Beri Ulasan
                </button>
              </div>

              {/* Text input */}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                      }
                    }}
                    placeholder="Ketik pesan atau negosiasi..."
                    rows={1}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none transition-all focus:border-[var(--color-primary)]"
                    style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)', maxHeight: 120 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-gray-500 text-xs">
            Pilih obrolan dari panel di sebelah kiri untuk melihat pesan.
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewOpen && activeConversation && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={e => e.target === e.currentTarget && setReviewOpen(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="px-6 py-4" style={{ background: '#4a8c5c' }}>
              <h3 className="text-lg font-bold text-white">Transaksi Selesai & Beri Ulasan</h3>
            </div>
            <div className="p-5 space-y-4">
              {activeConversation.relatedItem && (
                <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: '#f8f4ee', borderColor: 'var(--color-border)' }}>
                  <img
                    src={activeConversation.relatedItem.foto}
                    alt={activeConversation.relatedItem.nama}
                    className="w-12 h-12 rounded-lg object-cover border"
                    style={{ borderColor: 'var(--color-border)' }}
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate text-gray-900">{activeConversation.relatedItem.nama}</p>
                    <p className="text-xs mt-0.5 text-gray-500">
                      Transaksi dengan {activeConversation.otherUser.nama}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold mb-2.5" style={{ color: 'var(--color-text)' }}>
                  Rating untuk {activeConversation.otherUser.nama}:
                </p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setRating(s)} className="cursor-pointer hover:scale-110 transition-transform">
                      <svg className="w-9 h-9 transition-all" fill={s <= rating ? '#f59e0b' : '#e5e7eb'} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Ceritakan pengalamanmu bertransaksi dengan pengguna ini..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none transition-all focus:border-[var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              />
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border font-bold text-xs cursor-pointer hover:bg-black/5 transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                >
                  Nanti Saja
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    sendMessage(`⭐ Transaksi Selesai & Diberi Ulasan (${rating}/5 bintang)${reviewText.trim() ? ': "' + reviewText.trim() + '"' : ''}`, 'system');
                    setReviewOpen(false);
                    setReviewText('');
                  }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
                  style={{ background: '#4a8c5c' }}
                >
                  Kirim Ulasan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}