import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Unplug, X, Link as LinkIcon, ShieldCheck, User as UserIcon, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('email');
  
  // Brevo state
  const [brevoStatus, setBrevoStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Connect Modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectForm, setConnectForm] = useState({ apiKey: '', senderEmail: '', senderName: '' });
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Test/Disconnect state
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    fetchBrevoStatus();
  }, []);

  const fetchBrevoStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/brevo/status', { withCredentials: true });
      setBrevoStatus(res.data);
    } catch (err) {
      toast.error('Failed to load Brevo connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!connectForm.apiKey || !connectForm.senderEmail || !connectForm.senderName) {
      return toast.error('All fields are required');
    }
    
    setIsConnecting(true);
    const loadingToast = toast.loading('Verifying Brevo API Key...');
    
    try {
      await axios.post('/api/brevo/connect', connectForm, { withCredentials: true });
      toast.success('Brevo account connected successfully!', { id: loadingToast });
      setShowConnectModal(false);
      setConnectForm({ apiKey: '', senderEmail: '', senderName: '' });
      fetchBrevoStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect Brevo', { id: loadingToast });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    const loadingToast = toast.loading('Testing connection...');
    try {
      await axios.post('/api/brevo/test', {}, { withCredentials: true });
      toast.success('Brevo connection is working correctly.', { id: loadingToast });
    } catch (err) {
      toast.error('Unable to connect to Brevo. Please reconnect your account.', { id: loadingToast });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Brevo account? You will not be able to send email campaigns.')) {
      return;
    }
    
    setIsDisconnecting(true);
    const loadingToast = toast.loading('Disconnecting...');
    try {
      await axios.delete('/api/brevo/disconnect', { withCredentials: true });
      toast.success('Brevo account disconnected', { id: loadingToast });
      fetchBrevoStatus();
    } catch (err) {
      toast.error('Failed to disconnect', { id: loadingToast });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const renderTabs = () => (
    <div className="flex flex-col space-y-1">
      {[
        { id: 'profile', label: 'Profile', icon: <UserIcon size={18} /> },
        { id: 'security', label: 'Security', icon: <ShieldCheck size={18} /> },
        { id: 'email', label: 'Email Sending', icon: <Mail size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
            activeTab === tab.id
              ? 'bg-primary/10 text-primary shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-6xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-2 font-medium">Manage your personal preferences and integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          {renderTabs()}
        </div>
        
        <div className="md:col-span-3">
          {activeTab === 'email' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Mail className="text-primary" /> Email Sending
              </h2>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-6 relative">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Brevo Account</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-md font-medium leading-relaxed">
                      Connect your personal Brevo account to send email campaigns directly from Techzon CRM. Your credentials are encrypted and isolated.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-500">Connection Status:</span>
                    {loading ? (
                      <span className="text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full text-xs">Checking...</span>
                    ) : brevoStatus?.connected ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-500 font-bold bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-xs">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Not Connected
                      </span>
                    )}
                  </div>
                </div>

                {!loading && (
                  <div className="mt-8">
                    {!brevoStatus?.connected ? (
                      <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
                        <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h4 className="text-slate-700 font-bold mb-2">No Account Connected</h4>
                        <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">Connect your Brevo account to enable email campaign functionality.</p>
                        <button 
                          onClick={() => setShowConnectModal(true)}
                          className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 mx-auto"
                        >
                          <LinkIcon size={16} /> Connect Brevo
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="mb-6">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Brevo Sender</p>
                              <p className="text-slate-800 font-bold break-all">{brevoStatus.senderEmail}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sender Name</p>
                              <p className="text-slate-800 font-bold">{brevoStatus.senderName}</p>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Today's Email Usage</p>
                            <div className="flex items-end gap-2 mb-3">
                              <span className="text-3xl font-extrabold text-slate-800 leading-none">{brevoStatus.emailsSentToday || 0}</span>
                              <span className="text-slate-500 font-medium mb-1">/ {brevoStatus.dailyLimit || 300}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${((brevoStatus.emailsSentToday || 0) >= (brevoStatus.dailyLimit || 300)) ? 'bg-red-500' : 'bg-primary'}`} 
                                style={{ width: `${Math.min(100, ((brevoStatus.emailsSentToday || 0) / (brevoStatus.dailyLimit || 300)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                          <button 
                            onClick={handleTest}
                            disabled={isTesting}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <RefreshCw size={16} className={isTesting ? "animate-spin" : ""} /> Test Connection
                          </button>
                          <button 
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Unplug size={16} /> Disconnect
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab !== 'email' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm"
            >
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2 capitalize">{activeTab} Settings</h3>
              <p className="text-slate-500">This section is currently under construction.</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Connect Modal */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800">Connect Brevo</h3>
                <button onClick={() => setShowConnectModal(false)} className="text-slate-400 hover:text-slate-700 bg-white rounded-full p-1.5 shadow-sm border border-slate-200">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleConnect} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Brevo API Key</label>
                  <input 
                    type="password" 
                    required 
                    value={connectForm.apiKey}
                    onChange={(e) => setConnectForm({...connectForm, apiKey: e.target.value})}
                    placeholder="xkeysib-..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2 font-medium">Your API key is securely encrypted before being stored.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Sender Email</label>
                  <input 
                    type="email" 
                    required 
                    value={connectForm.senderEmail}
                    onChange={(e) => setConnectForm({...connectForm, senderEmail: e.target.value})}
                    placeholder="you@yourcompany.com" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Sender Name</label>
                  <input 
                    type="text" 
                    required 
                    value={connectForm.senderName}
                    onChange={(e) => setConnectForm({...connectForm, senderName: e.target.value})}
                    placeholder="John Doe" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowConnectModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">Cancel</button>
                  <button type="submit" disabled={isConnecting} className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isConnecting && <RefreshCw size={16} className="animate-spin" />}
                    Connect
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Settings;
