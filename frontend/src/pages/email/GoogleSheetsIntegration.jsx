import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const Toast = ({ msg, type, onClose }) => {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold animate-fade-in ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      <span>{type === 'success' ? '✓' : '✗'}</span>
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
};

export default function GoogleSheetsIntegration() {
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetId, setSheetId] = useState(null);
  const [sheetInfo, setSheetInfo] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [columns, setColumns] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Mappings: CRM Field -> Sheet Column
  const [mapping, setMapping] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    website: '',
    industry: '',
    location: ''
  });

  const crmFields = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email (Primary)' },
    { key: 'companyName', label: 'Company Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'website', label: 'Website' },
    { key: 'industry', label: 'Industry' },
    { key: 'location', label: 'Location' }
  ];

  const showToast = (msg, type = 'success') => setToastMsg({ msg, type });
  const hideToast = () => setToastMsg(null);

  const handleConnect = async () => {
    if (!sheetUrl) return showToast('Please enter a Google Sheet URL or ID', 'error');
    setLoading(true);
    try {
      // Create custom axios instance or use existing api instance
      // The backend route is /api/google-sheets/connect
      const { data } = await api.post('/google-sheets/connect', { sheetUrlOrId: sheetUrl });
      if (data.success) {
        setSheetId(data.sheetId);
        setSheetInfo(data);
        if (data.sheets && data.sheets.length > 0) {
          setSelectedSheet(data.sheets[0]);
          fetchColumns(data.sheetId, data.sheets[0]);
        }
        showToast('Connected successfully!');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchColumns = async (id, sheetName) => {
    try {
      const { data } = await api.get(`/google-sheets/preview?sheetId=${id}&sheetName=${sheetName}`);
      if (data.success) {
        setColumns(data.columns);
        // Auto-map based on similarity
        const newMapping = { ...mapping };
        const lowerCols = data.columns.map(c => c.toLowerCase());
        
        crmFields.forEach(field => {
          const matchIdx = lowerCols.findIndex(c => c.includes(field.key.toLowerCase()) || field.key.toLowerCase().includes(c));
          if (matchIdx !== -1) {
            newMapping[field.key] = data.columns[matchIdx];
          }
        });
        setMapping(newMapping);
      }
    } catch (err) {
      showToast('Failed to fetch columns', 'error');
    }
  };

  const handleSheetChange = (e) => {
    const val = e.target.value;
    setSelectedSheet(val);
    fetchColumns(sheetId, val);
  };

  const handleSync = async () => {
    if (!mapping.email) {
      return showToast('Email field must be mapped!', 'error');
    }
    setSyncing(true);
    try {
      const { data } = await api.post('/google-sheets/sync', {
        sheetId,
        sheetName: selectedSheet,
        mapping
      });
      if (data.success) {
        showToast(`Sync complete: ${data.imported} new, ${data.updated} updated, ${data.skipped} skipped.`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    setSheetId(null);
    setSheetInfo(null);
    setSheetUrl('');
    setColumns([]);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Google Sheets Sync</h1>
        <p className="text-slate-400">Import and sync contacts directly from a Google Sheet.</p>
      </div>

      {!sheetId ? (
        <div className="bg-[#1f2937] border border-white/10 rounded-3xl p-8 shadow-xl max-w-2xl">
          <h2 className="text-xl font-bold text-white mb-4">Connect Spreadsheet</h2>
          <p className="text-sm text-slate-400 mb-6">Make sure the Google Sheet is public or shared with the service account.</p>
          
          <label className="block text-sm font-medium text-slate-300 mb-2">Google Sheet URL or ID</label>
          <div className="flex gap-4">
            <input 
              type="text" 
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X..." 
              className="flex-1 bg-[#374151] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20]"
            />
            <button 
              onClick={handleConnect}
              disabled={loading}
              className="px-6 py-3 bg-[#F57C20] hover:bg-orange-600 text-white font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><polyline points="20 6 9 17 4 12" /></svg>
                Connected to: {sheetInfo.title}
              </h3>
              <p className="text-slate-400 text-sm mt-1">Select the sheet and map your columns to sync contacts.</p>
            </div>
            <button onClick={handleDisconnect} className="px-4 py-2 border border-white/20 hover:bg-white/10 text-white rounded-xl transition-colors">
              Disconnect
            </button>
          </div>

          <div className="bg-[#1f2937] border border-white/10 rounded-3xl p-8 shadow-xl">
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Sheet Tab</label>
              <select 
                value={selectedSheet}
                onChange={handleSheetChange}
                className="w-full md:w-1/2 bg-[#374151] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20]"
              >
                {sheetInfo.sheets?.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-lg font-bold text-white mb-4">Map Columns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {crmFields.map(field => (
                  <div key={field.key} className="flex flex-col">
                    <label className="text-sm font-medium text-slate-300 mb-1">{field.label} {field.key === 'email' && <span className="text-red-400">*</span>}</label>
                    <select 
                      value={mapping[field.key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      className="bg-[#374151] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#F57C20]"
                    >
                      <option value="">-- Ignore --</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <button 
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-8 py-3 bg-[#F57C20] hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2"
                >
                  {syncing ? (
                    'Syncing Contacts...'
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                      Start Sync
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={hideToast} />}
    </div>
  );
}
