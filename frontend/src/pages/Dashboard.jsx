import { useEffect, useState, useCallback } from 'react';
import { emailCampaignsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* ── KPI Stat Card ─────────────────────────────────────────────────── */
const KpiCard = ({ title, value, sub, icon, gradient, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -4, scale: 1.01 }}
    className="rounded-2xl p-6 text-white relative overflow-hidden shadow-elevated"
    style={{ background: gradient }}
  >
    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 translate-x-12 -translate-y-12 backdrop-blur-3xl" />
    <div className="absolute bottom-0 right-8 w-20 h-20 rounded-full bg-white/5 translate-y-8 backdrop-blur-2xl" />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl filter drop-shadow-md">{icon}</span>
        {trend !== undefined && (
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold shadow-sm backdrop-blur-md">
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1.5">{title}</p>
      <p className="text-4xl font-extrabold leading-none tracking-tight">{value ?? '—'}</p>
      {sub && <p className="text-white/70 text-xs mt-2 font-medium">{sub}</p>}
    </div>
  </motion.div>
);

/* ── Status Badge ───────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    Draft:     'badge bg-border text-text-muted',
    Sending:   'badge bg-status-warning/10 text-status-warning',
    Active:    'badge bg-accent/10 text-accent',
    Completed: 'badge bg-status-success/10 text-status-success',
    Scheduled: 'badge bg-accent/10 text-accent',
    Paused:    'badge bg-status-warning/10 text-status-warning',
    Failed:    'badge bg-status-danger/10 text-status-danger',
  };
  return (
    <span className={`${map[status] || 'badge bg-border text-text-muted'} capitalize`}>
      {status === 'Completed' && '✓ '}
      {status === 'Active' && '⟳ '}
      {status === 'Failed' && '✗ '}
      {status}
    </span>
  );
};

/* ── Dashboard ──────────────────────────────────────────────────────── */
const Dashboard = () => {
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await emailCampaignsAPI.getDashboardStats();
      setStats(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  /* Loading Skeleton */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-[#1f2937] rounded-2xl border border-white/5" />
          ))}
        </div>
        <div className="h-80 bg-[#1f2937] rounded-2xl border border-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error m-6">
        <p className="font-bold">Failed to load dashboard</p>
        <p className="text-sm mt-0.5 opacity-90">{error}</p>
        <button onClick={() => fetchStats()} className="text-sm underline mt-2 font-semibold">Try again</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 p-6 max-w-7xl mx-auto"
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#F57C20,#f59e0b)]">Email Dashboard</h1>
          <p className="text-slate-400 mt-2">Overview of your Email Outreach Campaigns</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </motion.button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/email/campaigns" className="px-5 py-2.5 bg-[#F57C20] hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Campaign
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          delay={0.1}
          title="Total Contacts"
          value={stats.totalContacts?.toLocaleString()}
          icon="👥"
          gradient="linear-gradient(135deg, #1f2937 0%, #374151 100%)"
          sub="In your CRM"
        />
        <KpiCard
          delay={0.2}
          title="Active Campaigns"
          value={stats.totalCampaigns?.toLocaleString()}
          icon="🚀"
          gradient="linear-gradient(135deg, #F57C20 0%, #f59e0b 100%)"
          sub="Currently running"
        />
        <KpiCard
          delay={0.3}
          title="Emails Sent Today"
          value={stats.emailsSentToday?.toLocaleString()}
          icon="📤"
          gradient="linear-gradient(135deg, #059669 0%, #10b981 100%)"
          sub="Across all campaigns"
        />
        <KpiCard
          delay={0.4}
          title="Pending Queue"
          value={stats.pending?.toLocaleString()}
          icon="⏳"
          gradient="linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)"
          sub="Waiting for next window"
        />
      </div>

      {/* ── Recent Campaigns Table ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-[#1f2937] border border-white/10 rounded-3xl overflow-hidden shadow-xl"
      >
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-lg font-bold text-white">Active Campaigns</h3>
          <Link to="/email/campaigns" className="text-[#F57C20] hover:text-orange-400 text-sm font-bold flex items-center gap-1 transition-colors">
            View all
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>

        {!stats.recentCampaigns?.length ? (
          <div className="py-16 text-center">
            <p className="text-6xl mb-4">📭</p>
            <p className="font-bold text-white text-lg mb-2">No campaigns yet</p>
            <p className="text-slate-400 text-sm mb-6">Create your first campaign to start automated email outreach.</p>
            <Link to="/email/campaigns" className="px-6 py-3 bg-[#F57C20] hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-colors">
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-white/5 text-slate-400 font-bold border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Campaign</th>
                  <th className="px-6 py-4 font-semibold">Target Contacts</th>
                  <th className="px-6 py-4 font-semibold">Sent</th>
                  <th className="px-6 py-4 font-semibold">Failed</th>
                  <th className="px-6 py-4 font-semibold">Replies</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.recentCampaigns.map((c, i) => {
                  const pct = c.stats.totalContacts > 0
                    ? Math.round((c.stats.totalSent / c.stats.totalContacts) * 100)
                    : 0;
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + (i * 0.05) }}
                      key={c._id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-white max-w-[160px] truncate">{c.name}</td>
                      <td className="px-6 py-4 font-bold text-slate-400">{c.stats.totalContacts}</td>
                      <td className="px-6 py-4 text-emerald-400 font-bold">{c.stats.totalSent}</td>
                      <td className="px-6 py-4 text-red-400 font-bold">{c.stats.failed}</td>
                      <td className="px-6 py-4 text-blue-400 font-bold">{c.stats.replies || 0}</td>
                      <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-6 py-4 min-w-[150px]">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-[#374151] rounded-full h-2">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1 }}
                              className="bg-gradient-to-r from-[#F57C20] to-orange-400 h-2 rounded-full" 
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-400">{pct}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
