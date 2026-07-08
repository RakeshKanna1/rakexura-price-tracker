import React, { useState, useEffect } from 'react';
import { Heart, Trash2, Calendar, Eye, Loader2, Gamepad2, ArrowRight, Download, RefreshCw, DollarSign } from 'lucide-react';
import axios from 'axios';
import { API_BASE, cacheGet, cacheSet } from '../config';

const Wishlist = ({ onViewDetails, triggerToast, region }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);

  const fetchWishlist = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/wishlist`, { params: { region } });
      setWishlist(res.data);
      // Cache data
      cacheSet(`wishlist_${region}`, res.data);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to load wishlist.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = cacheGet(`wishlist_${region}`);
    if (cached) {
      setWishlist(cached);
      setLoading(false);
      fetchWishlist(true); // silent refresh
    } else {
      fetchWishlist(false);
    }
  }, [region]);

  const handleRemove = async (cheapsharkId, name) => {
    setDeletingId(cheapsharkId);
    try {
      await axios.delete(`${API_BASE}/game/${cheapsharkId}`);
      setWishlist(wishlist.filter(g => g.cheapshark_id !== cheapsharkId));
      triggerToast(`Successfully untracked '${name}'`, "success");
    } catch (err) {
      triggerToast(`Failed to remove '${name}'`, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateSellPrice = async (cheapsharkId, newPrice) => {
    try {
      await axios.put(`${API_BASE}/wishlist/${cheapsharkId}/sell-price`, 
        { sell_price: parseFloat(newPrice) },
        { params: { region } }
      );
      // Reload wishlist to show updated profit and margins
      const res = await axios.get(`${API_BASE}/wishlist`, { params: { region } });
      setWishlist(res.data);
      triggerToast("Resell price updated!", "success");
    } catch (err) {
      triggerToast("Failed to update resell price.", "error");
    }
  };

  const handleRefreshSingle = async (cheapsharkId) => {
    setRefreshingId(cheapsharkId);
    try {
      await axios.put(`${API_BASE}/refresh/${cheapsharkId}`);
      const res = await axios.get(`${API_BASE}/wishlist`, { params: { region } });
      setWishlist(res.data);
      triggerToast("Prices refreshed successfully!", "success");
    } catch (err) {
      triggerToast("Failed to refresh game prices.", "error");
    } finally {
      setRefreshingId(null);
    }
  };

  const formatLastChecked = (timeString) => {
    if (!timeString) return 'Never';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-white/5 border border-white/5 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Download CSV */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Wishlist Inventory</h2>
          <p className="text-gaming-muted mt-1 text-sm">Monitored resell catalog with automated profit margins calculation.</p>
        </div>
        
        {wishlist.length > 0 && (
          <a
            href={`${API_BASE}/export/wishlist?region=${region}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-gaming-green hover:bg-gaming-green/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-glow hover:shadow-green-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export Inventory CSV
          </a>
        )}
      </div>

      {wishlist.length === 0 ? (
        <div className="py-24 text-center glass-panel rounded-2xl border-dashed border-white/5 max-w-4xl">
          <Heart className="w-12 h-12 text-gaming-muted mx-auto mb-4" />
          <h3 className="text-base font-bold text-white">Wishlist is empty</h3>
          <p className="text-xs text-gaming-muted mt-1">Start tracking games by searching and adding them.</p>
          <button
            onClick={() => onViewDetails(null)} 
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gaming-accent text-white text-xs font-bold rounded-xl shadow-glow hover:opacity-90 transition-all"
          >
            Find Games to Monitor
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((game) => {
            const isProfitable = game.profit > 0;
            return (
              <div
                key={game.id}
                className="glass-panel hover:border-gaming-accent/20 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300"
              >
                {/* Header Info */}
                <div className="p-5 flex gap-4">
                  <img
                    src={game.thumbnail}
                    alt={game.name}
                    className="w-16 h-16 object-cover rounded-xl bg-black border border-white/5 flex-shrink-0"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-gaming-accent transition-colors">
                      {game.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] bg-gaming-accent/15 text-gaming-accent border border-gaming-accent/20 px-1.5 py-0.5 rounded font-black">
                        {game.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gaming-muted mt-2 font-bold uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Updated: {formatLastChecked(game.last_checked)}</span>
                    </div>
                  </div>
                </div>

                {/* Reselling Calculations Panel */}
                <div className="px-5 py-4 bg-white/[0.01] border-y border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Buy Price */}
                    <div>
                      <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block">Buy Price (Lowest)</span>
                      <p className="text-sm font-black text-gaming-green mt-1">
                        {game.currency_symbol}{game.current_price}
                      </p>
                    </div>

                    {/* Sell Price (Editable Input) */}
                    <div>
                      <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block mb-1">Sell Price</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-extrabold text-xs text-gaming-muted">
                          {game.currency_symbol}
                        </span>
                        <input
                          type="number"
                          defaultValue={game.sell_price}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              handleUpdateSellPrice(game.cheapshark_id, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                handleUpdateSellPrice(game.cheapshark_id, val);
                                e.target.blur();
                              }
                            }
                          }}
                          className="w-full bg-gaming-bg border border-white/5 rounded-lg pl-6 pr-2 py-1 text-xs font-black text-white focus:outline-none focus:border-gaming-accent/40"
                          placeholder="Sell price"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profit & Margin Display */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-white/5">
                    <div>
                      <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block">Net Profit</span>
                      <p className={`text-xs font-black mt-0.5 ${isProfitable ? 'text-gaming-green' : 'text-red-500'}`}>
                        {game.currency_symbol}{game.profit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block">Margin</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-black mt-1 ${
                        isProfitable 
                          ? 'bg-gaming-green/15 text-gaming-green border border-gaming-green/20' 
                          : 'bg-red-500/15 text-red-500 border border-red-500/20'
                      }`}>
                        {game.margin}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 bg-white/[0.02] flex items-center justify-between gap-2.5">
                  <button
                    onClick={() => onViewDetails(game.cheapshark_id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-white font-bold text-[10px] tracking-wider uppercase transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Analyze Deals
                  </button>

                  <button
                    onClick={() => handleRefreshSingle(game.cheapshark_id)}
                    disabled={refreshingId === game.cheapshark_id}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 text-gaming-muted hover:text-white rounded-xl transition-all"
                    title="Refresh price"
                  >
                    {refreshingId === game.cheapshark_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleRemove(game.cheapshark_id, game.name)}
                    disabled={deletingId === game.cheapshark_id}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/20 text-red-500 rounded-xl transition-all"
                    title="Remove from tracking"
                  >
                    {deletingId === game.cheapshark_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
