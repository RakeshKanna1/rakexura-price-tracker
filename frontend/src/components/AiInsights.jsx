import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, RefreshCw, Bot, User, Brain, AlertCircle, TrendingUp, CheckCircle, BarChart2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

const AiInsights = ({ region }) => {
  const [report, setReport] = useState('');
  const [loadingReport, setLoadingReport] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: "Hello! I am your Rakexura Gemini AI Consultant. I have analyzed your sales logs, purchase inventory, and wishlist spreads. Ask me anything about your resale strategy!" }
  ]);
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  const fetchReport = async () => {
    setLoadingReport(true);
    try {
      const res = await axios.get(`${API_BASE}/ai/insights`, { params: { region } });
      setReport(res.data.report);
    } catch (e) {
      console.error(e);
      setReport("### **Failed to load AI Insights**\n\nPlease ensure the backend is running and you have configured MONGODB_URI/GEMINI_API_KEY.");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [region]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setSendingChat(true);

    try {
      const res = await axios.post(`${API_BASE}/ai/chat`, { message: userMessage }, { params: { region } });
      setChatHistory(prev => [...prev, { role: 'assistant', text: res.data.response }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'assistant', text: "I'm sorry, I encountered an error communicating with my logic core. Please try again." }]);
    } finally {
      setSendingChat(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-sm font-extrabold text-white mt-4 mb-2 uppercase tracking-wide border-b border-white/5 pb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-base font-extrabold text-white mt-5 mb-2.5 uppercase tracking-wider">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} className="text-xs font-black text-gaming-accent mt-4 mb-1.5 uppercase tracking-wider">{line.replace(/\*\*/g, '')}</h4>;
      }
      // Bullet points
      if (line.startsWith('* **') || line.startsWith('- **')) {
        const parts = line.split('**:');
        if (parts.length > 1) {
          const title = parts[0].replace(/^[*-\s]+(\*\*)/, '').replace(/\*\*/g, '');
          const body = parts.slice(1).join('**:');
          return (
            <div key={i} className="my-2.5 pl-4 border-l-2 border-gaming-accent/40 bg-white/[0.01] p-2 rounded-r-xl">
              <span className="text-xs font-black text-gaming-accent block uppercase tracking-wider mb-0.5">{title}</span>
              <span className="text-xs text-gaming-text leading-relaxed">{body}</span>
            </div>
          );
        }
      }
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return <li key={i} className="text-xs text-gaming-muted list-disc ml-5 my-1 leading-relaxed">{line.substring(2)}</li>;
      }
      // Normal lines
      return line.trim() ? <p key={i} className="text-xs text-gaming-muted my-2 leading-relaxed">{line}</p> : <div key={i} className="h-2"></div>;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8 animate-fade-in">
      
      {/* Sidebar / Left Column: Report */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Title */}
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Brain className="w-8 h-8 text-gaming-accent" />
            Gemini AI Advisor
          </h2>
          <p className="text-gaming-muted mt-1 text-sm">
            AI-driven resale metrics, arbitrage alerts, and personalized business recommendations.
          </p>
        </div>

        {/* Intelligence Report Box */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between bg-gradient-to-b from-gaming-card to-gaming-bg/40 relative overflow-hidden flex-1">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-[0.02] pointer-events-none">
            <Sparkles className="w-48 h-48 text-gaming-accent" />
          </div>
          
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gaming-accent" />
              BI Portfolio Report
            </h3>
            <button 
              onClick={fetchReport}
              disabled={loadingReport}
              className="text-gaming-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
            {loadingReport ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <LoaderIcon />
                <p className="text-xs text-gaming-muted mt-4">Analyzing ledger database...</p>
              </div>
            ) : (
              <div className="space-y-1">
                {renderMarkdown(report)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Chat Assistant */}
      <div className="lg:col-span-3 glass-panel rounded-3xl border border-white/5 flex flex-col bg-gaming-card/40 overflow-hidden h-[620px]">
        {/* Chat Header */}
        <div className="px-6 py-4.5 border-b border-white/5 flex items-center gap-3 bg-gaming-card/80">
          <div className="p-2.5 bg-gaming-accent/15 border border-gaming-accent/25 rounded-2xl text-gaming-accent">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Rakexura AI Chatbot</h3>
            <span className="text-[10px] text-gaming-green font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gaming-green animate-pulse" />
              Online Portfolio Context Sync
            </span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-gaming-bg/20">
          {chatHistory.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold shrink-0 ${
                msg.role === 'user' 
                  ? 'bg-gaming-blue/15 border-gaming-blue/30 text-gaming-blue' 
                  : 'bg-gaming-accent/15 border-gaming-accent/30 text-gaming-accent'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Balloon */}
              <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-gaming-blue/10 border border-gaming-blue/20 text-white rounded-tr-none' 
                  : 'bg-white/[0.03] border border-white/5 text-gaming-text rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {sendingChat && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-gaming-accent/15 border-gaming-accent/30 text-gaming-accent shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-gaming-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gaming-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gaming-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input form */}
        <form onSubmit={handleSendChat} className="p-4 bg-gaming-card/90 border-t border-white/5 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about margins, sales history, or cheap game targets..."
            className="flex-1 bg-gaming-bg border border-white/5 hover:border-white/10 focus:border-gaming-accent/30 rounded-xl px-4.5 py-3 text-xs text-white placeholder-gaming-muted/40 focus:outline-none transition-all"
            disabled={sendingChat}
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || sendingChat}
            className="p-3 bg-gaming-accent hover:bg-gaming-accent/90 disabled:bg-gaming-accent/40 disabled:text-white/40 text-white rounded-xl shadow-glow transition-all active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>

    </div>
  );
};

const LoaderIcon = () => (
  <div className="relative w-12 h-12 flex items-center justify-center">
    <div className="absolute inset-0 border-2 border-gaming-accent/20 rounded-full"></div>
    <div className="absolute inset-0 border-2 border-t-gaming-accent border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
    <Brain className="w-5 h-5 text-gaming-accent animate-pulse" />
  </div>
);

export default AiInsights;
