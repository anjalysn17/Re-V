import { APP_NAME } from '../constants/brand';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 mt-16 text-gray-600 text-xs">
      {/* Konten Menu disebar penuh ke kanan-kiri (justify-between) */}
      <div className="w-full px-8 py-10 flex flex-col md:flex-row justify-between gap-8">
        
        {/* Kolom 1: Layanan Pelanggan */}
        <div>
          <h4 className="font-bold text-gray-800 text-[13px] mb-4 tracking-wider">LAYANAN PELANGGAN</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-[var(--color-primary)]">Pusat Bantuan</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">Cara Jual & Barter</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">Metode COD</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">Garansi Aman {APP_NAME}</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">Hubungi Kami</a></li>
          </ul>
        </div>

        {/* Kolom 2: Tentang {APP_NAME} */}
        <div>
          <h4 className="font-bold text-gray-800 text-[13px] mb-4 tracking-wider">TENTANG {APP_NAME.toUpperCase()}</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-[var(--color-primary)]">Tentang Kami</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">Komunitas Kampus</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">Kebijakan Privasi</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">Syarat & Ketentuan</a></li>
          </ul>
        </div>

        {/* Kolom 3: Ikuti Kami */}
        <div>
          <h4 className="font-bold text-gray-800 text-[13px] mb-4 tracking-wider">IKUTI KAMI</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-[var(--color-primary)]">Instagram</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">WhatsApp Channel</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">TikTok</a></li>
            <li><a href="#" className="hover:text-[var(--color-primary)]">Telegram Komunitas</a></li>
          </ul>
        </div>

        {/* Kolom 4: Keamanan Transaksi (Polos tanpa kotak putih, mentok kanan) */}
        <div className="max-w-xs md:text-left">
          <h4 className="font-bold text-gray-800 text-[13px] mb-4 tracking-wider">KEAMANAN TRANSAKSI</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-800 font-semibold text-xs">
              <span>Verifikasi Email SSO</span>
            </div>
            <p className="text-gray-500 leading-relaxed text-[11px]">
              Seluruh pengguna terikat akun kampus aktif untuk mencegah penipuan dan menjamin transaksi aman.
            </p>
          </div>
        </div>

      </div>

      {/* Baris Hak Cipta Bawah */}
      <div className="border-t border-gray-200 py-6 text-center text-gray-500 text-[11px]">
        <p>© 2026 {APP_NAME}. Platform Jual Beli & Barter Barang Bekas.</p>
        <p className="mt-1 text-gray-400">Gunungpati, Kota Semarang, Jawa Tengah</p>
      </div>
    </footer>
  );
}