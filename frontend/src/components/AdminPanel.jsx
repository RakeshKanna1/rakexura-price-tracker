import React, { useState, useEffect } from 'react';
import { 
  Shield, RefreshCw, Terminal, AlertTriangle, Info, Trash2, Database, Loader2, 
  Send, Sparkles, Receipt, Star, Gamepad2, Flame, Gift, KeyRound, Megaphone, LifeBuoy, Search 
} from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

const AdminPanel = ({ triggerToast, region = 'IN' }) => {
  const [logs, setLogs] = useState([]);
  const [games, setGames] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Broadcaster State
  const [selectedTemplate, setSelectedTemplate] = useState('Special Offer');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [broadcaster, setBroadcaster] = useState({
    title: '',
    message: '',
    short_message: '',
    target: 'All Users',
    method: 'In-App & Push Notification'
  });

  const templates = [
    { id: 'Order Invoice', label: 'Order Invoice', icon: Receipt },
    { id: 'Review Request', label: 'Review Request', icon: Star },
    { id: 'New Game', label: 'New Game', icon: Gamepad2 },
    { id: 'Special Offer', label: 'Special Offer', icon: Flame },
    { id: 'Giveaway Alert', label: 'Giveaway Alert', icon: Gift },
    { id: 'Activation Guide', label: 'Activation Guide', icon: KeyRound },
    { id: 'Announcement', label: 'Announcement', icon: Megaphone },
    { id: 'Support Notice', label: 'Support Notice', icon: LifeBuoy }
  ];

  const fetchAdminData = async () => {
    try {
      const logsRes = await axios.get(`${API_BASE}/logs`);
      setLogs(logsRes.data);

      const gamesRes = await axios.get(`${API_BASE}/wishlist`, { params: { region } });
      setGames(gamesRes.data);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching admin panel data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [region]);

  // Handle Game Selection & Price Auto-Fill for Special Offer
  const handleGameSelect = async (cheapsharkId) => {
    setSelectedGameId(cheapsharkId);
    if (!cheapsharkId) return;

    const game = games.find(g => g.cheapshark_id === cheapsharkId);
    const gameName = game ? game.name : 'Selected Game';

    setFetchingPrice(true);
    try {
      const res = await axios.get(`${API_BASE}/prices/${cheapsharkId}`, { params: { region } });
      const details = res.data;

      const currentPrice = details.lowest_price ? `${details.currency_symbol}${details.lowest_price}` : (game ? `${game.currency_symbol}${game.current_price}` : 'Special Price');
      const discount = details.platform_prices?.[0]?.discount_percent ? Math.round(details.platform_prices[0].discount_percent) : (game?.discount_percent ? Math.round(game.discount_percent) : 50);
      const origPrice = details.platform_prices?.[0]?.original_price ? `${details.currency_symbol}${details.platform_prices[0].original_price}` : '';

      if (selectedTemplate === 'Special Offer') {
        setBroadcaster({
          title: `🔥 Special Offer: ${gameName} is ${discount}% OFF!`,
          message: `Special Limited-Time Offer! ${gameName} is now on sale for only ${currentPrice}${origPrice ? ` (was ${origPrice}, saving ${discount}% OFF)` : ''}. Grab your key on Rakexura before stock runs out!`,
          short_message: `🔥 Special Offer: ${gameName} is ${discount}% OFF at ${currentPrice}! Limited stock.`,
          target: 'All Users',
          method: 'In-App & Push Notification'
        });
      } else if (selectedTemplate === 'New Game') {
        setBroadcaster({
          title: `${gameName} is now available`,
          message: `${gameName} has arrived at Rakexura. Check platforms, live pricing, trailers, and current offers at ${currentPrice}.`,
          short_message: `🎮 New Game: ${gameName} is now live on Rakexura at ${currentPrice}!`,
          target: 'All Users',
          method: 'In-App & Push Notification'
        });
      } else if (selectedTemplate === 'Giveaway Alert') {
        setBroadcaster({
          title: `🎁 Free Giveaway Alert: ${gameName}`,
          message: `Enter the Rakexura free giveaway to win a free activation key for ${gameName}! Winners announced soon.`,
          short_message: `🎁 Giveaway Alert: Win a free copy of ${gameName}!`,
          target: 'All Users',
          method: 'In-App & Push Notification'
        });
      }
    } catch (e) {
      console.error("Error fetching price for template:", e);
      if (selectedTemplate === 'Special Offer') {
        setBroadcaster({
          title: `🔥 Special Offer: ${gameName} is on Sale!`,
          message: `Special Limited-Time Offer! ${gameName} is now available at a discounted price on Rakexura. Check live pricing now!`,
          short_message: `🔥 Special Offer: ${gameName} is now on sale!`,
          target: 'All Users',
          method: 'In-App & Push Notification'
        });
      }
    } finally {
      setFetchingPrice(false);
    }
  };

  // Handle Template Switching
  const handleTemplateChange = (tmplId) => {
    setSelectedTemplate(tmplId);
    const game = games.find(g => g.cheapshark_id === selectedGameId);
    const gameName = game ? game.name : 'Just Cause 3';

    if (tmplId === 'Special Offer') {
      if (selectedGameId) {
        handleGameSelect(selectedGameId);
      } else {
        setBroadcaster({
          title: `🔥 Special Offer: Exclusive PC Store Deals Active!`,
          message: `Huge price drops discovered on top PC games! Save up to 90% OFF on Steam, Epic Games, GOG, and EA App deals today on Rakexura.`,
          short_message: `🔥 Special Offer: Up to 90% OFF on top PC games today!`,
          target: 'All Users',
          method: 'In-App & Push Notification'
        });
      }
    } else if (tmplId === 'New Game') {
      setBroadcaster({
        title: `${gameName} is now available`,
        message: `${gameName} has arrived at Rakexura. Check platforms, live pricing, trailers, and current offers.`,
        short_message: `🎮 New Game: ${gameName} is now live on Rakexura!`,
        target: 'All Users',
        method: 'In-App Notification'
      });
    } else if (tmplId === 'Order Invoice') {
      setBroadcaster({
        title: `🧾 Order Invoice & Delivery Confirmation`,
        message: `Your order ref #${orderRef || 'RKX-2607-000064'} has been processed successfully. Your digital key is ready for redemption.`,
        short_message: `🧾 Invoice #${orderRef || 'RKX-2607-000064'} processed! Check your receipt.`,
        target: 'Order Customer',
        method: 'Email & In-App Notification'
      });
    } else if (tmplId === 'Giveaway Alert') {
      setBroadcaster({
        title: `🎁 Free Giveaway Alert: ${gameName}`,
        message: `Enter the Rakexura free giveaway to win a free copy of ${gameName}! Winners announced soon.`,
        short_message: `🎁 Giveaway Alert: Win a free copy of ${gameName}!`,
        target: 'All Users',
        method: 'In-App Notification'
      });
    } else if (tmplId === 'Activation Guide') {
      setBroadcaster({
        title: `🗝️ Game Key Activation Guide`,
        message: `Follow our step-by-step guide to easily redeem and activate your digital serial key on Steam, Epic Games Store, and EA App.`,
        short_message: `🗝️ Activation Guide: How to redeem your game keys cleanly.`,
        target: 'All Users',
        method: 'In-App Notification'
      });
    } else if (tmplId === 'Announcement') {
      setBroadcaster({
        title: `📢 System Update & Announcement`,
        message: `Important platform upgrades and live regional currency tracking updates are now active on Rakexura.`,
        short_message: `📢 Announcement: New features updated on Rakexura!`,
        target: 'All Users',
        method: 'In-App & Push Notification'
      });
    } else if (tmplId === 'Support Notice') {
      setBroadcaster({
        title: `⚽ Customer Support Notice`,
        message: `Need assistance with an order or key activation? Our 24/7 support desk is available to assist you.`,
        short_message: `⚽ Support Notice: Need help with your order? Contact support.`,
        target: 'All Users',
        method: 'In-App Notification'
      });
    } else if (tmplId === 'Review Request') {
      setBroadcaster({
        title: `⭐ Leave a Customer Review`,
        message: `Enjoying your purchase? Help other gamers by sharing your experience with Rakexura!`,
        short_message: `⭐ Share your feedback with the Rakexura community!`,
        target: 'Recent Buyers',
        method: 'In-App Notification'
      });
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcaster.title || !broadcaster.message) {
      triggerToast("Please fill in both title and message body.", "error");
      return;
    }

    setSendingBroadcast(true);
    try {
      const selectedGame = games.find(g => g.cheapshark_id === selectedGameId);
      await axios.post(`${API_BASE}/broadcast-notification`, {
        title: broadcaster.title,
        message: broadcaster.message,
        short_message: broadcaster.short_message || broadcaster.title,
        category: selectedTemplate,
        cheapshark_id: selectedGameId || null,
        game_name: selectedGame ? selectedGame.name : null,
        target: broadcaster.target,
        method: broadcaster.method,
        region
      });

      triggerToast("Broadcast notification sent successfully!", "success");
      fetchAdminData(); // Refresh activity log
    } catch (err) {
      console.error(err);
      triggerToast("Failed to send broadcast notification.", "error");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await axios.put(`${API_BASE}/refresh`);
      triggerToast(res.data.message || "Manual check complete!", "success");
      await fetchAdminData();
    } catch (err) {
      triggerToast("Failed to run price checks.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveGame = async (cheapsharkId, name) => {
    setDeletingId(cheapsharkId);
    try {
      await axios.delete(`${API_BASE}/game/${cheapsharkId}`);
      setGames(games.filter(g => g.cheapshark_id !== cheapsharkId));
      triggerToast(`Removed tracking for '${name}'`, "success");
      await fetchAdminData();
    } catch (err) {
      triggerToast("Failed to remove game.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const getEventBadge = (type) => {
    const configs = {
      ALERT_TRIGGERED: 'bg-red-500/10 border-red-500/20 text-red-400',
      ALERT_CREATED: 'bg-gaming-blue/10 border-gaming-blue/20 text-gaming-blue',
      PRICE_UPDATED: 'bg-gaming-green/10 border-gaming-green/20 text-gaming-green',
      WISHLIST_ADD: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      WISHLIST_REMOVE: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      SYSTEM_START: 'bg-white/5 border-white/10 text-white/90',
      UPDATE_ERROR: 'bg-red-500/20 border-red-500/30 text-red-500 font-extrabold',
    };
    const c = configs[type] || 'bg-white/5 border-white/10 text-gaming-muted';
    return (
      <span className={`px-2 py-0.5 border text-[9px] font-black rounded-md uppercase tracking-wider ${c}`}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  const formatLogTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour12: false }) + ' - ' + date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 lg:col-span-2 bg-white/5 border border-white/5 rounded-2xl"></div>
          <div className="h-96 bg-white/5 border border-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Shield className="w-8 h-8 text-gaming-accent" />
          Admin Panel
        </h2>
        <p className="text-gaming-muted mt-1 text-sm">System management, broadcast offer notifications, and debug activity streams.</p>
      </div>

      {/* NOTIFICATION BROADCASTER & SPECIAL OFFER BUILDER */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 bg-gradient-to-b from-gaming-card to-gaming-bg">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-gaming-accent" />
            <h3 className="text-sm uppercase font-black tracking-widest text-white">Select Notification Template</h3>
          </div>
          {fetchingPrice && (
            <span className="text-xs text-gaming-accent flex items-center gap-1.5 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching live deal price...
            </span>
          )}
        </div>

        {/* Template Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {templates.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateChange(t.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                  isSelected 
                    ? 'bg-gaming-accent/20 border-gaming-accent text-white shadow-glow' 
                    : 'bg-white/[0.02] border-white/5 text-gaming-muted hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-gaming-accent' : 'text-gaming-muted'}`} />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSendBroadcast} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Choose Game */}
            <div>
              <label className="text-[10px] uppercase font-black tracking-wider text-gaming-muted block mb-1.5">
                Choose a Game (Auto-fill live deal price)
              </label>
              <select
                value={selectedGameId}
                onChange={(e) => handleGameSelect(e.target.value)}
                className="w-full bg-gaming-bg border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-gaming-accent/40"
              >
                <option value="">-- Choose tracked game --</option>
                {games.map((g) => (
                  <option key={g.cheapshark_id} value={g.cheapshark_id}>
                    {g.name} ({g.currency_symbol}{g.current_price})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-[10px] uppercase font-black tracking-wider text-gaming-muted block mb-1.5">
                Target Audience
              </label>
              <select
                value={broadcaster.target}
                onChange={(e) => setBroadcaster({ ...broadcaster, target: e.target.value })}
                className="w-full bg-gaming-bg border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-gaming-accent/40"
              >
                <option value="All Users">All Active Users</option>
                <option value="Wishlist Users">Wishlist Subscribers</option>
                <option value="Recent Buyers">Recent Buyers</option>
              </select>
            </div>
          </div>

          {/* Title / Subject */}
          <div>
            <label className="text-[10px] uppercase font-black tracking-wider text-gaming-muted block mb-1.5">
              Title / Email Subject
            </label>
            <input
              type="text"
              value={broadcaster.title}
              onChange={(e) => setBroadcaster({ ...broadcaster, title: e.target.value })}
              placeholder="e.g. 🔥 Special Offer: Just Cause 3 is 85% OFF!"
              className="w-full bg-gaming-bg border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-gaming-accent/40"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="text-[10px] uppercase font-black tracking-wider text-gaming-muted block mb-1.5">
              Message Body (Email & Main Notification)
            </label>
            <textarea
              rows={3}
              value={broadcaster.message}
              onChange={(e) => setBroadcaster({ ...broadcaster, message: e.target.value })}
              placeholder="Special offer description with pricing and platform links..."
              className="w-full bg-gaming-bg border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-gaming-accent/40 resize-none"
            />
          </div>

          {/* Push Notification Short Message */}
          <div>
            <label className="text-[10px] uppercase font-black tracking-wider text-gaming-accent block mb-1.5">
              Push Notification Short Message (Auto-Filled)
            </label>
            <input
              type="text"
              value={broadcaster.short_message}
              onChange={(e) => setBroadcaster({ ...broadcaster, short_message: e.target.value })}
              placeholder="🔥 Special Offer: Just Cause 3 is 85% OFF at ₹149! Grab it now."
              className="w-full bg-gaming-bg border border-gaming-accent/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-gaming-accent/60"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={sendingBroadcast}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gaming-accent hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all"
          >
            {sendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingBroadcast ? 'Broadcasting Notification...' : `Broadcast ${selectedTemplate} Notification`}
          </button>
        </form>
      </div>

      {/* SYSTEM LOGS & DATABASE CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Logs */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 flex flex-col h-[520px]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-gaming-accent" />
              <h3 className="text-lg font-bold text-white">System Activity Logs</h3>
            </div>
            <span className="text-[10px] text-gaming-muted font-bold bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-lg">
              Showing last {logs.length} events
            </span>
          </div>

          {/* Log Window */}
          <div className="flex-1 bg-gaming-bg/90 border border-white/5 rounded-2xl p-4.5 font-mono text-xs overflow-y-auto space-y-3 shadow-inner">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gaming-muted/40">
                <span>[No system logs logged yet]</span>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={log.id || idx} className="flex items-start gap-4 pb-2.5 border-b border-white/[0.02]">
                  <span className="text-gaming-muted/50 text-[10px] flex-shrink-0 pt-0.5">
                    [{formatLogTime(log.timestamp)}]
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {getEventBadge(log.event_type)}
                      {log.game_name && log.game_name !== 'System' && (
                        <span className="text-gaming-accent font-bold text-[10px]">{log.game_name}</span>
                      )}
                    </div>
                    <span className="text-white/80 leading-relaxed font-sans">{log.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Controls & Monitored Items */}
        <div className="space-y-6 lg:col-span-1">
          {/* Actions Box */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-5 bg-gradient-to-b from-gaming-card to-gaming-bg/40">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-gaming-blue" />
              <h3 className="text-base font-bold text-white">System Controls</h3>
            </div>

            <p className="text-xs text-gaming-muted leading-relaxed">
              Forces an immediate execution of the background scraper job. This will check current prices across all stores for each tracked game.
            </p>

            <button
              onClick={handleForceRefresh}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gaming-accent hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-glow transition-all"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {refreshing ? 'Executing Job...' : 'Force Refresh Prices'}
            </button>
          </div>

          {/* Manage Monitored Items */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col h-[280px]">
            <h3 className="text-sm font-bold text-white mb-3">Tracked Database Items ({games.length})</h3>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {games.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gaming-muted/50 border border-dashed border-white/5 rounded-xl">
                  No games tracked
                </div>
              ) : (
                games.map((g) => (
                  <div key={g.id} className="flex justify-between items-center p-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={g.thumbnail} alt="" className="w-8 h-8 rounded object-cover bg-black" />
                      <span className="text-xs font-semibold text-white/90 truncate max-w-[120px]">{g.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveGame(g.cheapshark_id, g.name)}
                      disabled={deletingId === g.cheapshark_id}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                      title="Untrack Game"
                    >
                      {deletingId === g.cheapshark_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
