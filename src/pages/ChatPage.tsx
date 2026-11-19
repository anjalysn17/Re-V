import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import { addOrderTransaction } from './OrdersPage';

interface ChatPageProps {
  openConversationId?: string;
  onNavigate?: (page: string, params?: any) => void;
}

const QUICK_REPLIES = [
  'Halo, barang ini masih tersedia?',
  'Bisa barter dengan barang di profilku?',
  'Bisa COD di Gerbang Utama UNNES Sekaran?',
  'Boleh minta foto detail kondisinya?',
];

export default function ChatPage({ openConversationId, onNavigate }: ChatPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [selectedConvId, setSelectedConvId] = useState<string | null>(openConversationId || null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [, setRefresh] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  useEffect(() => {
    if (openConversationId) {
      setSelectedConvId(openConversationId);
    }
  }, [openConversationId]);

  const db = dbService.getDB() as any;
  const allConversations: any[] = db.conversations || [];
  const allUsers: any[] = db.users || [];
  const allItems: any[] = db.items || [];
  const globalMessages: any[] = db.messages || [];

  const uid = currentUser ? String(currentUser.id) : '';

  // Normalisasi filter daftar percakapan milik akun yang sedang login
  const myConversations = allConversations
    .filter((conv: any) => {
      if (!uid) return false;
      if (Array.isArray(conv.participants)) {
        return conv.participants.map(String).includes(uid);
      }
      return (
        String(conv.buyerId ?? conv.buyer_id ?? conv.senderId ?? '') === uid ||
        String(conv.sellerId ?? conv.seller_id ?? conv.receiverId ?? '') === uid
      );
    })
    .sort((a: any, b: any) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  // Otomatis pilih percakapan pertama di layar desktop jika belum ada yang dipilih
  useEffect(() => {
    if (!selectedConvId && myConversations.length > 0 && window.innerWidth >= 768) {
      setSelectedConvId(String(myConversations[0].id));
    }
  }, [myConversations.length]);

  const persistDB = (updatedDB: any) => {
    if (typeof (dbService as any).saveDB === 'function') {
      (dbService as any).saveDB(updatedDB);
    } else {
      localStorage.setItem('rev_db', JSON.stringify(updatedDB));
    }
    setRefresh((prev) => prev + 1);
  };

  // Helper mencari profil lawan bicara
  const resolvePartner = (conv: any) => {
    let partnerId = '';
    if (Array.isArray(conv.participants)) {
      partnerId = String(conv.participants.find((p: any) => String(p) !== uid) || '');
    } else {
      const bId = String(conv.buyerId ?? conv.buyer_id ?? conv.senderId ?? '');
      const sId = String(conv.sellerId ?? conv.seller_id ?? conv.receiverId ?? '');
      partnerId = bId === uid ? sId : bId;
    }

    const foundUser = allUsers.find((u: any) => String(u.id) === partnerId);
    const partnerName =
      foundUser?.nama ||
      foundUser?.name ||
      (String(conv.sellerId ?? conv.seller_id) === uid
        ? conv.buyerName || conv.senderName
        : conv.sellerName || conv.receiverName) ||
      'Mahasiswa UNNES';

    return {
      id: partnerId,
      name: partnerName,
      avatar: foundUser?.foto_profil || foundUser?.avatar || '',
      isVerified: Boolean(foundUser?.is_verified || foundUser?.email?.includes('unnes.ac.id')),
    };
  };

  // Helper mencari produk terkait dalam obrolan
  const resolveConversationItem = (conv: any) => {
    const targetItemId = conv.itemId ?? conv.productId ?? conv.id_item;
    if (!targetItemId) return null;
    return allItems.find((it: any) => String(it.id) === String(targetItemId)) || null;
  };

  // Helper menggabungkan pesan dari conv.messages maupun db.messages secara aman
  const getConversationMessages = (conv: any) => {
    const inlineMsgs: any[] = Array.isArray(conv.messages) ? conv.messages : [];
    const flatMsgs: any[] = globalMessages.filter(
      (m: any) => String(m.conversationId ?? m.id_conversation ?? m.chatId) === String(conv.id)
    );

    const mergedMap = new Map<string, any>();
    [...inlineMsgs, ...flatMsgs].forEach((m: any, idx: number) => {
      const key = String(m.id || `${m.createdAt || m.timestamp || idx}-${m.text || m.content}`);
      mergedMap.set(key, m);
    });

    return Array.from(mergedMap.values()).sort((a: any, b: any) => {
      const tA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const tB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return tA - tB;
    });
  };

  const activeConversation = myConversations.find(
    (c: any) => String(c.id) === String(selectedConvId)
  );
  const activeMessages = activeConversation ? getConversationMessages(activeConversation) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, selectedConvId]);

  // Proteksi belum login
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Pesan & Negosiasi</h2>
          <p className="text-xs text-gray-500 mb-6">
            Masuk ke akunmu untuk bernegosiasi barter maupun menentukan titik temu COD bersama penjual.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl text-xs font-bold text-white"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk Akun
          </button>
        </div>
      </div>
    );
  }

  const handleSendMessage = (customText?: string) => {
    const content = (customText ?? messageText).trim();
    if (!content || !activeConversation) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      senderName: currentUser.nama || currentUser.name || 'Saya',
      text: content,
      content,
      createdAt: new Date().toISOString(),
    };

    const updatedConversations = allConversations.map((conv: any) => {
      if (String(conv.id) !== String(activeConversation.id)) return conv;
      const existingMsgs = Array.isArray(conv.messages) ? conv.messages : [];
      return {
        ...conv,
        messages: [...existingMsgs, newMsg],
        lastMessage: content,
        updatedAt: newMsg.createdAt,
      };
    });

    const updatedGlobalMessages = Array.isArray(db.messages)
      ? [...db.messages, newMsg]
      : undefined;

    persistDB({
      ...db,
      conversations: updatedConversations,
      ...(updatedGlobalMessages ? { messages: updatedGlobalMessages } : {}),
    });

    if (!customText) setMessageText('');
  };

  // Menyepakati transaksi dari obrolan -> otomatis tercatat ke OrdersPage
  const handleConfirmDealFromChat = () => {
    if (!activeConversation) return;
    const partner = resolvePartner(activeConversation);
    const relatedItem = resolveConversationItem(activeConversation);
    const isBarter = Boolean(
      activeConversation.type === 'barter' ||
        activeConversation.barterOfferItem ||
        activeConversation.offeredItemTitle
    );

    const itemTitle =
      relatedItem?.title ||
      relatedItem?.nama_barang ||
      activeConversation.itemTitle ||
      'Barang Kesepakatan Chat';

    addOrderTransaction({
      userId: currentUser.id,
      sellerId: partner.id,
      sellerName: partner.name,
      itemTitle,
      itemImage: relatedItem?.image || relatedItem?.foto || activeConversation.itemImage,
      type: isBarter ? 'barter' : 'beli',
      price: Number(relatedItem?.price || relatedItem?.harga || activeConversation.price || 0),
      barterOfferTitle:
        activeConversation.offeredItemTitle ||
        activeConversation.barterOfferItem?.title ||
        'Barang Sesuai Kesepakatan Chat',
      codLocation: 'Sekitar Kampus UNNES Sekaran (Sesuai Chat)',
    });

    const updatedConversations = allConversations.map((conv: any) =>
      String(conv.id) === String(activeConversation.id)
        ? { ...conv, dealConfirmed: true }
        : conv
    );
    persistDB({ ...db, conversations: updatedConversations });

    handleSendMessage(
      `✅ Transaksi disepakati! Pesanan "${itemTitle}" sudah tercatat di menu Transaksi.`
    );
  };

  const filteredConversations = myConversations.filter((conv: any) => {
    if (!searchTerm.trim()) return true;
    const partner = resolvePartner(conv);
    const item = resolveConversationItem(conv);
    const q = searchTerm.toLowerCase();
    return (
      partner.name.toLowerCase().includes(q) ||
      String(item?.title || item?.nama_barang || conv.itemTitle || '')
        .toLowerCase()
        .includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[72vh]">
        {/* KOLOM KIRI: Daftar Percakapan */}
        <div
          className={`md:col-span-4 border-r border-gray-100 flex flex-col ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-gray-100 space-y-3">
            <h1 className="text-base font-bold text-gray-900">Obrolan ({myConversations.length})</h1>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama atau barang..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-gray-700 mb-1">Belum Ada Obrolan</p>
                <p className="text-xs text-gray-500 mb-4">
                  Mulai chat penjual atau ajukan barter dari halaman detail barang.
                </p>
                <button
                  onClick={() => go('home')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: 'var(--color-primary, #567257)' }}
                >
                  Jelajahi Barang
                </button>
              </div>
            ) : (
              filteredConversations.map((conv: any) => {
                const partner = resolvePartner(conv);
                const item = resolveConversationItem(conv);
                const msgs = getConversationMessages(conv);
                const lastMsg =
                  msgs[msgs.length - 1]?.text ||
                  msgs[msgs.length - 1]?.content ||
                  conv.lastMessage ||
                  'Mulai percakapan...';
                const isSelected = String(conv.id) === String(selectedConvId);

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(String(conv.id))}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors hover:bg-gray-50 ${
                      isSelected ? 'bg-emerald-50/60' : ''
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: 'var(--color-primary, #567257)' }}
                    >
                      {partner.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{partner.name}</p>
                        {conv.dealConfirmed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                            Deal ✓
                          </span>
                        )}
                      </div>
                      {(item || conv.itemTitle) && (
                        <p className="text-[11px] font-medium text-emerald-700 truncate">
                          📦 {item?.title || item?.nama_barang || conv.itemTitle}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-0.5">{lastMsg}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Ruang Percakapan Aktif */}
        <div
          className={`md:col-span-8 flex flex-col bg-gray-50/40 ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {!activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <p className="text-sm font-semibold text-gray-600">Pilih obrolan untuk mulai bernegosiasi</p>
              <p className="text-xs mt-1">
                Diskusikan kondisi barang, kesepakatan barter, dan lokasi COD aman di sekitar kampus.
              </p>
            </div>
          ) : (
            <>
              {/* Header Ruang Chat */}
              {(() => {
                const partner = resolvePartner(activeConversation);
                const relatedItem = resolveConversationItem(activeConversation);
                return (
                  <div className="bg-white border-b border-gray-100">
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => setSelectedConvId(null)}
                          className="md:hidden px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700"
                        >
                          ←
                        </button>
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ background: 'var(--color-primary, #567257)' }}
                        >
                          {partner.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-900 truncate">{partner.name}</p>
                            {partner.isVerified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                                UNNES
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">Negosiasi & Koordinasi COD</p>
                        </div>
                      </div>

                      {!activeConversation.dealConfirmed ? (
                        <button
                          onClick={handleConfirmDealFromChat}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shrink-0 shadow-sm hover:opacity-90"
                          style={{ background: 'var(--color-primary, #567257)' }}
                        >
                          Sepakati Deal
                        </button>
                      ) : (
                        <button
                          onClick={() => go('orders')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                        >
                          Lihat Transaksi ✓
                        </button>
                      )}
                    </div>

                    {/* Banner Barang yang Dibahas */}
                    {(relatedItem || activeConversation.itemTitle) && (
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              relatedItem?.image ||
                              relatedItem?.foto ||
                              activeConversation.itemImage ||
                              '/assets/seed-images/placeholder.svg'
                            }
                            alt="Produk"
                            className="w-9 h-9 rounded-lg object-cover bg-white border border-gray-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">
                              {relatedItem?.title ||
                                relatedItem?.nama_barang ||
                                activeConversation.itemTitle}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {Number(relatedItem?.price || relatedItem?.harga || 0) > 0
                                ? `Rp ${Number(relatedItem?.price || relatedItem?.harga).toLocaleString('id-ID')}`
                                : 'Mode Pertukaran / Barter'}
                            </p>
                          </div>
                        </div>
                        {relatedItem && (
                          <button
                            onClick={() => go('product', { productId: relatedItem.id })}
                            className="text-[11px] font-semibold text-emerald-700 hover:underline shrink-0"
                          >
                            Lihat Barang
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Daftar Gelembung Pesan */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2.5 max-h-[50vh] md:max-h-[54vh]">
                {activeMessages.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">
                    Belum ada pesan. Kirim sapaan atau pilih template pesan di bawah untuk memulai.
                  </p>
                ) : (
                  activeMessages.map((msg: any, index: number) => {
                    const sender = String(
                      msg.senderId ?? msg.sender_id ?? msg.id_user ?? msg.from ?? ''
                    );
                    const isMine = sender === uid;
                    const text = msg.text || msg.content || '';
                    const timeStr = msg.createdAt || msg.timestamp
                      ? new Date(msg.createdAt || msg.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? 'text-white rounded-br-sm'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                          }`}
                          style={isMine ? { background: 'var(--color-primary, #567257)' } : undefined}
                        >
                          <p className="whitespace-pre-wrap break-words">{text}</p>
                        </div>
                        {timeStr && (
                          <span className="text-[10px] text-gray-400 mt-0.5 px-1">{timeStr}</span>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Template Pesan Cepat (Quick Reply) */}
              <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto">
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(qr)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 whitespace-nowrap shrink-0 transition-colors"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input Kirim Pesan */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-gray-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Tulis pesan negosiasi atau titik COD..."
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-opacity shrink-0"
                  style={{ background: 'var(--color-primary, #567257)' }}
                >
                  Kirim
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}