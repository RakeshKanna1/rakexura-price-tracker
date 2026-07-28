import React, { useState, useEffect } from 'react';
import { Search, Tag, TrendingDown, Trophy, Sparkles, Eye, Loader2, Percent, Flame, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

const Suggestions = ({ onViewDetails, triggerToast, region }) => {
  const [activeCategory, setActiveCategory] = useState('based_on_searches');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSuggestions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/suggestions`, { params: { region } });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRotateDeals = async () => {
    setRefreshing(true);
    try {
      await axios.put(`${API_BASE}/refresh`);
      await fetchSuggestions();
      if (triggerToast) triggerToast("Rotated to a fresh set of games on sale!", "success");
    } catch (err) {
      if (triggerToast) triggerToast("Failed to rotate deals.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [region]);

  const getActiveList = () => {
    if (!data) return [];
    const currentList = data[activeCategory] || [];
    if (activeCategory === 'based_on_searches' && currentList.length === 0) {
      return data['on_sale_now'] || [];
    }
    return currentList;
  };

  const getCategoryTitle = () => {
    const titles = {
      based_on_searches: "Deals Recommended Based On Your Recent Searches",
      on_sale_now: "Top On-Sale Deals Today",
      historical_lows: "Record Lowest Prices Ever",
      deep_discounts: "Massive Discounts (70%+ Off)",
      under_bargain: "Super Cheap Bargains"
    };
    return titles[activeCategory] || "Recommendations";
  };

  const getCategoryDescription = () => {
    const desc = {
      based_on_searches: "Low-price PC game deals matching your recent search terms (e.g. Dead Space, GTA V, Vice City).",
      on_sale_now: "Active deals with major price drops available across Steam, Epic, EA, Ubisoft & GOG.",
      historical_lows: "Tracked games that are currently selling at their historical lowest recorded price ever.",
      deep_discounts: "Huge savings! Exceptional price cuts on top titles.",
      under_bargain: "Budget steals and super affordable games under local price thresholds."
    };
    return desc[activeCategory] || "";
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-gaming-accent animate-spin mb-4" />
        <p className="text-sm text-gaming-muted">Finding low price game deals based on your searches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Flame className="w-8 h-8 text-gaming-accent" />
            Games On Sale & Bargain Suggestions
          </h2>
          <p className="text-gaming-muted mt-1 text-sm">
            Daily rotating bargain deals across major PC stores, plus search history recommendations.
          </p>
        </div>
        <button
          onClick={handleRotateDeals}
          disabled={refreshing}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-gaming-accent hover:bg-gaming-accent/90 disabled:bg-gaming-accent/50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-glow hover:shadow-purple-500/20 active:scale-95 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Rotating Deals...' : 'Rotate Deals'}
        </button>
      </div>

      {/* Suggestion Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveCategory('based_on_searches')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'based_on_searches'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <Search className="w-5 h-5 mb-1.5 text-gaming-accent" />
          <span className="text-[11px] font-black uppercase tracking-wider">Based On Searches</span>
        </button>

        <button
          onClick={() => setActiveCategory('on_sale_now')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'on_sale_now'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <Tag className="w-5 h-5 mb-1.5 text-gaming-blue" />
          <span className="text-[11px] font-black uppercase tracking-wider">On Sale Deals</span>
        </button>

        <button
          onClick={() => setActiveCategory('historical_lows')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'historical_lows'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <Trophy className="w-5 h-5 mb-1.5 text-gaming-green" />
          <span className="text-[11px] font-black uppercase tracking-wider">Historical Lows</span>
        </button>

        <button
          onClick={() => setActiveCategory('deep_discounts')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'deep_discounts'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <TrendingDown className="w-5 h-5 mb-1.5 text-purple-400" />
          <span className="text-[11px] font-black uppercase tracking-wider">70%+ Off Deals</span>
        </button>

        <button
          onClick={() => setActiveCategory('under_bargain')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'under_bargain'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <Percent className="w-5 h-5 mb-1.5 text-yellow-500" />
          <span className="text-[11px] font-black uppercase tracking-wider">Cheap Bargains</span>
        </button>
      </div>

      {/* Suggested Content Panel */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 max-w-5xl">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gaming-accent" />
            {getCategoryTitle()}
          </h3>
          <p className="text-xs text-gaming-muted mt-0.5">{getCategoryDescription()}</p>
        </div>

        {getActiveList().length === 0 ? (
          <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl text-xs text-gaming-muted">
            No games currently matching this deal filter. Search for your favorite PC games above to generate custom suggestions!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {getActiveList().map((game) => {
              return (
                <div 
                  key={game.cheapshark_id} 
                  className="bg-white/[0.02] border border-white/5 hover:border-white/10 p-4.5 rounded-2xl flex flex-col justify-between group transition-all"
                >
                  <div>
                    <div className="flex gap-4">
                      <img 
                        src={game.thumbnail} 
                        alt="" 
                        className="w-12 h-12 object-cover rounded-xl bg-black border border-white/15" 
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'; }}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-gaming-accent transition-colors">{game.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black flex items-center gap-1 ${
                            game.is_official || game.store_type === 'Official Store'
                              ? 'bg-gaming-green/15 text-gaming-green border border-gaming-green/30'
                              : 'bg-gaming-blue/15 text-gaming-blue border border-gaming-blue/20'
                          }`}>
                            {game.platform} {(game.is_official || game.store_type === 'Official Store') && '✓ Official'}
                          </span>
                          {game.searched_for && (
                            <span className="text-[8.5px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-semibold truncate max-w-[100px]">
                              For "{game.searched_for}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing Comparison */}
                    <div className="bg-white/[0.01] border-y border-white/5 my-4 py-2.5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-black text-gaming-muted tracking-wider block">Lowest Price</span>
                        <span className="text-sm font-black text-gaming-green block mt-0.5">
                          {game.currency_symbol}{game.buy_price}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-black text-gaming-muted tracking-wider block">Original Price</span>
                        <span className="text-xs font-bold text-gaming-muted line-through block mt-0.5">
                          {game.currency_symbol}{game.original_price}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onViewDetails(game.cheapshark_id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white/5 hover:bg-gaming-accent/20 border border-white/5 hover:border-gaming-accent/35 rounded-xl text-white font-bold text-[10px] tracking-wider uppercase transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Low Price Graph
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Suggestions;
