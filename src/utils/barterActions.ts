import { getDB, saveDB, generateId } from '../services/db';
import { Item, User, Offer, Conversation, Message, Notification } from '../types/database';

interface CreateOfferParams {
  myItem: Item;
  targetItem: Item;
  currentUser: User;
}

interface CreateOfferResult {
  convId: string;
  offerId: string;
}

/**
 * Membuat tawaran barter resmi, membuat percakapan jika belum ada,
 * menambahkan pesan tawaran resmi ke percakapan, serta mengirimkan notifikasi.
 */
export function createOfferAndConversation({
  myItem,
  targetItem,
  currentUser,
}: CreateOfferParams): CreateOfferResult {
  const currentDB = getDB();
  if (!Array.isArray(currentDB.offers)) currentDB.offers = [];
  if (!Array.isArray(currentDB.conversations)) currentDB.conversations = [];
  if (!Array.isArray(currentDB.messages)) currentDB.messages = [];
  if (!Array.isArray(currentDB.notifications)) currentDB.notifications = [];

  // 1. Buat record Offer baru
  const newOfferId = generateId('OFR', currentDB.offers);
  const priceDiff = Math.abs(myItem.harga - targetItem.harga);

  const newOffer: Offer = {
    id: newOfferId,
    item_ditawarkan: myItem.id,
    item_diminta: targetItem.id,
    status: 'pending',
    id_pengirim: currentUser.id,
    id_penerima: targetItem.id_pemilik,
    selisih_harga: priceDiff,
  };
  currentDB.offers.unshift(newOffer);

  // 2. Cari atau buat Conversation untuk pasangan user ini (tanpa syarat id_item_terkait)
  let conv = currentDB.conversations.find(
    c =>
      (c.id_user_a === currentUser.id && c.id_user_b === targetItem.id_pemilik) ||
      (c.id_user_a === targetItem.id_pemilik && c.id_user_b === currentUser.id)
  );

  if (!conv) {
    const newConvId = generateId('CONV', currentDB.conversations);
    conv = {
      id: newConvId,
      id_user_a: currentUser.id,
      id_user_b: targetItem.id_pemilik,
      id_item_terkait: targetItem.id,
    };
    currentDB.conversations.unshift(conv);
  } else {
    // Update konteks barang terbaru yang sedang dibahas
    conv.id_item_terkait = targetItem.id;
  }

  // 3. Tambahkan 1 Message baru dengan type 'offer'
  const newMsgId = generateId('MSG', currentDB.messages);
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const offerMsgText = `Tawaran Barter Resmi\n\nSaya tawarkan: ${myItem.nama} (Rp ${myItem.harga.toLocaleString('id-ID')})\nUntuk: ${targetItem.nama} (Rp ${targetItem.harga.toLocaleString('id-ID')})\nEstimasi selisih: Rp ${priceDiff.toLocaleString('id-ID')}`;

  const newMsg: Message = {
    id: newMsgId,
    id_conversation: conv.id,
    id_pengirim: currentUser.id,
    teks: offerMsgText,
    waktu: timeStr,
    status_baca: false,
    type: 'offer',
  };
  currentDB.messages.push(newMsg);

  // 4. Tambahkan Notifikasi baru untuk penerima
  const newNtfId = generateId('NTF', currentDB.notifications);
  const newNotif: Notification = {
    id: newNtfId,
    id_user: targetItem.id_pemilik,
    tipe: 'barter',
    teks: `Tawaran barter baru dari ${currentUser.nama} untuk ${targetItem.nama}`,
    waktu: 'Baru saja',
    sudah_dibaca: false,
  };
  currentDB.notifications.unshift(newNotif);

  // 5. Simpan ke database localStorage
  saveDB(currentDB);

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
 * Jika `initialMessage` diberikan, mengirim 1 pesan teks pembuka dan notifikasi.
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
    c =>
      (c.id_user_a === currentUser.id && c.id_user_b === targetItem.id_pemilik) ||
      (c.id_user_a === targetItem.id_pemilik && c.id_user_b === currentUser.id)
  );

  let updated = false;

  if (!conv) {
    const newConvId = generateId('CONV', currentDB.conversations);
    conv = {
      id: newConvId,
      id_user_a: currentUser.id,
      id_user_b: targetItem.id_pemilik,
      id_item_terkait: targetItem.id,
    };
    currentDB.conversations.unshift(conv);
    updated = true;
  } else {
    if (conv.id_item_terkait !== targetItem.id) {
      conv.id_item_terkait = targetItem.id;
      updated = true;
    }
  }

  // Jika ada pesan pembuka (misal ajakan COD via chat)
  if (initialMessage && initialMessage.trim()) {
    const newMsgId = generateId('MSG', currentDB.messages);
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newMsg: Message = {
      id: newMsgId,
      id_conversation: conv.id,
      id_pengirim: currentUser.id,
      teks: initialMessage.trim(),
      waktu: timeStr,
      status_baca: false,
      type: 'text',
    };
    currentDB.messages.push(newMsg);

    const newNtfId = generateId('NTF', currentDB.notifications);
    const newNotif: Notification = {
      id: newNtfId,
      id_user: targetItem.id_pemilik,
      tipe: 'chat',
      teks: `Pesan baru dari ${currentUser.nama} tentang ${targetItem.nama}`,
      waktu: 'Baru saja',
      sudah_dibaca: false,
    };
    currentDB.notifications.unshift(newNotif);
    updated = true;
  }

  if (updated) {
    saveDB(currentDB);
  }

  return { convId: conv.id };
}
