import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SearchGame from './components/SearchGame';
import Wishlist from './components/Wishlist';
import Alerts from './components/Alerts';
import AdminPanel from './components/AdminPanel';
import SalesCalendar from './components/SalesCalendar';
import Suggestions from './components/Suggestions';
import Toast from './components/Toast';
import AiInsights from './components/AiInsights';
import { Bell, BellOff, X, Flame, TrendingDown, Clock, ShieldAlert, Menu } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from './config';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [region, setRegion] = useState('IN');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Smart Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowNotifDropdown(false);
      }
    };

    if (showNotifDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifDropdown]);

  // Toast notifications state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  });

  const triggerToast = (message, type = 'success') => {
    setToast({
      visible: true,
      message,
      type
    });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/notifications`, { params: { region } });
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Poll notifications on load and every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [region]);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Helper function to navigate to a game's details directly
  const handleViewDetails = (gameId) => {
    setSelectedGameId(gameId);
    setActiveTab('search');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            setActiveTab={setActiveTab} 
            onViewDetails={handleViewDetails}
            triggerToast={triggerToast} 
            region={region}
          />
        );
      case 'ai_insights':
        return (
          <AiInsights 
            region={region}
          />
        );
      case 'search':
        return (
          <SearchGame 
            selectedGameId={selectedGameId} 
            setSelectedGameId={setSelectedGameId} 
            triggerToast={triggerToast} 
            region={region}
          />
        );
      case 'wishlist':
        return (
          <Wishlist 
            onViewDetails={handleViewDetails} 
            triggerToast={triggerToast} 
            region={region}
          />
        );
      case 'calendar':
        return (
          <SalesCalendar 
          />
        );
      case 'suggestions':
        return (
          <Suggestions 
            onViewDetails={handleViewDetails}
            region={region}
          />
        );
      case 'alerts':
        return (
          <Alerts 
            triggerToast={triggerToast} 
          />
        );
      case 'admin':
        return (
          <AdminPanel 
            triggerToast={triggerToast} 
          />
        );
      default:
        return (
          <Dashboard 
            setActiveTab={setActiveTab} 
            triggerToast={triggerToast} 
            region={region}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gaming-bg text-gaming-text flex">
      {/* Sidebar Component */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab !== 'search') {
            setSelectedGameId(null);
          }
          setActiveTab(tab);
        }} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Layout Area */}
      <main className="flex-1 min-h-screen ml-0 md:ml-64 p-4 md:p-8 xl:p-10 max-w-7xl overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          
          {/* Top Bar with Notification Dropdown & Region Switcher */}
          <div className="flex justify-between items-center gap-3.5 mb-6 relative">
            
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex md:hidden items-center justify-center w-10 h-10 rounded-xl bg-gaming-card border border-white/5 shadow-glow hover:border-white/10 active:scale-95 transition-all text-white"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-3.5 ml-auto">
            
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-gaming-card border border-white/5 shadow-glow hover:border-white/10 active:scale-95 transition-all text-white"
              >
                <Bell className="w-4.5 h-4.5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gaming-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gaming-accent"></span>
                  </span>
                )}
              </button>

              {/* Dropdown Box */}
              {showNotifDropdown && (
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 mt-3.5 w-auto sm:w-80 glass-panel rounded-2xl border border-white/10 shadow-2xl p-4.5 z-30 space-y-3.5 bg-gaming-card max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <h4 className="text-xs uppercase font-black tracking-wider text-white">System Alerts</h4>
                    <button 
                      onClick={() => setShowNotifDropdown(false)}
                      className="text-gaming-muted hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gaming-muted">
                        <BellOff className="w-6 h-6 text-gaming-muted/30 mx-auto mb-2" />
                        No active price drops or alerts.
                      </div>
                    ) : (
                      notifications.map((n, i) => {
                        return (
                          <div 
                            key={i} 
                            onClick={() => {
                              if (n.cheapshark_id) {
                                handleViewDetails(n.cheapshark_id);
                                setShowNotifDropdown(false);
                              } else if (n.type === 'SALE_UPCOMING') {
                                setActiveTab('calendar');
                                setShowNotifDropdown(false);
                              }
                            }}
                            className="p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl flex gap-3 items-start cursor-pointer transition-all group"
                          >
                            <div className="pt-0.5 flex-shrink-0">
                              {n.type === 'POPULAR_DEAL' && <Flame className="w-3.5 h-3.5 text-gaming-accent animate-pulse" />}
                              {n.type === 'HISTORICAL_LOW' && <TrendingDown className="w-3.5 h-3.5 text-gaming-green" />}
                              {n.type === 'TARGET_ALERT' && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                              {n.type === 'SALE_UPCOMING' && <Clock className="w-3.5 h-3.5 text-gaming-blue" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black text-white group-hover:text-gaming-accent transition-colors">{n.title}</p>
                              <p className="text-[10px] text-gaming-muted mt-1 leading-normal">{n.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Region Selector */}
            <div className="flex items-center gap-2.5 glass-panel px-3 sm:px-4 py-2 rounded-xl border border-white/5 shadow-glow">
              <span className="text-xs uppercase font-extrabold text-gaming-muted tracking-wider hidden sm:inline">Dashboard Region:</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-gaming-card border border-white/5 text-xs font-extrabold rounded-lg text-white px-2 py-1.5 focus:outline-none focus:border-gaming-accent/40"
              >
                <option value="IN">India (₹ INR)</option>
                <option value="US">United States ($ USD)</option>
                <option value="TR">Turkey (₺ TRY)</option>
                <option value="AR">Argentina ($ ARS)</option>
                <option value="BR">Brazil (R$ BRL)</option>
                <option value="EU">Europe (€ EUR)</option>
              </select>
            </div>
          </div>
        </div>

        {renderContent()}
      </div>
    </main>

      {/* Floating Notifications */}
      {toast.visible && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={closeToast} 
        />
      )}
    </div>
  );
}

export default App;
