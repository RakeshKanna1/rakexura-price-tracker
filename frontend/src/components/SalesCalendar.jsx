import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

const SalesCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timers, setTimers] = useState({});

  const fetchCalendar = async () => {
    try {
      const res = await axios.get(`${API_BASE}/calendar`);
      setEvents(res.data);
      
      // Initialize timers state
      const initialTimers = {};
      res.data.forEach(e => {
        initialTimers[e.name] = e.seconds_remaining;
      });
      setTimers(initialTimers);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  // Set up countdown intervals ticking every second
  useEffect(() => {
    const hasTimers = Object.keys(timers).length > 0;
    if (!hasTimers) return;

    const interval = setInterval(() => {
      setTimers(prev => {
        const nextTimers = { ...prev };
        let changed = false;
        Object.keys(nextTimers).forEach(key => {
          if (nextTimers[key] > 0) {
            nextTimers[key] -= 1;
            changed = true;
          }
        });
        return changed ? nextTimers : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [Object.keys(timers).length > 0]);

  const getCountdownParts = (totalSeconds) => {
    if (totalSeconds <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    return { days, hours, minutes, seconds };
  };

  const getPlatformClass = (platform) => {
    const maps = {
      Steam: 'bg-gaming-accent/15 border-gaming-accent/25 text-gaming-accent',
      'Epic Games': 'bg-gaming-green/15 border-gaming-green/25 text-gaming-green',
      'EA App': 'bg-gaming-blue/15 border-gaming-blue/25 text-gaming-blue',
      'Ubisoft Store': 'bg-yellow-500/15 border-yellow-500/25 text-yellow-500'
    };
    return maps[platform] || 'bg-white/5 border-white/10 text-white';
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-gaming-accent animate-spin mb-4" />
        <p className="text-sm text-gaming-muted">Loading sale calendars...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Calendar className="w-8 h-8 text-gaming-accent" />
          Publisher Sales Calendar
        </h2>
        <p className="text-gaming-muted mt-1 text-sm">
          Track upcoming digital storefront major campaigns to pre-plan inventory purchases at lowest pricing.
        </p>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {events.map((event) => {
          const seconds = timers[event.name] || 0;
          const clock = getCountdownParts(seconds);
          const isSoon = clock.days < 10;
          
          return (
            <div 
              key={event.name} 
              className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between h-fit relative overflow-hidden bg-gradient-to-b from-gaming-card to-gaming-bg/40 ${
                isSoon ? 'border-gaming-accent/20 pulse-glow-violet' : 'border-white/5'
              }`}
            >
              {/* Alert Badge if starting very soon */}
              {isSoon && (
                <div className="absolute top-0 right-0 bg-gaming-accent text-white text-[8px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Starting Soon
                </div>
              )}

              <div>
                <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase border ${getPlatformClass(event.platform)}`}>
                  {event.platform}
                </span>
                
                <h3 className="text-lg font-black text-white mt-3.5 tracking-wide uppercase">
                  {event.name}
                </h3>
                <p className="text-gaming-muted text-[10px] mt-1 font-bold">
                  Starts: {new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Ticking Clock */}
              <div className="grid grid-cols-4 gap-2 my-6">
                <div className="flex flex-col items-center p-2.5 bg-gaming-bg/85 border border-white/5 rounded-xl">
                  <span className="text-xl font-black text-white tracking-tight">{String(clock.days).padStart(2, '0')}</span>
                  <span className="text-[8px] uppercase tracking-wider text-gaming-muted font-bold mt-0.5">Days</span>
                </div>
                <div className="flex flex-col items-center p-2.5 bg-gaming-bg/85 border border-white/5 rounded-xl">
                  <span className="text-xl font-black text-white tracking-tight">{String(clock.hours).padStart(2, '0')}</span>
                  <span className="text-[8px] uppercase tracking-wider text-gaming-muted font-bold mt-0.5">Hours</span>
                </div>
                <div className="flex flex-col items-center p-2.5 bg-gaming-bg/85 border border-white/5 rounded-xl">
                  <span className="text-xl font-black text-white tracking-tight">{String(clock.minutes).padStart(2, '0')}</span>
                  <span className="text-[8px] uppercase tracking-wider text-gaming-muted font-bold mt-0.5">Mins</span>
                </div>
                <div className="flex flex-col items-center p-2.5 bg-gaming-bg/85 border border-white/5 rounded-xl">
                  <span className="text-xl font-black text-gaming-accent tracking-tight">{String(clock.seconds).padStart(2, '0')}</span>
                  <span className="text-[8px] uppercase tracking-wider text-gaming-muted font-bold mt-0.5">Secs</span>
                </div>
              </div>

              {/* Action Suggestion */}
              <div className="text-[10px] text-gaming-muted/80 leading-normal flex items-start gap-1.5 pt-3.5 border-t border-white/5">
                <AlertTriangle className="w-3.5 h-3.5 text-gaming-accent flex-shrink-0" />
                <span>
                  {isSoon 
                    ? "Prepare liquidity immediately. Add targeted titles to price alerts list." 
                    : "Tracked publisher campaign is logged. Sync check operations scheduled."
                  }
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesCalendar;
