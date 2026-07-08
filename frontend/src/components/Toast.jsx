import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeConfig = {
    success: {
      bg: 'bg-gaming-green/10 border-gaming-green/20 shadow-glow-green',
      icon: CheckCircle2,
      iconColor: 'text-gaming-green',
    },
    error: {
      bg: 'bg-red-500/10 border-red-500/20 shadow-red-500/5',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
    },
    info: {
      bg: 'bg-gaming-blue/10 border-gaming-blue/20 shadow-gaming-blue/5',
      icon: Info,
      iconColor: 'text-gaming-blue',
    },
  };

  const config = typeConfig[type] || typeConfig.success;
  const Icon = config.icon;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl border glass-panel ${config.bg} animate-bounce-in max-w-sm`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
      <span className="text-sm font-medium text-white/95 leading-snug">{message}</span>
      <button 
        onClick={onClose} 
        className="ml-auto text-gaming-muted hover:text-white p-0.5 rounded-lg hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
