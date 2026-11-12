import React, { useState } from 'react';

interface OrderItem {
  id: string;
  itemTitle: string;
  price: number;
  type: 'Beli' | 'Barter';
  counterpart: string; // Penjual atau mitra barter
  codSpot: string;
  status: 'Menunggu Konfirmasi' | 'Siap COD' | 'Selesai' | 'Dibatalkan';
  date: string;
  image: string;
}

export const OrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'semua' | 'aktif' | 'riwayat'>('semua');

  // Data simulasi pesanan / transaksi pengguna
  const [orders, setOrders] = useState<OrderItem[]>([
  ]);

  const handleCancelOrder = (id: string) => {
    if (confirm('Apakah kamu yakin ingin membatalkan pesanan ini?')) {
      setOrders(orders.map(o => o.id === id ? { ...o, status: 'Dibatalkan' } : o));
    }
  };

  const handleCompleteOrder = (id: string) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'Selesai' } : o));
  };

  // Filter berdasarkan tab aktif
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'aktif') return order.status === 'Siap COD' || order.status === 'Menunggu Konfirmasi';
    if (activeTab === 'riwayat') return order.status === 'Selesai' || order.status === 'Dibatalkan';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Header Halaman */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesanan & Transaksi Saya</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola status pembelian dan titik temu COD aman di lingkungan kampus UNNES.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('semua')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'semua' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Semua ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('aktif')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'aktif' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Aktif
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'riwayat' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Riwayat
          </button>
        </div>
      </div>

      {/* Daftar Pesanan */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed text-gray-400">
            <p className="text-base font-medium">Fitur Checkout & Pesanan Segera Hadir 🚧</p>
            <p className="text-xs text-gray-400 mt-1">Saat ini transaksi dilakukan mandiri via chat (COD). Sistem Escrow sedang dalam pengembangan.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={order.image}
                  alt={order.itemTitle}
                  className="w-20 h-20 rounded-xl object-cover bg-gray-100 flex-shrink-0 border"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                      {order.type}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${order.status === 'Siap COD' ? 'bg-amber-100 text-amber-800' :
                        order.status === 'Selesai' ? 'bg-green-100 text-green-700' :
                          order.status === 'Menunggu Konfirmasi' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {order.status}
                    </span>
                    <span className="text-xs text-gray-400">ID: {order.id}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{order.itemTitle}</h3>
                  <p className="text-xs text-gray-600">Mitra Transaksi: <span className="font-semibold">{order.counterpart}</span></p>
                  <p className="text-xs text-emerald-700 font-medium">📍 Titik COD: {order.codSpot}</p>
                </div>
              </div>

              {/* Bagian Harga & Aksi */}
              <div className="flex flex-col items-start md:items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 gap-3">
                <div className="text-left md:text-right">
                  <p className="text-xs text-gray-400">{order.date}</p>
                  <p className="text-base font-extrabold text-emerald-600">
                    {order.price > 0 ? `Rp ${order.price.toLocaleString('id-ID')}` : 'Sistem Barter'}
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {order.status === 'Siap COD' && (
                    <>
                      <button
                        onClick={() => handleCompleteOrder(order.id)}
                        className="flex-1 md:flex-initial px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Selesaikan Transaksi
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors"
                      >
                        Batalkan
                      </button>
                    </>
                  )}
                  {order.status === 'Selesai' && (
                    <span className="text-xs text-gray-400 font-semibold italic">Transaksi Selesai</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrdersPage;