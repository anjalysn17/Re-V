import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { itemService } from '../services/db';

interface ProfilePageProps {
  onNavigate: (page: string, params?: any) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State lokal untuk data diri
  const [profileData, setProfileData] = useState({
    name: currentUser?.nama || currentUser?.name || 'Haikal Akhsan Darmawan',
    email: currentUser?.email || 'haikalakhsan@students.unnes.ac.id',
    phone: currentUser?.phone || '081234567890',
    location: currentUser?.lokasi || 'Sekaran, Gunungpati, Semarang',
    major: 'Teknik Informatika',
    faculty: 'FMIPA UNNES',
  });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.nama || currentUser.name || 'Haikal Akhsan Darmawan',
        email: currentUser.email || 'haikalakhsan@students.unnes.ac.id',
        phone: currentUser.phone || '081234567890',
        location: currentUser.lokasi || 'Sekaran, Gunungpati, Semarang',
        major: 'Teknik Informatika',
        faculty: 'FMIPA UNNES',
      });
    }
  }, [currentUser]);

  // Ambil daftar barang milik user dari backend Railway
  useEffect(() => {
    const fetchUserItems = async () => {
      if (!currentUser) return;
      setIsLoadingItems(true);
      try {
        const allItems = await itemService.getAllItems();
        const mine = allItems.filter(
          (item: any) => item.id_pemilik === currentUser.id
        );
        setUserItems(mine);
      } catch (error) {
        console.error("Gagal memuat barang pengguna:", error);
      } finally {
        setIsLoadingItems(false);
      }
    };
    fetchUserItems();
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Simulasi penyimpanan profil ke backend
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsEditing(false);
      setToastMsg('✓ Profil berhasil diperbarui!');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (error) {
      console.error(error);
      setToastMsg('Gagal memperbarui profil.');
      setTimeout(() => setToastMsg(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Toast Notifikasi */}
      {toastMsg && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4"
          style={{ background: 'var(--color-success, #4a8c5c)' }}
        >
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Profil */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-emerald-700 text-white rounded-full flex items-center justify-center font-bold text-2xl border-4 border-emerald-100 shrink-0">
            {profileData.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{profileData.name}</h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-300">
                ✓ Verified Student
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{profileData.email}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">📍 {profileData.location}</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
        >
          {isEditing ? 'Batal Edit' : 'Edit Profil'}
        </button>
      </div>

      {/* Form / Detail Data Diri */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Informasi Akun & Informasi Kampus</h2>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email Kampus</label>
                <input
                  type="email"
                  disabled
                  value={profileData.email}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nomor WhatsApp</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Area Tempat Tinggal / Kos</label>
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-400 font-medium">Fakultas / Program Studi</p>
              <p className="font-semibold text-gray-800 mt-0.5">{profileData.faculty} — {profileData.major}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Nomor WhatsApp / Kontak</p>
              <p className="font-semibold text-gray-800 mt-0.5">{profileData.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Status Verifikasi Mahasiswa</p>
              <p className="font-semibold text-emerald-600 mt-0.5">Terverifikasi via KTM & Email Institusi UNNES</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Domisili Kampus</p>
              <p className="font-semibold text-gray-800 mt-0.5">{profileData.location}</p>
            </div>
          </div>
        )}
      </div>

      {/* Etalase / Barang yang Saya Jual */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Etalase Barang Saya ({userItems.length})</h2>
          <button
            onClick={() => onNavigate('home')}
            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            + Pasang Barang Baru
          </button>
        </div>

        {isLoadingItems ? (
          <div className="py-8 text-center text-xs text-gray-400">Memuat daftar barang Anda...</div>
        ) : userItems.length === 0 ? (
          <div className="py-10 text-center border border-dashed rounded-xl border-gray-200 bg-gray-50/50 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Belum ada barang di etalase Anda</p>
            <p className="text-[11px] text-gray-400">Barang yang Anda pasang untuk dijual atau barter akan muncul di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {userItems.map(item => {
              const itemName = item.nama_barang || item.nama;
              return (
                <div
                  key={item.id}
                  onClick={() => onNavigate('product', { productId: item.id })}
                  className="p-3 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer flex gap-3 items-center bg-white"
                >
                  <img
                    src={item.foto || '/assets/seed-images/placeholder.svg'}
                    alt={itemName}
                    className="w-14 h-14 rounded-lg object-cover border border-gray-100 shrink-0"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{itemName}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      Rp {Number(item.harga).toLocaleString('id-ID')}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded">
                      {item.status || 'keduanya'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}