import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Calendar, Loader2, Phone, User, ShoppingBag, Landmark, Truck } from 'lucide-react';
import axios from 'axios';
import { API_BASE, cacheGet, cacheSet } from '../config';

const Sales = ({ triggerToast, region }) => {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({
    today_revenue: 0,
    monthly_revenue: 0,
    total_profit: 0,
    average_profit: 0,
    currency_symbol: '₹'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [gameName, setGameName] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [deliveryStatus, setDeliveryStatus] = useState('Delivered');

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const salesRes = await axios.get(`${API_BASE}/sales`, { params: { region } });
      const statsRes = await axios.get(`${API_BASE}/sales/stats`, { params: { region } });
      
      setSales(salesRes.data);
      setStats(statsRes.data);
      
      cacheSet(`sales_${region}`, {
        sales: salesRes.data,
        stats: statsRes.data
      });
    } catch (e) {
      console.error(e);
      triggerToast("Failed to load sales database.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = cacheGet(`sales_${region}`);
    if (cached) {
      setSales(cached.sales);
      setStats(cached.stats);
      setLoading(false);
      fetchData(true); // background refresh
    } else {
      fetchData(false);
    }
  }, [region]);

  const handleAddSale = async (e) => {
    e.preventDefault();
    if (!customerName || !whatsapp || !gameName || !sellPrice || !purchaseCost) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/sales`, {
        customer_name: customerName,
        whatsapp,
        game_name: gameName,
        sell_price: parseFloat(sellPrice),
        purchase_cost: parseFloat(purchaseCost),
        payment_status: paymentStatus,
        delivery_status: deliveryStatus
      }, { params: { region } });

      triggerToast(`Successfully recorded sale to '${customerName}'!`, "success");
      setCustomerName('');
      setWhatsapp('');
      setGameName('');
      setSellPrice('');
      setPurchaseCost('');
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      triggerToast("Failed to record customer sale.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = async (saleId) => {
    setDeletingId(saleId);
    try {
      await axios.delete(`${API_BASE}/sales/${saleId}`);
      triggerToast("Sale record deleted.", "success");
      fetchData();
    } catch (err) {
      triggerToast("Failed to delete sale record.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/4"></div>
        <div className="grid grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 border border-white/5 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <DollarSign className="w-8 h-8 text-gaming-accent" />
            Customer Sales Ledger
          </h2>
          <p className="text-gaming-muted mt-1 text-sm">
            Monitor client billing, calculate reseller profit margins, and manage account delivery updates.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gaming-accent hover:bg-gaming-accent/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Close Form' : 'Record Sale'}
        </button>
      </div>

      {/* Sales Stats Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block">Today's Revenue</span>
          <h4 className="text-2xl font-black text-white mt-1.5">
            {stats.currency_symbol}{stats.today_revenue}
          </h4>
        </div>
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block">Monthly Revenue</span>
          <h4 className="text-2xl font-black text-white mt-1.5">
            {stats.currency_symbol}{stats.monthly_revenue}
          </h4>
        </div>
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border-l-2 border-gaming-green">
          <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block">Total Net Profit</span>
          <h4 className="text-2xl font-black text-gaming-green mt-1.5">
            {stats.currency_symbol}{stats.total_profit}
          </h4>
        </div>
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border-l-2 border-gaming-blue">
          <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block">Avg Profit Per Game</span>
          <h4 className="text-2xl font-black text-gaming-blue mt-1.5">
            {stats.currency_symbol}{stats.average_profit}
          </h4>
        </div>
      </div>

      {/* Record Customer Sale Form */}
      {showAddForm && (
        <form onSubmit={handleAddSale} className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-b from-gaming-card to-gaming-bg/40 max-w-3xl animate-fade-in space-y-4">
          <h3 className="text-base font-bold text-white mb-2">Record Game Sale Transaction</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">Customer Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gaming-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-gaming-bg border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">WhatsApp / Phone</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gaming-muted">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-gaming-bg border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">Game Title</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gaming-muted">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="e.g. GTA V"
                  className="w-full bg-gaming-bg border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">
                Sell Price ({region})
              </label>
              <input
                type="number"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="e.g. 999"
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
                required
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">
                Purchase Cost ({region})
              </label>
              <input
                type="number"
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                placeholder="e.g. 749"
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">Delivery Status</label>
              <select
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value)}
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
              >
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gaming-accent text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-glow hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Log Sale Entry
          </button>
        </form>
      )}

      {/* Ledger Table */}
      {sales.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed border-white/5 max-w-5xl">
          <DollarSign className="w-12 h-12 text-gaming-muted mx-auto mb-4" />
          <h3 className="text-base font-bold text-white">No sales recorded yet</h3>
          <p className="text-xs text-gaming-muted mt-1">Open the sale form to log your first resold game order.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden max-w-5xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-gaming-muted tracking-wider pb-3">
                  <th className="p-5">Sale Date</th>
                  <th className="p-5">Customer / WhatsApp</th>
                  <th className="p-5">Game</th>
                  <th className="p-5 text-right">Sell Price</th>
                  <th className="p-5 text-right">Cost Price</th>
                  <th className="p-5 text-right text-gaming-green font-extrabold">Net Profit</th>
                  <th className="p-5">Status Checks</th>
                  <th className="p-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {sales.map((sale) => {
                  const hasProfit = sale.profit > 0;
                  const isPaid = sale.payment_status === 'Paid';
                  const isDelivered = sale.delivery_status === 'Delivered';
                  return (
                    <tr key={sale.id} className="group hover:bg-white/[0.01]">
                      <td className="p-5 text-xs text-gaming-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatTime(sale.timestamp)}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white">{sale.customer_name}</span>
                          <span className="text-[10px] text-gaming-muted mt-1.5 flex items-center gap-1 font-semibold">
                            <Phone className="w-3 h-3" />
                            {sale.whatsapp}
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="font-bold text-sm text-white group-hover:text-gaming-accent transition-colors">
                          {sale.game_name}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-sm text-white">
                        {sale.currency_symbol}{sale.sell_price}
                      </td>
                      <td className="p-5 text-right text-xs text-gaming-muted">
                        {sale.currency_symbol}{sale.purchase_cost}
                      </td>
                      <td className={`p-5 text-right font-black text-sm ${hasProfit ? 'text-gaming-green' : 'text-red-500'}`}>
                        {sale.currency_symbol}{sale.profit}
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1 w-fit">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase flex items-center gap-1 ${
                            isPaid 
                              ? 'bg-gaming-green/10 text-gaming-green border border-gaming-green/20' 
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            <Landmark className="w-3 h-3" />
                            {sale.payment_status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase flex items-center gap-1 ${
                            isDelivered 
                              ? 'bg-gaming-blue/10 text-gaming-blue border border-gaming-blue/20' 
                              : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          }`}>
                            <Truck className="w-3 h-3" />
                            {sale.delivery_status}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          disabled={deletingId === sale.id}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-xl transition-all"
                        >
                          {deletingId === sale.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
