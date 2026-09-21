import { useEffect, useState, useCallback } from 'react';
import { emailCampaignsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Rocket, Send, Clock, Inbox, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ── KPI Stat Card ─────────────────────────────────────────────────── */
const KpiCard = ({ title, value, sub, icon, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -4, scale: 1.01 }}
    className="rounded-2xl p-6 bg-card border border-border relative overflow-hidden shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary drop-shadow-sm">
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm ${trend >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1.5">{title}</p>
      <p className="text-4xl font-extrabold leading-none tracking-tight text-text">{value ?? '—'}</p>
      {sub && <p className="text-text-muted text-xs mt-2 font-medium">{sub}</p>}
    </div>
  </motion.div>
);

/* ── StatusBadge ──────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    Draft: 'bg-gray-100 text-gray-600 border border-gray-200',
    Sending: 'bg-blue-50 text-blue-600 border border-blue-200',
    Active: 'bg-primary/10 text-primary border border-primary/20',
    Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Scheduled: 'bg-purple-50 text-purple-700 border border-purple-200',
    Paused: 'bg-amber-50 text-amber-700 border border-amber-200',
    Failed: 'bg-red-50 text-red-700 border border-red-200',
    Completed_with_errors: 'bg-orange-50 text-orange-700 border border-orange-200',
    'Partially Sent': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${map[status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
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
    const userId = user?._id || user?.id;
    if (!userId) return;
    setStats(null);
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => {
      clearInterval(interval);
      setStats(null);
    };
  }, [fetchStats, user?._id, user?.id]);

  /* Loading Skeleton */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-card rounded-2xl border border-border" />
          ))}
        </div>
        <div className="h-80 bg-card rounded-2xl border border-border" />
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
          <h1 className="text-3xl font-bold text-primary-dark">Email Dashboard</h1>
          <p className="text-text-muted mt-2">Overview of your Email Outreach Campaigns</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-card text-text hover:bg-background border border-border transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </motion.button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/email/campaigns" className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Campaign
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <KpiCard
          delay={0.1}
          title="Total Contacts"
          value={stats.totalContacts?.toLocaleString()}
          icon={<Users size={24} />}
          sub="In your CRM"
        />
        <KpiCard
          delay={0.2}
          title="Active Campaigns"
          value={stats.totalCampaigns?.toLocaleString()}
          icon={<Rocket size={24} />}
          sub="Currently running"
        />
        <KpiCard
          delay={0.3}
          title="Emails Sent Today"
          value={stats.emailsSentToday?.toLocaleString()}
          icon={<Send size={24} />}
          sub="Successful sends"
        />
        <KpiCard
          delay={0.4}
          title="Pending Queue"
          value={stats.pending?.toLocaleString()}
          icon={<Clock size={24} />}
          sub="Waiting to send"
        />
        
        {/* Email Usage Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Email Usage Today</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold text-slate-800 leading-none">{stats.emailsSentToday || 0}</span>
              <span className="text-slate-500 font-medium mb-1">/ {stats.dailyLimit || 300}</span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-2 mt-4 mb-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((stats.emailsSentToday || 0) / (stats.dailyLimit || 300)) * 100)}%` }}
                transition={{ duration: 1 }}
                className={`h-2 rounded-full ${((stats.emailsSentToday || 0) >= (stats.dailyLimit || 300)) ? 'bg-red-500' : 'bg-primary'}`} 
              />
            </div>
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-600">{stats.emailsSentToday || 0} Sent</span>
            <span className="text-slate-600">{stats.remainingToday || 0} Remaining</span>
          </div>
        </motion.div>
      </div>

      {/* ── Recent Campaigns Table ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl"
      >
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-background/50">
          <h3 className="text-lg font-bold text-text">Active Campaigns</h3>
          <Link to="/email/campaigns" className="text-primary hover:text-primary-dark text-sm font-bold flex items-center gap-1 transition-colors">
            View all
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>

        {!stats.recentCampaigns?.length ? (
          <div className="py-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6">
              <Inbox size={40} />
            </div>
            <p className="font-bold text-text text-lg mb-2">No campaigns yet</p>
            <p className="text-text-muted text-sm mb-6 max-w-sm">Create your first campaign to start automated email outreach.</p>
            <Link to="/email/campaigns" className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-colors">
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="text-xs uppercase bg-background text-text-muted font-bold border-b border-border">
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
              <tbody className="divide-y divide-border">
                {stats.recentCampaigns.map((c, i) => {
                  const targetContacts = c.stats?.totalContacts || 0;
                  const totalSent = c.stats?.totalSent || c.stats?.delivered || 0; // fallback just in case
                  const pending = c.stats?.pending || 0;
                  const failed = c.stats?.failed || 0;
                  const pct = targetContacts > 0 ? Math.round((totalSent / targetContacts) * 100) : 0;
                  
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + (i * 0.05) }}
                      key={c._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-800 max-w-[160px] truncate">{c.name}</td>
                      <td className="px-6 py-4 font-semibold text-slate-500">{targetContacts}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">{totalSent}</td>
                      <td className="px-6 py-4 text-red-600 font-bold">{failed}</td>
                      <td className="px-6 py-4 text-amber-600 font-bold">{pending}</td>
                      <td className="px-6 py-4 min-w-[120px]">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1 }}
                              className="bg-primary h-2 rounded-full" 
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      {/* ── Admin Only: Email Sender Accounts Table ── */}
      {user?.role === 'admin' && stats.senders && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl"
        >
          <div className="px-6 py-5 border-b border-border bg-background/50">
            <h3 className="text-lg font-bold text-text">Email Sender Accounts</h3>
            <p className="text-sm text-text-muted mt-1">Employees with connected Brevo accounts.</p>
          </div>
          
          {!stats.senders.length ? (
            <div className="p-6 text-center text-text-muted text-sm font-semibold">
              No employees have connected a Brevo account yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text">
                <thead className="text-xs uppercase bg-background text-text-muted font-bold border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Employee</th>
                    <th className="px-6 py-4 font-semibold">Sender Email</th>
                    <th className="px-6 py-4 font-semibold">Sent Today</th>
                    <th className="px-6 py-4 font-semibold">Daily Limit</th>
                    <th className="px-6 py-4 font-semibold">Remaining</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.senders.map((sender, i) => {
                    const limitReached = sender.brevo.remainingToday <= 0;
                    return (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.0 + (i * 0.05) }}
                        key={sender._id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800">{sender.firstName} {sender.lastName}</td>
                        <td className="px-6 py-4 text-slate-500">{sender.brevo.senderEmail}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{sender.brevo.emailsSentToday}</td>
                        <td className="px-6 py-4 text-slate-500">{sender.brevo.dailyLimit}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{sender.brevo.remainingToday}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${limitReached ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {limitReached ? 'Limit Reached' : 'Available'}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;
