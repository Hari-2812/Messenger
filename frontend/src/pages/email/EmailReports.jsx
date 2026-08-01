import { useState, useEffect } from 'react';
import { emailCampaignsAPI } from '../../services/api';

export default function EmailReports() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    emailCampaignsAPI.getDashboardStats().then(res => setStats(res.data)).catch(console.error);
  }, []);

  return (
    <div className="p-8 space-y-6 text-white max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#F57C20,#f59e0b)]">Email Reports</h1>
      
      <div className="bg-[#241252]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        <h2 className="text-xl font-semibold">Aggregate Delivery Metrics</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
            <p className="text-sm text-slate-400 mb-1">Total Sent</p>
            <p className="text-3xl font-bold">{stats?.emailsSentToday || 0}</p> 
            <p className="text-xs text-slate-500 mt-2">All time sent metrics currently rely on completed logs</p>
          </div>
          
          <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
            <p className="text-sm text-emerald-400 mb-1">Delivered</p>
            <p className="text-3xl font-bold text-emerald-300">{stats?.delivered || 0}</p>
          </div>
          
          <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
            <p className="text-sm text-red-400 mb-1">Failed</p>
            <p className="text-3xl font-bold text-red-300">{stats?.failed || 0}</p>
          </div>
          
          <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center">
            <p className="text-sm text-amber-400 mb-1">Pending/Bounce</p>
            <p className="text-3xl font-bold text-amber-300">{stats?.pending || 0}</p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10">
          <p className="text-slate-400 italic">Advanced reporting for Open Rate, Click Rate, and specific Campaign breakdowns can be accessed by viewing individual campaigns in the Campaign History tab. (Brevo Webhooks configuration is required for real-time open/click events).</p>
        </div>
      </div>
    </div>
  );
}
