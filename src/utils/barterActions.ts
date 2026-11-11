import { Item, User } from '../types/database';
import { barterService, chatService } from '../services/db';

interface CreateOfferParams {
  myItem: Item;
  targetItem: Item;
  currentUser: User;
}

interface CreateOfferResult {
  success: boolean;
  convId?: string;
  offerId?: string;
  message?: string;
}

/**
 * Membuat tawaran barter resmi, memastikan percakapan aktif ada,
 * mengirimkan pesan penawaran resmi ke backend, serta memicu notifikasi.
 */
export async function createOfferAndConversation({
  myItem,
  targetItem,
  currentUser,
}: CreateOfferParams): Promise<CreateOfferResult> {
  try {
    const priceDiff = Math.abs((myItem.harga || 0) - (targetItem.harga || 0));

    // 1. Kirim penawaran barter ke backend API (/api/barter)
    const offerPayload = {
      item_ditawarkan: myItem.id,
      item_diminta: targetItem.id,
      id_pengirim: currentUser.id,
      id_penerima: targetItem.id_pemilik,
      selisih_harga: priceDiff,
    };

    const offerResult = await barterService.createOffer(offerPayload);
    if (!offerResult.success) {
      return { success: false, message: offerResult.message || 'Gagal membuat penawaran barter.' };
    }

    // 2. Ambil daftar percakapan user untuk mencari atau membuat kamar obrolan terkait
    const conversations = await chatService.getConversations(currentUser.id);
    let conv = conversations.find(
      (c: any) =>
        (c.id_user_a === currentUser.id && c.id_user_b === targetItem.id_pemilik) ||
        (c.id_user_a === targetItem.id_pemilik && c.id_user_b === currentUser.id)
    );

    let convId = conv ? conv.id : null;

    // Jika belum ada percakapan, backend chat secara otomatis akan menangani atau bisa dikirim pesan pertama
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const itemNameMy = myItem.nama_barang || myItem.name || 'Barang';
    const itemNameTarget = targetItem.nama_barang || targetItem.name || 'Barang';
    
    const offerMsgText = `Tawaran Barter Resmi\n\nSaya tawarkan: ${itemNameMy} (Rp ${(myItem.harga || 0).toLocaleString('id-ID')})\nUntuk: ${itemNameTarget} (Rp ${(targetItem.harga || 0).toLocaleString('id-ID')})\nEstimasi selisih: Rp ${priceDiff.toLocaleString('id-ID')}`;

    if (convId) {
      await chatService.sendMessage({
        id_conversation: convId,
        id_pengirim: currentUser.id,
        teks: offerMsgText,
        waktu: timeStr,
        type: 'offer',
      });
    }

    return {
      success: true,
      convId: convId || 'CONV-NEW',
      offerId: offerResult.offerId || 'OFR-NEW',
    };
  } catch (error: any) {
    console.error('Error in createOfferAndConversation:', error);
    return { success: false, message: error.message || 'Terjadi kesalahan sistem saat memproses barter.' };
  }
}

interface OpenConversationParams {
  targetItem: Item;
  currentUser: User;
  initialMessage?: string;
}

/**
 * Membuka atau mendapatkan kamar obrolan dengan pemilik barang terkait.
 * Jika `initialMessage` diberikan, mengirimkan 1 pesan teks pembuka.
 */
export async function getOrCreateConversation({
  targetItem,
  currentUser,
  initialMessage,
}: OpenConversationParams): Promise<{ success: boolean; convId?: string; message?: string }> {
  try {
    // Ambil daftar percakapan user dari backend
    const conversations = await chatService.getConversations(currentUser.id);
    let conv = conversations.find(
      (c: any) =>
        (c.id_user_a === currentUser.id && c.id_user_b === targetItem.id_pemilik) ||
        (c.id_user_a === targetItem.id_pemilik && c.id_user_b === currentUser.id)
    );

    let convId = conv ? conv.id : null;

    // Jika pesan pembuka/ajakan COD diberikan, kirimkan sebagai pesan baru
    if (initialMessage && initialMessage.trim() && convId) {
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      await chatService.sendMessage({
        id_conversation: convId,
        id_pengirim: currentUser.id,
        teks: initialMessage.trim(),
        waktu: timeStr,
        type: 'text',
      });
    }

    return { success: true, convId: convId || 'CONV-NEW' };
  } catch (error: any) {
    console.error('Error in getOrCreateConversation:', error);
    return { success: false, message: error.message || 'Gagal membuka obrolan.' };
  }
}