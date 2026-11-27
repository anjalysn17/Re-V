import Footer from '../components/Footer';
import { APP_NAME } from '../constants/brand';

interface InfoPageProps {
  sectionTitle?: string;
  sectionCategory?: string;
  onNavigate: (page: string, params?: any) => void;
}

const INFO_CONTENT: Record<
  string,
  {
    badge: string;
    subtitle: string;
    highlights: { title: string; body: string }[];
    steps?: string[];
  }
> = {
  'Pusat Bantuan': {
    badge: 'Layanan Pelanggan',
    subtitle: `Panduan cepat seputar penggunaan akun, verifikasi OTP, pengunggahan barang, hingga penyelesaian transaksi di ${APP_NAME}.`,
    highlights: [
      {
        title: 'Verifikasi Akun & OTP Email',
        body: 'Setiap pendaftar menerima kode OTP 6 digit ke email aktif untuk memastikan komunikasi dan transaksi dilakukan oleh pengguna asli.',
      },
      {
        title: 'Barang Tidak Muncul atau Perlu Diedit',
        body: 'Buka menu Profil → Barang Saya untuk mengubah harga, kondisi, area COD, menandai barang selesai, atau menghapus iklan.',
      },
      {
        title: 'Kendala Pertemuan COD',
        body: 'Gunakan fitur Rekomendasi Titik COD di dalam ruang chat agar sistem menghitung titik tengah aman antara lokasi pembeli dan penjual.',
      },
    ],
  },
  'Cara Jual & Barter': {
    badge: 'Panduan Pengguna',
    subtitle: 'Ubah barang kos atau perlengkapan kuliah yang jarang dipakai menjadi uang tunai atau barang lain yang lebih kamu butuhkan.',
    highlights: [
      {
        title: '1. Pasang Iklan Barang',
        body: 'Tekan tombol "+ Tambah Barang" (atau tombol tengah di bar bawah HP), unggah foto jelas, pilih kategori, grade kondisi, dan tentukan jenis penawaran (Jual, Barter, atau Keduanya).',
      },
      {
        title: '2. Gunakan Smart Barter',
        body: 'Masuk ke halaman Smart Barter untuk melihat daftar barang sekitar kampus dengan skor kecocokan nilai dan jarak terdekat dari areamu.',
      },
      {
        title: '3. Negosiasi & Sepakati Deal di Chat',
        body: 'Ajukan penawaran barter atau tanyakan detail barang di ruang chat. Setelah cocok, tekan "Sepakati Deal" agar transaksi otomatis tercatat.',
      },
    ],
  },
  'Metode COD': {
    badge: 'Transaksi Tatap Muka',
    subtitle: `Seluruh transaksi di ${APP_NAME} menggunakan sistem Cash on Delivery (COD) langsung antar pengguna tanpa biaya perantara.`,
    highlights: [
      {
        title: 'Cek Barang Sebelum Bayar / Tukar',
        body: 'Periksa fisik, kelengkapan, dan fungsi barang secara langsung saat bertemu sebelum menyerahkan uang tunai, transfer, atau barang barter.',
      },
      {
        title: 'Titik Temu Publik yang Direkomendasikan',
        body: 'Utamakan bertemu di area ramai dan terang seperti Gerbang Utama UNNES Sekaran, Perpustakaan Pusat, Taman FMIPA, atau minimarket Sekaran Raya.',
      },
      {
        title: 'Privasi Lokasi Terjaga',
        body: 'Halaman publik hanya menampilkan nama area umum. Koordinat GPS hanya digunakan sementara saat menghitung titik tengah COD di ruang chat.',
      },
    ],
  },
  [`Garansi Aman ${APP_NAME}`]: {
    badge: 'Keamanan Komunitas',
    subtitle: 'Langkah perlindungan bersama untuk menjaga lingkungan jual beli dan barter tetap jujur dan nyaman.',
    highlights: [
      {
        title: 'Verifikasi Identitas Email OTP',
        body: 'Mencegah akun spam dengan mewajibkan verifikasi kode OTP sekali pakai saat pendaftaran akun baru.',
      },
      {
        title: 'Transparansi Grade Kondisi',
        body: 'Setiap barang dikelompokkan ke dalam Grade A (Seperti Baru), Grade B (Layak Pakai), atau Grade C (Cacat Minor) agar ekspektasi pembeli sesuai.',
      },
      {
        title: 'Peninjauan & Mediasi Titik Aman',
        body: 'Jika terjadi ketidaksesuaian saat transaksi, pengguna dapat mengajukan peninjauan ulang di titik publik kampus melalui halaman Pesanan Saya.',
      },
    ],
  },
  'Hubungi Kami': {
    badge: 'Kontak & Dukungan',
    subtitle: 'Punya masukan fitur, laporan bug, atau laporan penyalahgunaan iklan? Tim pengelola siap membantu.',
    highlights: [
      {
        title: 'Email Bantuan Pengguna',
        body: 'halo@rev-marketplace.id (Respon maksimal 1x24 jam pada hari kerja).',
      },
      {
        title: 'Posko Komunitas Kampus',
        body: 'Sekaran, Kecamatan Gunungpati, Kota Semarang, Jawa Tengah 50229.',
      },
      {
        title: 'Pelaporan Iklan Bermasalah',
        body: 'Sertakan nama barang dan nama akun penjual saat menghubungi admin agar segera ditindaklanjuti.',
      },
    ],
  },
  'Tentang Kami': {
    badge: `Tentang ${APP_NAME}`,
    subtitle: `${APP_NAME} adalah platform sirkular berbasis komunitas mahasiswa dan warga sekitar kampus untuk menjual, membeli, dan menukar (barter) barang bekas layak pakai.`,
    highlights: [
      {
        title: 'Misi Ekonomi Sirkular Kampus',
        body: 'Mengurangi limbah barang kos saat pergantian semester atau kelulusan dengan mempertemukan pemilik lama dan mahasiswa baru secara langsung.',
      },
      {
        title: 'Hemat Biaya & Tanpa Ongkir',
        body: 'Karena transaksi berlangsung dalam satu kawasan kampus dan sekitarnya, barang dapat berpindah tangan lewat COD tanpa biaya ekspedisi.',
      },
    ],
  },
  'Komunitas Kampus': {
    badge: 'Ekosistem Lokal',
    subtitle: 'Menghubungkan mahasiswa lintas fakultas dan warga kos di kawasan Sekaran, Banaran, Patemon, Kalisegoro, dan Trangkil.',
    highlights: [
      {
        title: 'Kategori Kebutuhan Kuliah & Kos',
        body: 'Mulai dari buku referensi kuliah, kalkulator saintifik, elektronik belajar, tas, fashion, hingga perabot kos.',
      },
      {
        title: 'Event Flash Barter Berkala',
        body: 'Ikuti periode promo Flash Barter di halaman utama untuk menemukan barang pilihan yang siap ditukar cepat.',
      },
    ],
  },
  'Kebijakan Privasi': {
    badge: 'Privasi & Data',
    subtitle: `Komitmen ${APP_NAME} dalam melindungi informasi pribadi setiap pengguna.`,
    highlights: [
      {
        title: 'Data yang Dikumpulkan',
        body: 'Kami hanya menyimpan nama, alamat email terverifikasi, area COD umum, nomor kontak opsional, serta daftar barang dan riwayat obrolan transaksi.',
      },
      {
        title: 'Perlindungan Koordinat GPS',
        body: 'Koordinat GPS dari fitur Rekomendasi Titik COD tidak pernah dipublikasikan di katalog barang dan hanya dipakai untuk menghitung jarak titik temu.',
      },
    ],
  },
  'Syarat & Ketentuan': {
    badge: 'Aturan Platform',
    subtitle: `Ketentuan penggunaan layanan jual beli dan barter di ${APP_NAME}.`,
    highlights: [
      {
        title: 'Barang yang Diperbolehkan',
        body: 'Pengguna wajib memastikan barang yang diunggah adalah milik sah pribadi, berfungsi sesuai deskripsi, dan bukan barang terlarang atau berbahaya.',
      },
      {
        title: 'Tanggung Jawab Kesepakatan COD',
        body: 'Harga, selisih barter, waktu, dan lokasi pertemuan disepakati secara sadar oleh kedua belah pihak melalui fitur chat resmi aplikasi.',
      },
    ],
  },
};

export default function InfoPage({
  sectionTitle = 'Pusat Bantuan',
  sectionCategory = 'Informasi',
  onNavigate,
}: InfoPageProps) {
  const data = INFO_CONTENT[sectionTitle] || {
    badge: sectionCategory,
    subtitle: `Informasi resmi seputar ${sectionTitle} di ${APP_NAME}. Ikuti pembaruan komunitas kampus dan informasi fitur terbaru kami.`,
    highlights: [
      {
        title: `Kanal Resmi ${sectionTitle}`,
        body: `Terhubung dengan komunitas ${APP_NAME} untuk mendapatkan info barang bekas pilihan, tips COD aman sekitar kampus, serta jadwal Flash Barter terbaru.`,
      },
      {
        title: 'Butuh Bantuan Langsung?',
        body: 'Kamu dapat kembali ke beranda untuk menjelajahi katalog atau membuka halaman Smart Barter untuk mulai menukar barang.',
      },
    ],
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 py-1 touch-manipulation"
      >
        <span>←</span> Kembali ke Beranda
      </button>

      <div
        className="rounded-2xl p-6 sm:p-8 text-white shadow-sm"
        style={{ background: 'linear-gradient(135deg, #3e5540 0%, var(--color-primary) 100%)' }}
      >
        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 mb-3">
          {data.badge}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{sectionTitle}</h1>
        <p className="text-xs sm:text-sm text-white/85 mt-2 leading-relaxed">{data.subtitle}</p>
      </div>

      <div className="space-y-3">
        {data.highlights.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl p-5 border shadow-xs space-y-1.5"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <h2 className="text-sm font-bold text-gray-900">{item.title}</h2>
            <p className="text-xs text-gray-600 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 touch-manipulation"
          style={{ background: 'var(--color-primary)' }}
        >
          Jelajahi Barang
        </button>
        <button
          type="button"
          onClick={() => onNavigate('barter')}
          className="min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-bold border bg-white text-gray-800 hover:bg-gray-50 touch-manipulation"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Buka Smart Barter
        </button>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}