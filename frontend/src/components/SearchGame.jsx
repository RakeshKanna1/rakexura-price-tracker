import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, Bell, ExternalLink, Download, TrendingDown, ArrowLeft, Gamepad2, Clock, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import axios from 'axios';
import { API_BASE } from '../config';

const REGION_RATES = {
  IN: { symbol: '₹', rate: 83.0 },
  US: { symbol: '$', rate: 1.0 },
  TR: { symbol: '₺', rate: 32.5 },
  AR: { symbol: '$', rate: 910.0 },
  BR: { symbol: 'R$', rate: 5.5 },
  EU: { symbol: '€', rate: 0.92 }
};

const SearchGame = ({ selectedGameId, setSelectedGameId, triggerToast, region }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gameDetails, setGameDetails] = useState(null);
  const [historyDays, setHistoryDays] = useState(30);
  const [historyData, setHistoryData] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [wishlistStatus, setWishlistStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Alert setup states
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [settingAlert, setSettingAlert] = useState(false);
  const [addingWishlist, setAddingWishlist] = useState(false);

  const activeRegion = REGION_RATES[region] || REGION_RATES.IN;
  const searchTimeoutRef = useRef(null);

  const fetchRecentSearches = async () => {
    try {
      const res = await axios.get(`${API_BASE}/search-history`);
      setRecentSearches(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecentSearches();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch details when game is clicked
  const handleSelectGame = async (cheapsharkId) => {
    setSelectedGameId(cheapsharkId);
    setDetailsLoading(true);
    setGameDetails(null);
    setHistoryData([]);
    setAlertTargetPrice('');
    
    try {
      const detailsRes = await axios.get(`${API_BASE}/prices/${cheapsharkId}`, { params: { region } });
      setGameDetails(detailsRes.data);
      
      const historyRes = await axios.get(`${API_BASE}/history/${cheapsharkId}`, { params: { days: 30, region } });
      setHistoryData(historyRes.data);
      
      const wishlistRes = await axios.get(`${API_BASE}/wishlist`);
      const isWishlisted = wishlistRes.data.some(g => g.cheapshark_id === cheapsharkId);
      setWishlistStatus(isWishlisted);
    } catch (err) {
      console.error(err);
      triggerToast("Error retrieving game details.", "error");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Triggered when region updates
  useEffect(() => {
    if (selectedGameId) {
      setDetailsLoading(true);
      axios.get(`${API_BASE}/prices/${selectedGameId}`, { params: { region } })
        .then(res => {
          setGameDetails(res.data);
          setDetailsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setDetailsLoading(false);
        });
        
      axios.get(`${API_BASE}/history/${selectedGameId}`, { params: { days: historyDays, region } })
        .then(res => setHistoryData(res.data))
        .catch(err => console.error(err));
    }
  }, [region]);

  // Fetch history when filter changes
  useEffect(() => {
    if (selectedGameId) {
      axios.get(`${API_BASE}/history/${selectedGameId}`, { params: { days: historyDays, region } })
        .then(res => setHistoryData(res.data))
        .catch(err => console.error(err));
    }
  }, [historyDays, selectedGameId]);

  const performSearch = async (searchTerm) => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/search`, { params: { title: searchTerm } });
      setSearchResults(res.data);
      
      // Save search term to recent history
      await axios.post(`${API_BASE}/search-history`, null, { params: { query: searchTerm } });
      fetchRecentSearches();
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Search logic
  const handleSearch = (termVal, immediate = false) => {
    let term = "";
    if (termVal && typeof termVal === 'object' && termVal.target) {
      term = termVal.target.value;
    } else if (termVal !== undefined) {
      term = termVal;
    } else {
      term = query;
    }
    
    setQuery(term);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (term.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    
    if (immediate) {
      performSearch(term);
    } else {
      setSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(term);
      }, 450);
    }
  };

  const handleSingleRefresh = async () => {
    if (!selectedGameId) return;
    setRefreshing(true);
    try {
      await axios.put(`${API_BASE}/refresh/${selectedGameId}`);
      // Re-fetch details
      const detailsRes = await axios.get(`${API_BASE}/prices/${selectedGameId}`, { params: { region } });
      setGameDetails(detailsRes.data);
      const historyRes = await axios.get(`${API_BASE}/history/${selectedGameId}`, { params: { days: historyDays, region } });
      setHistoryData(historyRes.data);
      
      triggerToast("Store prices refreshed successfully!", "success");
    } catch (err) {
      triggerToast("Failed to refresh store prices.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!gameDetails) return;
    setAddingWishlist(true);
    try {
      await axios.post(`${API_BASE}/wishlist`, {
        cheapshark_id: gameDetails.cheapshark_id,
        name: gameDetails.name,
        thumbnail: gameDetails.thumbnail
      });
      setWishlistStatus(true);
      triggerToast(`Added '${gameDetails.name}' to wishlist inventory!`, "success");
    } catch (err) {
      triggerToast("Failed to wishlist game.", "error");
    } finally {
      setAddingWishlist(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!gameDetails || !alertTargetPrice) return;
    
    setSettingAlert(true);
    try {
      await axios.post(`${API_BASE}/alerts`, {
        cheapshark_id: gameDetails.cheapshark_id,
        game_name: gameDetails.name,
        target_price: parseFloat(alertTargetPrice)
      });
      triggerToast(`Price alert established for ${activeRegion.symbol}${alertTargetPrice}!`, "success");
      setAlertTargetPrice('');
    } catch (err) {
      triggerToast("Failed to set alert threshold.", "error");
    } finally {
      setSettingAlert(false);
    }
  };

  // Calculate Price Spread Difference
  const calculatePriceSpread = () => {
    if (!gameDetails || !gameDetails.platform_prices || gameDetails.platform_prices.length < 2) return null;
    const prices = gameDetails.platform_prices.map(p => p.current_price);
    const highest = Math.max(...prices);
    const lowest = Math.min(...prices);
    return roundToTwo(highest - lowest);
  };

  const roundToTwo = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const renderChart = () => {
    if (historyData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
          <span className="text-xs text-gaming-muted">Plotting price trend...</span>
        </div>
      );
    }

    return (
      <div className="w-full h-64 bg-gaming-bg/30 border border-white/5 p-4 rounded-xl mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
            <XAxis dataKey="date" stroke="#a0a8c0" fontSize={10} tickLine={false} />
            <YAxis 
              stroke="#a0a8c0" 
              fontSize={10} 
              tickFormatter={(v) => `${activeRegion.symbol}${v}`} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#11131a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
              labelStyle={{ color: '#a0a8c0', fontSize: '10px' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
              formatter={(value) => [`${activeRegion.symbol}${value}`, 'Price']}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#8b5cf6" 
              strokeWidth={3} 
              dot={{ fill: '#8b5cf6', r: 3 }} 
              activeDot={{ r: 5 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!selectedGameId ? (
        // Search View
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <img 
              src="/rakexura_logo.png" 
              alt="Rakexura Logo" 
              className="w-12 h-12 object-cover rounded-xl shadow-glow border border-gaming-accent/20"
            />
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">Rakexura Tracker</h2>
              <p className="text-gaming-muted mt-1 text-sm">Compare real-time prices across major digital stores.</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5.5 h-5.5 text-gaming-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(query, true);
                }
              }}
              placeholder="Search GTA V, Red Dead Redemption 2, Ghost of Tsushima..."
              className="w-full bg-gaming-card border border-white/5 rounded-2xl pl-13 pr-6 py-4 text-white font-medium placeholder-gaming-muted/60 focus:outline-none focus:border-gaming-accent/40 focus:ring-1 focus:ring-gaming-accent/25 transition-all shadow-lg"
            />
            {searching && (
              <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-5.5 h-5.5 text-gaming-accent animate-spin" />
            )}
          </div>

          {/* Recent Searches History */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider mr-2">Recent searches:</span>
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(term, true)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-white font-bold rounded-lg transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {/* Results Grid */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {searchResults.map((game) => (
                <div
                  key={game.cheapshark_id}
                  onClick={() => handleSelectGame(game.cheapshark_id)}
                  className="glass-panel glass-panel-hover p-4 rounded-2xl cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/5">
                      <img
                        src={game.thumbnail}
                        alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300'; }}
                      />
                    </div>
                    <h3 className="text-sm font-bold text-white mt-4 group-hover:text-gaming-accent transition-colors line-clamp-1">
                      {game.name}
                    </h3>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                    <span className="text-[9px] text-gaming-muted font-bold uppercase tracking-wider">Starts From</span>
                    <span className="text-sm font-black text-gaming-green">
                      {activeRegion.symbol}{Math.round((game.cheapest_price || 0) * activeRegion.rate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            query.trim().length >= 2 && !searching && (
              <div className="py-20 text-center glass-panel rounded-2xl border-dashed border-white/5">
                <Gamepad2 className="w-12 h-12 text-gaming-muted mx-auto mb-4" />
                <h3 className="text-base font-bold text-white">No game found</h3>
                <p className="text-xs text-gaming-muted mt-1">Try double checking the title or spelling.</p>
              </div>
            )
          )}
        </div>
      ) : (
        // Detailed Page View
        <div className="space-y-6 animate-fade-in">
          {/* Back Action */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setSelectedGameId(null)}
              className="flex items-center gap-2 text-gaming-muted hover:text-white font-semibold text-sm transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to search
            </button>
            
            {gameDetails && (
              <button
                onClick={handleSingleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Prices'}
              </button>
            )}
          </div>

          {detailsLoading || !gameDetails ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-gaming-accent animate-spin mb-4" />
              <p className="text-sm text-gaming-muted">Fetching regional store updates...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Game Profile Columns */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Banner & Bio */}
                <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 relative">
                  <div className="h-40 bg-gradient-to-r from-gaming-accent/20 to-gaming-blue/20 relative">
                    <img 
                      src={gameDetails.banner} 
                      alt="" 
                      className="w-full h-full object-cover opacity-20 filter blur-sm scale-110" 
                      onError={(e) => { e.target.src = ''; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gaming-card via-gaming-card/60 to-transparent" />
                  </div>
                  
                  <div className="p-6 -mt-16 flex flex-col sm:flex-row gap-5 relative z-10">
                    <img
                      src={gameDetails.thumbnail}
                      alt={gameDetails.name}
                      className="w-24 h-24 object-cover rounded-xl bg-black border border-white/10 shadow-glow flex-shrink-0"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'; }}
                    />
                    <div className="flex-1 flex flex-col justify-end">
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        {gameDetails.name}
                      </h2>
                      <p className="text-xs text-gaming-muted mt-2 leading-relaxed max-w-xl">
                        {gameDetails.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-gaming-green" />
                      <span className="text-xs text-gaming-muted font-bold">
                        Lowest Ever: <span className="text-gaming-green">{gameDetails.currency_symbol}{gameDetails.cheapest_ever}</span>
                      </span>
                    </div>

                    <button
                      onClick={handleAddToWishlist}
                      disabled={wishlistStatus || addingWishlist}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        wishlistStatus
                          ? 'bg-gaming-green/10 border border-gaming-green/20 text-gaming-green cursor-default'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white active:scale-95'
                      }`}
                    >
                      {addingWishlist ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Heart className={`w-3.5 h-3.5 ${wishlistStatus ? 'fill-current' : ''}`} />
                      )}
                      {wishlistStatus ? 'Monitored in Wishlist' : 'Add to Wishlist'}
                    </button>
                  </div>
                </div>

                {/* Historical Price Statistics Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider">Historical Low</span>
                    <h4 className="text-lg font-black text-gaming-green mt-1">
                      {gameDetails.currency_symbol}{gameDetails.hist_lowest}
                    </h4>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider">Historical High</span>
                    <h4 className="text-lg font-black text-red-500 mt-1">
                      {gameDetails.currency_symbol}{gameDetails.hist_highest}
                    </h4>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider">Average Price</span>
                    <h4 className="text-lg font-black text-gaming-blue mt-1">
                      {gameDetails.currency_symbol}{gameDetails.hist_average}
                    </h4>
                  </div>
                </div>

                {/* Price Difference Spread Alert Banner */}
                {calculatePriceSpread() > 0 && (
                  <div className="bg-gaming-accent/10 border border-gaming-accent/25 px-5 py-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-extrabold text-gaming-accent tracking-wider">Reseller Arbitrage Spread</span>
                      <p className="text-sm font-bold text-white mt-0.5">
                        Lowest deal is cheaper than highest store listing.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gaming-muted">Difference Savings</span>
                      <h4 className="text-lg font-black text-gaming-green">
                        +{gameDetails.currency_symbol}{calculatePriceSpread()} Saved!
                      </h4>
                    </div>
                  </div>
                )}

                {/* Best Buying Platform Recommendation Card */}
                {gameDetails.best_buy_recommendation && (
                  <div className={`p-6 rounded-3xl border ${
                    gameDetails.best_buy_recommendation.color === 'green'
                      ? 'bg-gaming-green/10 border-gaming-green/20'
                      : 'bg-yellow-500/10 border-yellow-500/20'
                  } relative overflow-hidden`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                          gameDetails.best_buy_recommendation.color === 'green'
                            ? 'bg-gaming-green/20 border-gaming-green/30 text-gaming-green'
                            : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500'
                        }`}>
                          {gameDetails.best_buy_recommendation.badge} Recommendation
                        </span>
                        
                        <h4 className="text-base font-black text-white mt-3">
                          Buy from {gameDetails.best_buy_recommendation.platform} ({gameDetails.best_buy_recommendation.region_name})
                        </h4>
                        
                        <p className="text-xs text-gaming-muted mt-2 leading-relaxed">
                          {gameDetails.best_buy_recommendation.recommendation}
                        </p>
                      </div>

                      <div className="text-right sm:text-right flex-shrink-0">
                        <span className="text-[10px] uppercase font-black text-gaming-muted tracking-wider block">Cheapest Cost</span>
                        <h3 className="text-2xl font-black text-white mt-1">
                          {gameDetails.currency_symbol}{gameDetails.best_buy_recommendation.price}
                        </h3>
                        <span className="text-[9px] text-gaming-muted font-bold block mt-1">
                          Historical Low: {gameDetails.currency_symbol}{gameDetails.best_buy_recommendation.lowest_ever}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Comparison Table */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4">Price Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-gaming-muted tracking-wider pb-3">
                          <th className="pb-3.5">Platform</th>
                          <th className="pb-3.5">Reliability</th>
                          <th className="pb-3.5 text-right">Current Price</th>
                          <th className="pb-3.5 text-right">Discount</th>
                          <th className="pb-3.5 text-right">Original</th>
                          <th className="pb-3.5 text-center">Deal Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {gameDetails.platform_prices.map((store, index) => {
                          const isLowest = index === 0;
                          const isOfficial = store.type === 'Official Store';
                          return (
                            <tr key={store.store_id || index} className="group hover:bg-white/[0.01]">
                              <td className="py-3.5 flex items-center gap-2.5">
                                <span className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">
                                  {store.platform}
                                </span>
                                {isLowest && (
                                  <span className="px-2 py-0.5 bg-gaming-green/15 text-gaming-green text-[9px] font-black rounded-md flex items-center gap-0.5 uppercase tracking-wide">
                                    🏆 Lowest Price
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  isOfficial 
                                    ? 'bg-gaming-accent/15 text-gaming-accent border border-gaming-accent/20' 
                                    : 'bg-white/[0.04] text-gaming-muted border border-white/[0.05]'
                                }`}>
                                  {store.type}
                                </span>
                              </td>
                              <td className="py-3.5 text-right font-black text-sm text-white">
                                {gameDetails.currency_symbol}{store.current_price}
                              </td>
                              <td className="py-3.5 text-right font-bold text-xs text-gaming-green">
                                {store.discount_percent > 0 ? `-${Math.round(store.discount_percent)}%` : '0%'}
                              </td>
                              <td className="py-3.5 text-right text-xs text-gaming-muted line-through">
                                {gameDetails.currency_symbol}{store.original_price}
                              </td>
                              <td className="py-3.5 text-center">
                                <a
                                  href={store.store_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-gaming-accent/25 border border-white/5 hover:border-gaming-accent/40 rounded-lg text-white font-bold text-[10px] transition-all group-hover:scale-105"
                                >
                                  Buy Store
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Price History Section */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Price History</h3>
                      <p className="text-xs text-gaming-muted mt-0.5">Historical price trend logs.</p>
                    </div>
                    {/* Filters */}
                    <div className="flex gap-1 bg-gaming-bg/60 p-1 border border-white/5 rounded-xl">
                      {[7, 30, 90].map((days) => (
                        <button
                          key={days}
                          onClick={() => setHistoryDays(days)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            historyDays === days
                              ? 'bg-gaming-accent text-white shadow-glow'
                              : 'text-gaming-muted hover:text-white'
                          }`}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  {renderChart()}

                  {/* Export CSV Utility */}
                  <div className="flex justify-end mt-4">
                    <a
                      href={`${API_BASE}/export/${gameDetails.cheapshark_id}?region=${region}`}
                      className="flex items-center gap-1.5 text-xs text-gaming-blue hover:underline font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Price History to CSV ({gameDetails.currency_code})
                    </a>
                  </div>
                </div>
              </div>

              {/* Alert Setup Columns */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Alert Setup Box */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between h-fit relative overflow-hidden bg-gradient-to-b from-gaming-card to-gaming-bg/40">
                  <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-[0.02]">
                    <Bell className="w-32 h-32 text-gaming-accent" />
                  </div>
                  <div>
                    <span className="p-2.5 bg-gaming-accent/15 border border-gaming-accent/25 rounded-2xl w-fit flex items-center justify-center text-gaming-accent">
                      <Bell className="w-5 h-5" />
                    </span>
                    <h3 className="text-lg font-bold text-white mt-4">Set Price Alert</h3>
                    <p className="text-xs text-gaming-muted mt-1 leading-relaxed">
                      We'll save this target to MongoDB and notify you when the cheapest price drops below it.
                    </p>
                  </div>

                  <form onSubmit={handleCreateAlert} className="mt-6 space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gaming-muted tracking-wider block mb-2">
                        Target Price (₹ INR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-sm text-gaming-muted">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={alertTargetPrice}
                          onChange={(e) => setAlertTargetPrice(e.target.value)}
                          placeholder="e.g. 600"
                          className="w-full bg-gaming-bg border border-white/5 rounded-xl pl-8.5 pr-4 py-3 text-sm font-extrabold text-white placeholder-gaming-muted/40 focus:outline-none focus:border-gaming-accent/40"
                          required
                          min="1"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={settingAlert}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-gaming-accent to-gaming-blue hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-glow transition-all"
                    >
                      {settingAlert ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      Set Price Alert
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchGame;
