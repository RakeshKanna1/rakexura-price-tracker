import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Heart, 
  Bell, 
  Shield, 
  Calendar, 
  Sparkles,
  Flame,
  X
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'suggestions', name: 'Games On Sale', icon: Flame },
    { id: 'search', name: 'Search & Track', icon: Search },
    { id: 'wishlist', name: 'Wishlist / Tracked', icon: Heart },
    { id: 'alerts', name: 'Price Alerts', icon: Bell },
    { id: 'calendar', name: 'Sale Calendars', icon: Calendar },
    { id: 'ai_insights', name: 'AI Price Insights', icon: Sparkles },
    { id: 'admin', name: 'Admin Panel', icon: Shield },
  ];

  return (
    <aside className={`w-64 h-screen fixed left-0 top-0 glass-panel border-r border-white/5 flex flex-col justify-between py-6 z-40 overflow-y-auto hide-scrollbar transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 mb-8">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => {
              setActiveTab('dashboard');
              if (setIsSidebarOpen) setIsSidebarOpen(false);
            }}
          >
            <img 
              src="/rakexura_logo.png" 
              alt="Rakexura Logo" 
              className="w-10 h-10 object-cover rounded-xl shadow-glow border border-gaming-accent/20 group-hover:scale-105 transition-all duration-300"
            />
            <div>
              <h1 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-gaming-accent bg-clip-text text-transparent">
                RAKEXURA
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-gaming-muted font-semibold">Price Tracker</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gaming-muted hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (setIsSidebarOpen) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                  isActive 
                    ? 'bg-gaming-accent text-white shadow-glow hover:bg-gaming-accent' 
                    : 'text-gaming-muted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gaming-muted group-hover:text-white'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding */}
      <div className="px-6 border-t border-white/5 pt-5 mt-6">
        <p className="text-[9px] uppercase tracking-widest text-gaming-muted/40 font-bold">
          Price Tracker v3.0
        </p>
        <p className="text-[9px] text-gaming-muted/30 font-semibold mt-1">
          &copy; 2026 Rakexura Gaming
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
