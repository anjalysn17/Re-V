import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // State lokal untuk simulasi edit data diri
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Haikal Akhsan Darmawan',
    email: user?.email || 'haikalakhsan@students.unnes.ac.id',
    phone: '081234567890',
    location: 'Patemon, Gunungpati',
    major: 'Teknik Informatika',
    faculty: 'FMIPA UNNES',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    alert('Profil berhasil diperbarui!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Header Profil */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-emerald-700 text-white rounded-full flex items-center justify-center font-bold text-2xl border-4 border-emerald-100">
            {profileData.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
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
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
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
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                Simpan Perubahan
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
    </div>
  );
};

export default ProfilePage;