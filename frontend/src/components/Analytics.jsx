import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Percent, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

const REGION_SYMBOLS = {
  IN: '₹',
  US: '$',
  TR: '₺',
  AR: '$',
  BR: 'R$',
  EU: '€'
};

const Analytics = ({ region }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const symbol = REGION_SYMBOLS[region] || '₹';

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/analytics`, { params: { region } });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [region]);

  if (loading || !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-gaming-accent animate-spin mb-4" />
        <p className="text-sm text-gaming-muted">Aggregating profit parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <BarChart3 className="w-8 h-8 text-gaming-accent" />
          Profit & Sales Analytics
        </h2>
        <p className="text-gaming-muted mt-1 text-sm">
          Overview of business yields, search volume interest, reselling ROI, and monthly curves.
        </p>
      </div>

      {/* Row 1: Monthly Financial Trend (Dual Line Chart) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4.5 h-4.5 text-gaming-accent" />
          Monthly Financial Intake & Net Margins
        </h3>
        <div className="w-full h-80 bg-gaming-bg/25 border border-white/5 p-4 rounded-2xl">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthly_trend} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
              <XAxis dataKey="month" stroke="#a0a8c0" fontSize={11} tickLine={false} />
              <YAxis 
                stroke="#a0a8c0" 
                fontSize={10} 
                tickFormatter={(v) => `${symbol}${v}`} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#11131a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                labelStyle={{ color: '#a0a8c0', fontSize: '10px' }}
                formatter={(v) => [`${symbol}${v}`, 'Amount']}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Line 
                name="Monthly Revenue" 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                strokeWidth={3} 
                dot={{ fill: '#8b5cf6', r: 3 }} 
              />
              <Line 
                name="Net Profit" 
                type="monotone" 
                dataKey="profit" 
                stroke="#00d68f" 
                strokeWidth={3} 
                dot={{ fill: '#00d68f', r: 3 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Top Selling & Highest Profit (Bar Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Games */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-gaming-blue" />
            Top Resold Games (Units Sold)
          </h3>
          <div className="w-full h-72 bg-gaming-bg/25 border border-white/5 p-4 rounded-2xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_selling} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                <XAxis dataKey="name" stroke="#a0a8c0" fontSize={9} tickLine={false} interval={0} />
                <YAxis stroke="#a0a8c0" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#11131a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  labelStyle={{ color: '#a0a8c0', fontSize: '10px' }}
                />
                <Bar name="Licenses Sold" dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Highest Profit Games */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-4.5 h-4.5 text-gaming-green" />
            Highest Profit Yields (Total Profit)
          </h3>
          <div className="w-full h-72 bg-gaming-bg/25 border border-white/5 p-4 rounded-2xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.highest_profit} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                <XAxis dataKey="name" stroke="#a0a8c0" fontSize={9} tickLine={false} interval={0} />
                <YAxis 
                  stroke="#a0a8c0" 
                  fontSize={10} 
                  tickFormatter={(v) => `${symbol}${v}`} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#11131a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  labelStyle={{ color: '#a0a8c0', fontSize: '10px' }}
                  formatter={(v) => [`${symbol}${v}`, 'Total Profit']}
                />
                <Bar name="Profit Amount" dataKey="value" fill="#00d68f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Most Viewed & Best ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Viewed Games */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-gaming-blue" />
            Most Viewed Games (Search Clicks)
          </h3>
          <div className="w-full h-72 bg-gaming-bg/25 border border-white/5 p-4 rounded-2xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.most_viewed} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                <XAxis dataKey="name" stroke="#a0a8c0" fontSize={9} tickLine={false} interval={0} />
                <YAxis stroke="#a0a8c0" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#11131a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  labelStyle={{ color: '#a0a8c0', fontSize: '10px' }}
                />
                <Bar name="Database Clicks" dataKey="value" fill="#b9a4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best ROI */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Percent className="w-4.5 h-4.5 text-gaming-accent" />
            Reselling Return-on-Investment (ROI %)
          </h3>
          <div className="w-full h-72 bg-gaming-bg/25 border border-white/5 p-4 rounded-2xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.best_roi} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                <XAxis dataKey="name" stroke="#a0a8c0" fontSize={9} tickLine={false} interval={0} />
                <YAxis 
                  stroke="#a0a8c0" 
                  fontSize={10} 
                  tickFormatter={(v) => `${v}%`} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#11131a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  labelStyle={{ color: '#a0a8c0', fontSize: '10px' }}
                  formatter={(v) => [`${v}%`, 'ROI Yield']}
                />
                <Bar name="ROI Percentage" dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
