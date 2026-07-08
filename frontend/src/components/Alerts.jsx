import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Calendar, Loader2, CheckCircle2, Clock } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';
const CURRENCY_CONVERSION_RATE = 83;

const Alerts = ({ triggerToast }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/alerts`);
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to load price alerts.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDelete = async (alertId, gameName) => {
    setDeletingId(alertId);
    try {
      await axios.delete(`${API_BASE}/alerts/${alertId}`);
      setAlerts(alerts.filter(a => a.id !== alertId));
      triggerToast(`Alert for '${gameName}' successfully removed.`, "success");
    } catch (err) {
      triggerToast("Failed to delete alert.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Price Alerts</h2>
        <p className="text-gaming-muted mt-1 text-sm">Target price notifications stored in MongoDB Atlas.</p>
      </div>

      {alerts.length === 0 ? (
        <div className="py-24 text-center glass-panel rounded-2xl border-dashed border-white/5 max-w-4xl">
          <Bell className="w-12 h-12 text-gaming-muted mx-auto mb-4" />
          <h3 className="text-base font-bold text-white">No active price alerts</h3>
          <p className="text-xs text-gaming-muted mt-1">Set targets on individual game pages to monitor drop thresholds.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden max-w-5xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-gaming-muted tracking-wider pb-3">
                  <th className="p-5">Game</th>
                  <th className="p-5 text-right">Target Price</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Created At / Triggered At</th>
                  <th className="p-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {alerts.map((alert) => {
                  const targetINR = Math.round(alert.target_price);
                  return (
                    <tr key={alert.id} className="group hover:bg-white/[0.01]">
                      <td className="p-5">
                        <span className="font-bold text-sm text-white group-hover:text-gaming-accent transition-colors">
                          {alert.game_name}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <span className="font-black text-sm text-white">₹{targetINR}</span>
                      </td>
                      <td className="p-5">
                        {alert.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gaming-blue/15 text-gaming-blue text-[10px] font-bold rounded-lg uppercase tracking-wide">
                            <Clock className="w-3 h-3" />
                            Watching
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gaming-green/15 text-gaming-green text-[10px] font-bold rounded-lg uppercase tracking-wide">
                            <CheckCircle2 className="w-3 h-3" />
                            Triggered
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-xs text-gaming-muted">
                        <div className="flex flex-col gap-0.5">
                          <span>Set: {formatDate(alert.created_at)}</span>
                          {alert.triggered_at && (
                            <span className="text-gaming-green font-semibold">
                              Hit: {formatDate(alert.triggered_at)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleDelete(alert.id, alert.game_name)}
                          disabled={deletingId === alert.id}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-xl transition-all"
                        >
                          {deletingId === alert.id ? (
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

export default Alerts;
