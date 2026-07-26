import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingDown, Bell, Clock, RefreshCw, ArrowRight, Flame, Coins, TrendingUp, Database, ShoppingBag } from 'lucide-react';
import axios from 'axios';
import { API_BASE, cacheGet, cacheSet } from '../config';

const Dashboard = ({ setActiveTab, triggerToast, region }) => {
  const [stats, setStats] = useState({
    total_tracked: 0,
    lowest_prices_today: 0,
    active_alerts: 0,
    last_update_time: null,
    top_discounts: [],
    biggest_discount_today: { name: 'None', discount_percent: 0.0, thumbnail: '' },
    currency_symbol: '₹',
    total_revenue: 0,
    total_profit: 0,
    total_stock_value: 0,
    total_sales: 0
  });
  
  const [trending, setTrending] = useState([]);
  const [countdown, setCountdown] = useState({
    sale_name: 'Steam Sale',
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const statsRes = await axios.get(`${API_BASE}/stats`, { params: { region } });
      const countdownRes = await axios.get(`${API_BASE}/countdown`);
      const trendingRes = await axios.get(`${API_BASE}/trending`);
      
      setStats(statsRes.data);
      setTrending(trendingRes.data);
      calculateCountdown(countdownRes.data.seconds_remaining, countdownRes.data.sale_name);
      
      // Cache the result
      cacheSet(`dashboard_${region}`, {
        stats: statsRes.data,
        countdown: countdownRes.data,
        trending: trendingRes.data
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setLoading(false);
    }
  };

  const calculateCountdown = (totalSeconds, name) => {
    if (totalSeconds <= 0) return;
    
    let currentSecs = totalSeconds;
    const updateTimer = () => {
      if (currentSecs <= 0) return;
      
      const days = Math.floor(currentSecs / (3600 * 24));
      const hours = Math.floor((currentSecs % (3600 * 24)) / 3600);
      const minutes = Math.floor((currentSecs % 3600) / 60);
      const seconds = Math.floor(currentSecs % 60);
      
      setCountdown({
        sale_name: name,
        days,
        hours,
        minutes,
        seconds
      });
      currentSecs -= 1;
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return interval;
  };

  useEffect(() => {
    const cached = cacheGet(`dashboard_${region}`);
    if (cached) {
      setStats(cached.stats);
      setTrending(cached.trending);
      calculateCountdown(cached.countdown.seconds_remaining, cached.countdown.sale_name);
      setLoading(false);
      fetchDashboardData(true); // background refresh
    } else {
      fetchDashboardData(false);
    }
  }, [region]);

  // Periodic countdown updates
  useEffect(() => {
    let intervalId = null;
    let active = true;
    if (stats.last_update_time) {
      axios.get(`${API_BASE}/countdown`).then(res => {
        if (!active) return;
        intervalId = calculateCountdown(res.data.seconds_remaining, res.data.sale_name);
      });
    }
    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [stats.last_update_time]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.put(`${API_BASE}/refresh`);
      await fetchDashboardData();
      triggerToast("Prices successfully checked and updated!", "success");
    } catch (err) {
      triggerToast("Failed to refresh prices.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const formatLastChecked = (timeString) => {
    if (!timeString) return 'Never';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-white/10 rounded w-1/4"></div>
          <div className="h-10 bg-white/10 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 border border-white/5 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Rakexura Tracker</h2>
          <p className="text-gaming-muted mt-1 text-sm">Real-time PC game bargain & price tracking engine.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-gaming-accent hover:bg-gaming-accent/90 disabled:bg-gaming-accent/50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-glow hover:shadow-purple-500/20 active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Bulk Refresh'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="space-y-6">
        <div>
          <h4 className="text-[10px] uppercase font-black tracking-widest text-gaming-muted mb-3">Wishlist & Alerts Summary</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Metric 1: Tracked */}
            <div 
              onClick={() => setActiveTab('wishlist')}
              className="glass-panel glass-panel-hover p-6 rounded-2xl relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <LayoutDashboard className="w-32 h-32 text-white" />
              </div>
              <div className="p-3 bg-gaming-accent/10 border border-gaming-accent/20 w-fit rounded-xl text-gaming-accent mb-4">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gaming-muted">Tracked Games</p>
              <h3 className="text-3xl font-extrabold text-white mt-1.5 group-hover:text-gaming-accent transition-colors">{stats.total_tracked}</h3>
            </div>

            {/* Metric 2: Price Drops / Deals Found */}
            <div 
              onClick={() => setActiveTab('suggestions')}
              className="glass-panel glass-panel-hover p-6 rounded-2xl relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <TrendingDown className="w-32 h-32 text-white" />
              </div>
              <div className="p-3 bg-gaming-green/10 border border-gaming-green/20 w-fit rounded-xl text-gaming-green mb-4">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gaming-muted">Deals Found Today</p>
              <div className="flex items-baseline justify-between mt-1.5">
                <h3 className="text-3xl font-extrabold text-white group-hover:text-gaming-green transition-colors">{stats.lowest_prices_today}</h3>
                <span className="text-[10px] text-gaming-green font-bold uppercase tracking-wider group-hover:underline">View Deals &rarr;</span>
              </div>
            </div>

            {/* Metric 3: Active Alerts */}
            <div 
              onClick={() => setActiveTab('alerts')}
              className="glass-panel glass-panel-hover p-6 rounded-2xl relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <Bell className="w-32 h-32 text-white" />
              </div>
              <div className="p-3 bg-gaming-blue/10 border border-gaming-blue/20 w-fit rounded-xl text-gaming-blue mb-4">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gaming-muted">Active Price Alerts</p>
              <h3 className="text-3xl font-extrabold text-white mt-1.5 group-hover:text-gaming-blue transition-colors">{stats.active_alerts}</h3>
            </div>

            {/* Metric 4: Last Checked */}
            <div 
              onClick={handleRefresh}
              className="glass-panel glass-panel-hover p-6 rounded-2xl relative overflow-hidden group cursor-pointer"
              title="Click to check for price updates"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <Clock className="w-32 h-32 text-white" />
              </div>
              <div className="p-3 bg-white/[0.04] border border-white/[0.08] w-fit rounded-xl text-gaming-muted mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gaming-muted">Last Update Check</p>
              <h3 className="text-base font-extrabold text-white mt-3 truncate">{formatLastChecked(stats.last_update_time)}</h3>
            </div>
          </div>
        </div>      </div>

      {/* Main Grid: Sale Countdown & Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steam Sale Countdown Card */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl flex flex-col justify-between border border-white/5 relative overflow-hidden bg-gradient-to-b from-gaming-card to-gaming-bg/60">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Clock className="w-24 h-24 text-gaming-accent" />
          </div>
          <div>
            <span className="px-3 py-1 bg-gaming-accent/25 border border-gaming-accent/40 rounded-full text-[10px] font-bold text-gaming-accent uppercase tracking-widest">
              Upcoming Event
            </span>
            <h3 className="text-lg font-black text-white mt-4 tracking-wide uppercase">
              {countdown.sale_name}
            </h3>
            <p className="text-gaming-muted text-xs mt-1 leading-relaxed">
              Get ready for heavy discounts! Check the timer below to see when the next major sale starts.
            </p>
          </div>

          {/* Countdown Clock Display */}
          <div className="grid grid-cols-4 gap-2 my-6">
            <div className="flex flex-col items-center p-2 bg-gaming-bg/80 border border-white/5 rounded-xl">
              <span className="text-xl font-black text-white tracking-tight">{String(countdown.days).padStart(2, '0')}</span>
              <span className="text-[8px] uppercase tracking-wider text-gaming-muted font-bold mt-0.5">Days</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-gaming-bg/80 border border-white/5 rounded-xl">
              <span className="text-xl font-black text-white tracking-tight">{String(countdown.hours).padStart(2, '0')}</span>
              <span className="text-[8px] uppercase tracking-wider text-gaming-muted font-bold mt-0.5">Hours</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-gaming-bg/80 border border-white/5 rounded-xl">
              <span className="text-xl font-black text-white tracking-tight">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="text-[8px] uppercase tracking-wider text-gaming-muted font-bold mt-0.5">Mins</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-gaming-bg/80 border border-white/5 rounded-xl">
              <span className="text-xl font-black text-gaming-accent tracking-tight">{String(countdown.seconds).padStart(2, '0')}</span>
              <span className="text-[8px] uppercase tracking-wider text-gaming-muted font-bold mt-0.5">Secs</span>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('search')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all duration-300"
          >
            Search games to buy
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top Discounts Card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-lg font-bold text-white">Top Wishlist Discounts</h3>
              <p className="text-xs text-gaming-muted mt-0.5">Games on your wishlist with the highest active markdowns.</p>
            </div>
            <button 
              onClick={() => setActiveTab('wishlist')}
              className="text-gaming-accent hover:text-gaming-accent/80 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              View Wishlist
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List items */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[280px] pr-1">
            {stats.top_discounts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 bg-white/[0.01] border border-dashed border-white/5 rounded-xl text-center">
                <p className="text-sm text-gaming-muted font-medium">No tracked games currently have deals.</p>
                <p className="text-xs text-gaming-muted/50 mt-1">Add games in the Search menu or force price refresh.</p>
              </div>
            ) : (
              stats.top_discounts.map((game, idx) => (
                <div 
                  key={game.cheapshark_id || idx}
                  className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={game.thumbnail} 
                      alt={game.name} 
                      className="w-12 h-12 object-cover rounded-lg bg-black border border-white/10"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'; }}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-gaming-accent transition-colors truncate max-w-[180px] sm:max-w-xs">
                        {game.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] bg-gaming-blue/15 text-gaming-blue font-bold px-1.5 py-0.5 rounded">
                          {game.platform}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Prices */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-gaming-muted line-through">
                          {stats.currency_symbol}{game.original_price}
                        </span>
                        <span className="text-sm font-black text-gaming-green">
                          {stats.currency_symbol}{game.current_price}
                        </span>
                      </div>
                      <span className="text-[9px] text-gaming-muted font-semibold">cheapest deal</span>
                    </div>

                    {/* Discount Badge */}
                    <span className="px-2 py-1 bg-gaming-green/20 border border-gaming-green/30 text-gaming-green text-xs font-black rounded-lg">
                      -{Math.round(game.discount_percent)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Biggest Discount & Trending Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biggest Discount Today */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-gaming-green" />
              Biggest Saving Today
            </h3>
            <p className="text-xs text-gaming-muted mt-0.5">The game with the deepest price cut in your tracked vault.</p>
          </div>

          {stats.biggest_discount_today && stats.biggest_discount_today.name !== 'None' ? (
            <div className="my-6 flex items-center gap-4 bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
              <img 
                src={stats.biggest_discount_today.thumbnail} 
                alt={stats.biggest_discount_today.name} 
                className="w-16 h-16 object-cover rounded-lg bg-black border border-white/10"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'; }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-white truncate">{stats.biggest_discount_today.name}</h4>
                <div className="flex items-center gap-2.5 mt-2">
                  <span className="text-xs bg-gaming-green/20 border border-gaming-green/35 text-gaming-green px-2 py-0.5 rounded-lg font-extrabold">
                    -{Math.round(stats.biggest_discount_today.discount_percent)}% OFF
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-8 py-6 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
              <span className="text-xs text-gaming-muted">No discounts recorded today.</span>
            </div>
          )}

          <button 
            onClick={() => setActiveTab('wishlist')}
            className="w-full py-3 bg-gaming-green/10 hover:bg-gaming-green/20 border border-gaming-green/20 hover:border-gaming-green/35 rounded-xl text-gaming-green font-bold text-xs uppercase tracking-wider transition-all"
          >
            Check reseller profit
          </button>
        </div>

        {/* Trending Searches */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-gaming-accent" />
              Trending Game Searches
            </h3>
            <p className="text-xs text-gaming-muted mt-0.5">Most viewed games tracked by the Rakexura system.</p>
          </div>

          <div className="my-6 space-y-3">
            {trending.length === 0 ? (
              <div className="py-6 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-xl text-xs text-gaming-muted">
                No search history logged yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trending.map((game, idx) => (
                  <div 
                    key={game.cheapshark_id || idx}
                    className="flex items-center gap-3.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
                    onClick={() => {
                      setActiveTab('search');
                    }}
                  >
                    <img 
                      src={game.thumbnail} 
                      alt={game.name} 
                      className="w-10 h-10 object-cover rounded-lg bg-black border border-white/10"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=100'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{game.name}</h4>
                      <p className="text-[9px] text-gaming-muted mt-0.5 font-semibold">
                        Searched {game.search_count} times
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[10px] text-gaming-muted font-bold uppercase tracking-wider text-right border-t border-white/5 pt-3">
            * Trending metrics sync automatically on every game details inspection.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
