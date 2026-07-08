import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingDown, DollarSign, Percent, AlertTriangle, Eye, Loader2, Sparkles, Trophy } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

const Suggestions = ({ onViewDetails, region }) => {
  const [activeCategory, setActiveCategory] = useState('historical_lows');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchSuggestions();
  }, [region]);

  const getActiveList = () => {
    if (!data) return [];
    return data[activeCategory] || [];
  };

  const getCategoryTitle = () => {
    const titles = {
      historical_lows: "Historical Low Targets",
      deep_discounts: "Deep Discounts (75%+ Off)",
      best_resale: "High Reselling Margins",
      price_risk: "Publisher Deal Resets Warning"
    };
    return titles[activeCategory] || "Recommendations";
  };

  const getCategoryDescription = () => {
    const desc = {
      historical_lows: "Tracked games that are currently selling at their historical lowest recorded price. Ideal buying windows.",
      deep_discounts: "Massive savings. Compare reseller catalogs to pick up high-demand keys before discounts expire.",
      best_resale: "Calculated based on your custom Sell Prices vs Cheapest Buys. Top margin percentages.",
      price_risk: "Games with 50%+ discounts. Buying keys now prevents purchasing at standard retail costs later."
    };
    return desc[activeCategory] || "";
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-gaming-accent animate-spin mb-4" />
        <p className="text-sm text-gaming-muted">Running recommendation checks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Lightbulb className="w-8 h-8 text-gaming-accent" />
          BI Suggestions Engine
        </h2>
        <p className="text-gaming-muted mt-1 text-sm">
          Automated analysis maps the best buying opportunities and maximizes margin planning.
        </p>
      </div>

      {/* Suggestion Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveCategory('historical_lows')}
          className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'historical_lows'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <Trophy className="w-6 h-6 mb-2 text-gaming-green" />
          <span className="text-xs font-black uppercase tracking-wider">Historical Lows</span>
        </button>

        <button
          onClick={() => setActiveCategory('deep_discounts')}
          className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'deep_discounts'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <TrendingDown className="w-6 h-6 mb-2 text-gaming-blue" />
          <span className="text-xs font-black uppercase tracking-wider">Deep Discounts</span>
        </button>

        <button
          onClick={() => setActiveCategory('best_resale')}
          className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'best_resale'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <Percent className="w-6 h-6 mb-2 text-gaming-accent" />
          <span className="text-xs font-black uppercase tracking-wider">Top ROI Margins</span>
        </button>

        <button
          onClick={() => setActiveCategory('price_risk')}
          className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
            activeCategory === 'price_risk'
              ? 'bg-gaming-accent/10 border-gaming-accent text-white shadow-glow'
              : 'glass-panel border-white/5 text-gaming-muted hover:border-white/10 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-6 h-6 mb-2 text-yellow-500" />
          <span className="text-xs font-black uppercase tracking-wider">Price Resets</span>
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
            No recommendation signals in this category yet. Start tracking more games!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {getActiveList().map((game) => {
              return (
                <div 
                  key={game.cheapshark_id} 
                  className="bg-white/[0.02] border border-white/5 hover:border-white/10 p-4.5 rounded-2xl flex flex-col justify-between group transition-all"
                >
                  <div className="flex gap-4">
                    <img 
                      src={game.thumbnail} 
                      alt="" 
                      className="w-12 h-12 object-cover rounded-xl bg-black border border-white/15" 
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-gaming-accent transition-colors">{game.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[8.5px] bg-gaming-accent/15 text-gaming-accent border border-gaming-accent/20 px-1.5 py-0.5 rounded font-bold">
                          {game.platform}
                        </span>
                        <span className="text-[8.5px] bg-gaming-green/20 border border-gaming-green/35 text-gaming-green px-1.5 py-0.5 rounded font-black">
                          -{Math.round(game.discount || 0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Margins Analytics block */}
                  <div className="bg-white/[0.01] border-y border-white/5 my-4 py-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-black text-gaming-muted tracking-wider block">Cheapest Cost</span>
                      <span className="text-xs font-black text-gaming-green block mt-0.5">
                        {game.currency_symbol}{game.buy_price}
                      </span>
                    </div>
                    {activeCategory === 'best_resale' ? (
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-black text-gaming-muted tracking-wider block">Margin ROI</span>
                        <span className="inline-block px-1.5 py-0.5 bg-gaming-green/15 text-gaming-green border border-gaming-green/20 text-[9px] font-black rounded mt-0.5">
                          {game.margin}%
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-black text-gaming-muted tracking-wider block">Original Cost</span>
                        <span className="text-xs font-bold text-gaming-muted line-through block mt-0.5">
                          {game.currency_symbol}{game.original_price}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onViewDetails(game.cheapshark_id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white/5 hover:bg-gaming-accent/20 border border-white/5 hover:border-gaming-accent/35 rounded-xl text-white font-bold text-[10px] tracking-wider uppercase transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Details
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
