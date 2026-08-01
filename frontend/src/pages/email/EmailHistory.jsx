import { useState, useEffect } from 'react';
import { emailCampaignsAPI } from '../../services/api';

/* ── Icons ─────────────────────────────────────────────────────────────── */
const Icons = {
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8 5v14l11-7z" /></svg>,
  Pause: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
};

export default function EmailHistory() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
    
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(fetchCampaigns, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data } = await emailCampaignsAPI.getAll();
      setCampaigns(data.campaigns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await emailCampaignsAPI.delete(id);
      fetchCampaigns();
    } catch (err) {
      alert('Error deleting campaign');
    }
  };

  const handlePause = async (id) => {
    try {
      await emailCampaignsAPI.pause(id);
      fetchCampaigns();
    } catch (err) {
      alert('Failed to pause');
    }
  };

  const handleResume = async (id) => {
    try {
      await emailCampaignsAPI.resume(id);
      fetchCampaigns();
    } catch (err) {
      alert('Failed to resume');
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="p-8 space-y-8 text-white max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#F57C20,#f59e0b)]">Email Campaigns</h1>
          <p className="text-slate-400 mt-2">Manage and monitor your ongoing email campaigns.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(c => {
          const total = c.stats?.totalContacts || 0;
          const sent = c.stats?.sent || 0;
          const delivered = c.stats?.delivered || 0;
          const failed = c.stats?.failed || 0;
          
          const progress = total > 0 ? ((sent + failed) / total) * 100 : 0;
          
          let statusColor = 'bg-slate-500/20 text-slate-300'; // Draft
          let statusPulse = false;
          
          if (c.status === 'Completed') statusColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          if (c.status === 'Sending') { statusColor = 'bg-orange-500/20 text-orange-400 border border-[#F57C20]/30'; statusPulse = true; }
          if (c.status === 'Paused') statusColor = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
          if (c.status === 'Failed') statusColor = 'bg-red-500/20 text-red-400 border border-red-500/30';

          return (
            <div key={c._id} className="bg-[#1f2937] border border-white/5 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:border-white/10 transition-all flex flex-col relative overflow-hidden group">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex-1 pr-4">
                  <h3 className="font-bold text-xl text-white truncate" title={c.name}>{c.name}</h3>
                  <p className="text-sm text-slate-400 truncate mt-1" title={c.subject}>{c.subject}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${statusColor}`}>
                  {statusPulse && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
                  {c.status}
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="text-xs text-slate-500 uppercase font-medium mb-1">Total</div>
                  <div className="text-lg font-bold text-white">{total}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="text-xs text-slate-500 uppercase font-medium mb-1">Delivered</div>
                  <div className="text-lg font-bold text-emerald-400">{delivered}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 relative z-10">
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 border border-white/5 overflow-hidden">
                  <div 
                    className="h-2.5 rounded-full bg-gradient-to-r from-[#F57C20] to-orange-400 transition-all duration-1000" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                <div className="flex items-center text-xs text-slate-500 gap-2">
                  <Icons.Clock />
                  {new Date(c.createdAt).toLocaleDateString()}
                </div>
                
                <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  {c.status === 'Sending' && (
                    <button onClick={() => handlePause(c._id)} className="p-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-colors" title="Pause">
                      <Icons.Pause />
                    </button>
                  )}
                  {c.status === 'Paused' && (
                    <button onClick={() => handleResume(c._id)} className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors" title="Resume">
                      <Icons.Play />
                    </button>
                  )}
                  <button onClick={() => handleDelete(c._id)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors" title="Delete">
                    <Icons.Trash />
                  </button>
                </div>
              </div>
              
              {/* Background Glow */}
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#F57C20]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#F57C20]/10 transition-colors" />
            </div>
          );
        })}
      </div>
      
      {campaigns.length === 0 && (
        <div className="text-center py-20 bg-[#1f2937] rounded-3xl border border-white/5">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No campaigns found</h3>
          <p className="text-slate-400">Start by creating your first email campaign.</p>
        </div>
      )}
    </div>
  );
}
