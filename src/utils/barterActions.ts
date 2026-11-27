import { getDB, saveDB, generateId, parseSafePrice, pushNotification } from '../services/db';
import { Item, User, Offer, Conversation, Message } from '../types/database';

interface CreateOfferParams {
  myItem: Item;
  targetItem: Item;
  currentUser: User;
  codLocation?: string;
}

interface CreateOfferResult {
  convId: string;
  offerId: string;
}

/**
 * Membuat tawaran barter resmi, membuat/memperbarui percakapan,
 * mengirim pesan dengan metadata selisih harga otomatis (barterOffer), serta notifikasi.
 */
export function createOfferAndConversation({
  myItem,
  targetItem,
  currentUser,
  codLocation,
}: CreateOfferParams): CreateOfferResult {
  const currentDB = getDB();
  if (!Array.isArray(currentDB.offers)) currentDB.offers = [];
  if (!Array.isArray(currentDB.conversations)) currentDB.conversations = [];
  if (!Array.isArray(currentDB.messages)) currentDB.messages = [];
  if (!Array.isArray(currentDB.notifications)) currentDB.notifications = [];

  const offeredPrice = parseSafePrice(myItem.harga ?? myItem.price ?? 0);
  const targetPrice = parseSafePrice(targetItem.harga ?? targetItem.price ?? 0);
  // Positif = pengaju barter menambah tunai, Negatif = pemilik barang target menambah tunai
  const signedDiff = targetPrice - offeredPrice;

  // 1. Buat record Offer baru
  const newOfferId = generateId('OFR');
  const newOffer: Offer = {
    id: newOfferId,
    item_ditawarkan: myItem.id,
    item_diminta: targetItem.id,
    status: 'pending',
    id_pengirim: currentUser.id,
    id_penerima: targetItem.id_pemilik,
    selisih_harga: signedDiff,
    ...(codLocation ? { lokasi_cod: codLocation } : {}),
  };
  currentDB.offers.unshift(newOffer);

  // 2. Cari atau buat Conversation untuk pasangan user ini
  let conv = currentDB.conversations.find(
    (c) =>
      (String(c.id_user_a) === String(currentUser.id) &&
        String(c.id_user_b) === String(targetItem.id_pemilik)) ||
      (String(c.id_user_a) === String(targetItem.id_pemilik) &&
        String(c.id_user_b) === String(currentUser.id))
  );

  const nowIso = new Date().toISOString();
  const offeredName = myItem.nama || myItem.title || myItem.nama_barang || 'Barang Penawaran';
  const targetName = targetItem.nama || targetItem.title || targetItem.nama_barang || 'Barang Target';

  const diffSummary =
    signedDiff > 0
      ? `Estimasi selisih: +Rp ${signedDiff.toLocaleString('id-ID')} (pengaju menambah)`
      : signedDiff < 0
      ? `Estimasi selisih: -Rp ${Math.abs(signedDiff).toLocaleString('id-ID')} (barang penawar lebih mahal)`
      : 'Estimasi selisih: Rp 0 (nilai seimbang)';

  const offerMsgText = `Pengajuan Barter: "${offeredName}" (Rp ${offeredPrice.toLocaleString(
    'id-ID'
  )}) ⇄ "${targetName}" (Rp ${targetPrice.toLocaleString('id-ID')}). ${diffSummary}.`;

  if (!conv) {
    const newConvId = generateId('CONV');
    conv = {
      id: newConvId,
      id_user_a: currentUser.id,
      id_user_b: targetItem.id_pemilik,
      id_item_terkait: targetItem.id,
    };
    (conv as any).participants = [String(currentUser.id), String(targetItem.id_pemilik)];
    (conv as any).itemId = targetItem.id;
    (conv as any).itemTitle = targetName;
    (conv as any).itemImage = targetItem.foto;
    (conv as any).itemPrice = targetPrice;
    (conv as any).pesan_terakhir = offerMsgText;
    (conv as any).lastMessage = offerMsgText;
    (conv as any).updatedAt = nowIso;
    currentDB.conversations.unshift(conv);
  } else {
    conv.id_item_terkait = targetItem.id;
    (conv as any).itemId = targetItem.id;
    (conv as any).itemTitle = targetName;
    (conv as any).itemImage = targetItem.foto;
    (conv as any).itemPrice = targetPrice;
    (conv as any).pesan_terakhir = offerMsgText;
    (conv as any).lastMessage = offerMsgText;
    (conv as any).updatedAt = nowIso;
  }

  // 3. Tambahkan Message dengan metadata barterOffer agar kartu selisih otomatis tampil di ChatPage
  const newMsgId = generateId('MSG');
  const newMsg: Message & Record<string, any> = {
    id: newMsgId,
    id_conversation: conv.id,
    conversationId: conv.id,
    id_pengirim: currentUser.id,
    senderId: currentUser.id,
    senderName: currentUser.nama,
    teks: offerMsgText,
    text: offerMsgText,
    waktu: nowIso,
    createdAt: nowIso,
    status_baca: false,
    type: 'offer',
    barterOffer: {
      offerId: newOfferId,
      offeredItemId: String(myItem.id),
      offeredItemTitle: offeredName,
      offeredItemPrice: offeredPrice,
      offeredItemImage: myItem.foto,
      targetItemId: String(targetItem.id),
      targetItemTitle: targetName,
      targetItemPrice: targetPrice,
      priceDifference: signedDiff,
      codLocation: codLocation || targetItem.lokasi || 'Gerbang Utama UNNES (Sekaran)',
    },
  };
  currentDB.messages.push(newMsg as Message);

  // 4. Simpan ke cache lokal & sinkronkan ke server terlebih dahulu
  saveDB(currentDB);

  // 5. Kirim notifikasi terstruktur untuk penerima
  pushNotification({
    userId: targetItem.id_pemilik,
    tipe: 'barter',
    teks: `Tawaran barter baru dari ${currentUser.nama} untuk ${targetName}`,
    link_page: 'chat',
    target_id: conv.id,
  });

  return {
    convId: conv.id,
    offerId: newOffer.id,
  };
}

interface OpenConversationParams {
  targetItem: Item;
  currentUser: User;
  initialMessage?: string;
}

/**
 * Mencari atau membuat percakapan dengan pemilik barang terkait item ini.
 */
export function getOrCreateConversation({
  targetItem,
  currentUser,
  initialMessage,
}: OpenConversationParams): { convId: string } {
  const currentDB = getDB();
  if (!Array.isArray(currentDB.conversations)) currentDB.conversations = [];
  if (!Array.isArray(currentDB.messages)) currentDB.messages = [];
  if (!Array.isArray(currentDB.notifications)) currentDB.notifications = [];

  let conv = currentDB.conversations.find(
    (c) =>
      (String(c.id_user_a) === String(currentUser.id) &&
        String(c.id_user_b) === String(targetItem.id_pemilik)) ||
      (String(c.id_user_a) === String(targetItem.id_pemilik) &&
        String(c.id_user_b) === String(currentUser.id))
  );

  let updated = false;
  const nowIso = new Date().toISOString();
  const targetName = targetItem.nama || targetItem.title || targetItem.nama_barang || 'Barang';

  if (!conv) {
    const newConvId = generateId('CONV');
    conv = {
      id: newConvId,
      id_user_a: currentUser.id,
      id_user_b: targetItem.id_pemilik,
      id_item_terkait: targetItem.id,
    };
    (conv as any).participants = [String(currentUser.id), String(targetItem.id_pemilik)];
    (conv as any).itemId = targetItem.id;
    (conv as any).itemTitle = targetName;
    (conv as any).itemImage = targetItem.foto;
    (conv as any).updatedAt = nowIso;
    currentDB.conversations.unshift(conv);
    updated = true;
  } else if (conv.id_item_terkait !== targetItem.id) {
    conv.id_item_terkait = targetItem.id;
    (conv as any).itemId = targetItem.id;
    (conv as any).itemTitle = targetName;
    (conv as any).itemImage = targetItem.foto;
    (conv as any).updatedAt = nowIso;
    updated = true;
  }

  if (initialMessage && initialMessage.trim()) {
    const cleanText = initialMessage.trim();
    const newMsgId = generateId('MSG');

    const newMsg: Message & Record<string, any> = {
      id: newMsgId,
      id_conversation: conv.id,
      conversationId: conv.id,
      id_pengirim: currentUser.id,
      senderId: currentUser.id,
      senderName: currentUser.nama,
      teks: cleanText,
      text: cleanText,
      waktu: nowIso,
      createdAt: nowIso,
      status_baca: false,
      type: 'text',
    };
    currentDB.messages.push(newMsg as Message);
    (conv as any).pesan_terakhir = cleanText;
    (conv as any).lastMessage = cleanText;
    (conv as any).updatedAt = nowIso;
    updated = true;
  }

  if (updated) {
    saveDB(currentDB);
  }

  if (initialMessage && initialMessage.trim()) {
    pushNotification({
      userId: targetItem.id_pemilik,
      tipe: 'chat',
      teks: `Pesan baru dari ${currentUser.nama} tentang ${targetName}`,
      link_page: 'chat',
      target_id: conv.id,
    });
  }

  return { convId: conv.id };
}