import { APP_NAME } from '../constants/brand';

interface FooterProps {
  onNavigate?: (page: string, params?: any) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const openInfoSection = (title: string, category: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNavigate?.('info', { sectionTitle: title, sectionCategory: category });
  };

  const customerServiceLinks = [
    'Pusat Bantuan',
    'Cara Jual & Barter',
    'Metode COD',
    `Garansi Aman ${APP_NAME}`,
    'Hubungi Kami',
  ];

  const aboutLinks = [
    'Tentang Kami',
    'Komunitas Kampus',
    'Kebijakan Privasi',
    'Syarat & Ketentuan',
  ];

  const socialLinks = [
    'Instagram',
    'WhatsApp Channel',
    'TikTok',
    'Telegram Komunitas',
  ];

  return (
    <footer className="w-full border-t border-gray-200 mt-16 pb-20 md:pb-0 text-gray-600 text-xs">
      <div className="w-full px-6 sm:px-8 py-10 flex flex-col md:flex-row justify-between gap-8">
        {/* Kolom 1: Layanan Pelanggan */}
        <div>
          <h4 className="font-bold text-gray-800 text-[13px] mb-4 tracking-wider">LAYANAN PELANGGAN</h4>
          <ul className="space-y-2.5">
            {customerServiceLinks.map((label) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => openInfoSection(label, 'Layanan Pelanggan')}
                  className="text-left hover:text-[var(--color-primary)] transition-colors py-0.5 touch-manipulation"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Kolom 2: Tentang {APP_NAME} */}
        <div>
          <h4 className="font-bold text-gray-800 text-[13px] mb-4 tracking-wider">
            TENTANG {APP_NAME.toUpperCase()}
          </h4>
          <ul className="space-y-2.5">
            {aboutLinks.map((label) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => openInfoSection(label, `Tentang ${APP_NAME}`)}
                  className="text-left hover:text-[var(--color-primary)] transition-colors py-0.5 touch-manipulation"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Kolom 3: Ikuti Kami */}
        <div>
          <h4 className="font-bold text-gray-800 text-[13px] mb-4 tracking-wider">IKUTI KAMI</h4>
          <ul className="space-y-2.5">
            {socialLinks.map((label) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => openInfoSection(label, 'Kanal Resmi')}
                  className="text-left hover:text-[var(--color-primary)] transition-colors py-0.5 touch-manipulation"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Kolom 4: Keamanan Transaksi */}
        <div className="max-w-xs md:text-left">
          <h4 className="font-bold text-gray-800 text-[13px] mb-4 tracking-wider">KEAMANAN TRANSAKSI</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-800 font-semibold text-xs">
              <span>Verifikasi Email OTP</span>
            </div>
            <p className="text-gray-500 leading-relaxed text-[11px]">
              Setiap pengguna memverifikasi kepemilikan email melalui kode OTP dan bertransaksi langsung dengan sistem COD di titik aman sekitar kampus.
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