import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Calendar, Loader2, DollarSign, Tag, Info } from 'lucide-react';
import axios from 'axios';
import { API_BASE, cacheGet, cacheSet } from '../config';

const Inventory = ({ triggerToast, region }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [gameName, setGameName] = useState('');
  const [purchasePlatform, setPurchasePlatform] = useState('Steam');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [activationType, setActivationType] = useState('Steam Key');

  const fetchInventory = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/inventory`, { params: { region } });
      setInventory(res.data);
      cacheSet(`inventory_${region}`, res.data);
    } catch (e) {
      console.error(e);
      triggerToast("Failed to load inventory logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = cacheGet(`inventory_${region}`);
    if (cached) {
      setInventory(cached);
      setLoading(false);
      fetchInventory(true); // background refresh
    } else {
      fetchInventory(false);
    }
  }, [region]);

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!gameName || !purchasePrice || !quantity) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/inventory`, {
        game_name: gameName,
        purchase_platform: purchasePlatform,
        purchase_price: parseFloat(purchasePrice),
        quantity: parseInt(quantity),
        activation_type: activationType
      }, { params: { region } });

      triggerToast(`Successfully recorded purchase stock for '${gameName}'!`, "success");
      setGameName('');
      setPurchasePrice('');
      setQuantity('1');
      setShowAddForm(false);
      fetchInventory();
    } catch (err) {
      triggerToast("Failed to record stock purchase.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    setDeletingId(itemId);
    try {
      await axios.delete(`${API_BASE}/inventory/${itemId}`);
      setInventory(inventory.filter(item => item.id !== itemId));
      triggerToast("Stock item deleted from inventory.", "success");
    } catch (err) {
      triggerToast("Failed to delete stock item.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/4"></div>
        <div className="h-64 bg-white/5 border border-white/5 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Database className="w-8 h-8 text-gaming-accent" />
            Purchase Stock Catalog
          </h2>
          <p className="text-gaming-muted mt-1 text-sm">
            Record supplier license bulk purchases, activation models, and buy pricing.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gaming-accent hover:bg-gaming-accent/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Close Form' : 'Add Stock'}
        </button>
      </div>

      {/* Record Stock Purchase Form */}
      {showAddForm && (
        <form onSubmit={handleAddStock} className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-b from-gaming-card to-gaming-bg/40 max-w-3xl animate-fade-in space-y-4">
          <h3 className="text-base font-bold text-white mb-2">Record Game Purchase</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">Game Title</label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="e.g. Grand Theft Auto V"
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
                required
              />
            </div>
            
            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">Supplier Store</label>
              <select
                value={purchasePlatform}
                onChange={(e) => setPurchasePlatform(e.target.value)}
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
              >
                <option value="Steam">Steam</option>
                <option value="Epic Games Store">Epic Games Store</option>
                <option value="EA App">EA App</option>
                <option value="Ubisoft Store">Ubisoft Store</option>
                <option value="Xbox PC">Xbox PC</option>
                <option value="Green Man Gaming">Green Man Gaming</option>
                <option value="Fanatical">Fanatical</option>
                <option value="Humble Store">Humble Store</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">
                Purchase Price per Qty ({region})
              </label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="e.g. 749"
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
                required
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 1"
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
                required
                min="1"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1.5">Activation Model</label>
              <select
                value={activationType}
                onChange={(e) => setActivationType(e.target.value)}
                className="w-full bg-gaming-bg border border-white/5 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gaming-accent/40"
              >
                <option value="Steam Key">Steam Key</option>
                <option value="Epic Key">Epic Key</option>
                <option value="Offline Activation">Offline Activation</option>
                <option value="Shared Account">Shared Account</option>
                <option value="Dedicated Account">Dedicated Account</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gaming-accent text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-glow hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Stock Entry
          </button>
        </form>
      )}

      {/* Stock List Ledger */}
      {inventory.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed border-white/5 max-w-5xl">
          <Database className="w-12 h-12 text-gaming-muted mx-auto mb-4" />
          <h3 className="text-base font-bold text-white">No purchases recorded yet</h3>
          <p className="text-xs text-gaming-muted mt-1">Open the stock form to log your first resale licenses purchase.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden max-w-5xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-gaming-muted tracking-wider pb-3">
                  <th className="p-5">Purchase Date</th>
                  <th className="p-5">Game Title</th>
                  <th className="p-5">Activation</th>
                  <th className="p-5 text-right">Cost Price</th>
                  <th className="p-5 text-right">Qty</th>
                  <th className="p-5">Supplier Store</th>
                  <th className="p-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {inventory.map((item) => {
                  return (
                    <tr key={item.id} className="group hover:bg-white/[0.01]">
                      <td className="p-5 text-xs text-gaming-muted">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.purchase_date)}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className="font-bold text-sm text-white group-hover:text-gaming-accent transition-colors">
                          {item.game_name}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-gaming-blue/15 text-gaming-blue border border-gaming-blue/20">
                          {item.activation_type}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-sm text-white">
                        {item.currency_symbol}{item.purchase_price}
                      </td>
                      <td className="p-5 text-right font-bold text-sm text-gaming-muted">
                        {item.quantity}
                      </td>
                      <td className="p-5">
                        <span className="text-xs font-bold text-white/90">
                          {item.purchase_platform}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingId === item.id}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-xl transition-all"
                        >
                          {deletingId === item.id ? (
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

export default Inventory;
