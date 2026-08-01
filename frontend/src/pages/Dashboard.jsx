import { useEffect, useState, useCallback } from 'react';
import { logsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Mini Donut Chart ──────────────────────────────────────────────── */
const DonutRing = ({ value = 0, max = 100, color = '#241252', size = 64, stroke = 7 }) => {
  const pct  = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke}/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fontSize="13" fontWeight="700" fill={color}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

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

/* ── Mini Stat Bar Card ─────────────────────────────────────────────── */
const MiniStat = ({ label, value, total, color, emoji }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="card-sm bg-white border border-border"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted font-bold">{emoji} {label}</span>
        <span className="text-sm font-extrabold text-text">{value?.toLocaleString()}</span>
      </div>
      <div className="progress-bar bg-border">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.2 }}
          className="h-full rounded-full" 
          style={{ background: color }} 
        />
      </div>
      <p className="text-xs text-text-muted mt-1.5 font-medium">{pct}% of total</p>
    </motion.div>
  );
};

/* ── Status Badge ───────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    draft:     'badge bg-border text-text-muted',
    sending:   'badge bg-status-warning/10 text-status-warning',
    completed: 'badge bg-status-success/10 text-status-success',
    partial:   'badge bg-accent/10 text-accent',
    failed:    'badge bg-status-danger/10 text-status-danger',
  };
  return (
    <span className={`${map[status] || 'badge bg-border text-text-muted'} capitalize`}>
      {status === 'completed' && '✓ '}
      {status === 'sending' && '⟳ '}
      {status === 'failed' && '✗ '}
      {status}
    </span>
  );
};

/* ── Skeleton Block ─────────────────────────────────────────────────── */
const Skel = ({ className }) => (
  <div className={`skeleton ${className}`} />
);

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
      const res = await logsAPI.getDashboard();
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
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 skeleton rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skel key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skel className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 flex-shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <p className="font-bold">Failed to load dashboard</p>
          <p className="text-sm mt-0.5 opacity-90">{error}</p>
          <button onClick={() => fetchStats()} className="text-sm underline mt-2 font-semibold">Try again</button>
        </div>
      </motion.div>
    );
  }

  const totalDelivered  = (stats.totalMessagesDelivered || 0) + (stats.totalMessagesRead || 0);
  const totalSent       = stats.totalMessagesSent || 0;
  const deliveryRate    = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const readRate        = totalSent > 0 ? Math.round(((stats.totalMessagesRead || 0) / totalSent) * 100) : 0;
  const failedRate      = totalSent > 0 ? Math.round(((stats.totalMessagesFailed || 0) / totalSent) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <AnimatePresence>
        {stats.hasBillingError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="alert-error flex items-start gap-4 p-5 bg-status-danger/10 border border-status-danger/20 text-status-danger rounded-xl shadow-sm"
          >
            <span className="text-2xl drop-shadow-sm">⚠️</span>
            <div>
              <h4 className="font-extrabold text-base">WATI credits exhausted</h4>
              <p className="text-sm mt-1 font-medium text-status-danger/80">Recharge your WATI account to continue sending campaigns.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-3xl tracking-tight">Dashboard</h1>
          <p className="page-subtitle text-base font-medium">Overview of your Omnichannel CRM</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="btn-ghost bg-white shadow-sm font-semibold"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </motion.button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/campaigns" className="btn-primary bg-gradient-to-r from-primary to-secondary shadow-lg">
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
          gradient="linear-gradient(135deg, #241252 0%, #31206B 100%)"
          sub="In your CRM"
        />
        <KpiCard
          delay={0.2}
          title="Total Campaigns"
          value={stats.totalCampaigns?.toLocaleString()}
          icon="📢"
          gradient="linear-gradient(135deg, #F57C20 0%, #FF8F3D 100%)"
          sub="All time"
        />
        <KpiCard
          delay={0.3}
          title="Messages Sent"
          value={totalSent?.toLocaleString()}
          icon="📤"
          gradient="linear-gradient(135deg, #16A34A 0%, #15803d 100%)"
          sub={`${deliveryRate}% delivery rate`}
        />
        <KpiCard
          delay={0.4}
          title="Messages Read"
          value={stats.totalMessagesRead?.toLocaleString()}
          icon="👁️"
          gradient="linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
          sub={`${readRate}% open rate`}
        />
      </div>

      {/* ── Analytics Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Delivery Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card lg:col-span-2 border-border shadow-card"
        >
          <div className="section-header">
            <h3 className="section-title tracking-tight">Delivery Overview</h3>
            <span className="badge bg-primary/10 text-primary font-bold px-3 py-1">All Campaigns</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat label="Sent"      value={stats.totalMessagesSent || 0}      total={totalSent} color="#31206B" emoji="📤" />
            <MiniStat label="Delivered" value={stats.totalMessagesDelivered || 0} total={totalSent} color="#16A34A" emoji="✅" />
            <MiniStat label="Read"      value={stats.totalMessagesRead || 0}      total={totalSent} color="#0284c7" emoji="👁️" />
            <MiniStat label="Failed"    value={stats.totalMessagesFailed || 0}    total={totalSent} color="#DC2626" emoji="❌" />
          </div>
        </motion.div>

        {/* Delivery Rate Donut */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card flex flex-col items-center justify-center text-center border-border shadow-card"
        >
          <h3 className="section-title mb-6 tracking-tight">Delivery Rate</h3>
          <DonutRing value={deliveryRate} max={100} color="#241252" size={140} stroke={12} />
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-bold text-text-muted">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-status-success"/> Delivered: {deliveryRate}%</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0284c7]"/> Read: {readRate}%</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-status-danger"/> Failed: {failedRate}%</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent"/> Pending: {Math.max(0, 100 - deliveryRate - failedRate)}%</span>
          </div>
        </motion.div>
      </div>

      {/* ── Recent Campaigns Table ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="card p-0 overflow-hidden border-border shadow-card"
      >
        <div className="section-header px-6 pt-6 pb-4 border-b border-border bg-background/50">
          <h3 className="section-title tracking-tight">Recent Campaigns</h3>
          <Link to="/campaigns" className="text-primary hover:text-primary-hover text-sm font-bold flex items-center gap-1 transition-colors">
            View all
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>

        {!stats.recentCampaigns?.length ? (
          <div className="empty-state py-16 bg-white">
            <p className="empty-state-icon text-6xl">📭</p>
            <p className="font-extrabold text-text text-lg mb-2">No campaigns yet</p>
            <p className="empty-state-text text-text-muted text-base">Create your first campaign to start sending WhatsApp messages.</p>
            <Link to="/campaigns" className="btn-primary mt-6 text-sm bg-gradient-to-r from-primary to-secondary shadow-lg">
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0 bg-white">
            <table className="table">
              <thead className="bg-background/80">
                <tr>
                  <th className="font-bold text-text-muted">Campaign</th>
                  <th className="font-bold text-text-muted">Template</th>
                  <th className="font-bold text-text-muted">Total</th>
                  <th className="font-bold text-text-muted">Sent</th>
                  <th className="font-bold text-text-muted">Delivered</th>
                  <th className="font-bold text-text-muted">Failed</th>
                  <th className="font-bold text-text-muted">Status</th>
                  <th className="font-bold text-text-muted">Progress</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((c, i) => {
                  const pct = c.totalContacts > 0
                    ? Math.round(((c.sentCount + c.failedCount) / c.totalContacts) * 100)
                    : 0;
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + (i * 0.05) }}
                      key={c._id}
                      className="border-b border-border hover:bg-background/50 transition-colors"
                    >
                      <td className="font-bold text-text max-w-[160px] truncate">{c.campaignName}</td>
                      <td>
                        {c.metaTemplateName ? (
                          <span className="chip font-mono bg-border text-text font-bold">{c.metaTemplateName}</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="font-bold text-text-muted">{c.totalContacts}</td>
                      <td className="text-primary font-bold">{c.sentCount}</td>
                      <td className="text-status-success font-bold">{c.deliveredCount || 0}</td>
                      <td className="text-status-danger font-bold">{c.failedCount}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="min-w-[100px]">
                        <div className="progress-bar bg-border h-2">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1 }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" 
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1.5 font-bold">{pct}%</p>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Quick Links ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { to: '/contacts',        icon: '👥', label: 'Manage Contacts',  color: '#241252' },
          { to: '/templates',       icon: '📄', label: 'View Templates',   color: '#31206B' },
          { to: '/whatsapp-inbox',  icon: '💬', label: 'Open Inbox',       color: '#16A34A' },
          { to: '/wati/settings',   icon: '⚙️', label: 'Settings',          color: '#F57C20' },
        ].map((item, i) => (
          <motion.div key={item.to} whileHover={{ y: -4, scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Link
              to={item.to}
              className="card-sm flex items-center gap-4 bg-white border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: `${item.color}15`, color: item.color }}
              >
                {item.icon}
              </div>
              <span className="text-sm font-bold text-text">{item.label}</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>

    </motion.div>
  );
};

export default Dashboard;
