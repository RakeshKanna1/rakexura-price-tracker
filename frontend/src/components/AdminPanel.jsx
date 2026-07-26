import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Terminal, AlertTriangle, Info, Trash2, Database, Loader2, RefreshCw as LoopIcon } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

const AdminPanel = ({ triggerToast }) => {
  const [logs, setLogs] = useState([]);
  const [games, setGames] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAdminData = async () => {
    try {
      const logsRes = await axios.get(`${API_BASE}/logs`);
      setLogs(logsRes.data);

      const gamesRes = await axios.get(`${API_BASE}/wishlist`);
      setGames(gamesRes.data);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching admin panel data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await axios.put(`${API_BASE}/refresh`);
      triggerToast(res.data.message || "Manual check complete!", "success");
      await fetchAdminData(); // reload log list
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
      await fetchAdminData(); // reload log list
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Shield className="w-8 h-8 text-gaming-accent" />
          Admin Panel
        </h2>
        <p className="text-gaming-muted mt-1 text-sm">System management, forced background runs, and debug database streams.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Logs (Terminal Stream style) */}
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

        {/* Right Column: Database Health & Actions */}
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
