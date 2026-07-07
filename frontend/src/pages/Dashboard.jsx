import { useEffect, useState, useCallback } from 'react';
import { logsAPI } from '../services/api';
import { Link } from 'react-router-dom';

/* ── Mini Donut Chart ──────────────────────────────────────────────── */
const DonutRing = ({ value = 0, max = 100, color = '#4f46e5', size = 64, stroke = 7 }) => {
  const pct  = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0e7ff" strokeWidth={stroke}/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fontSize="13" fontWeight="700" fill={color}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

/* ── KPI Stat Card ─────────────────────────────────────────────────── */
const KpiCard = ({ title, value, sub, icon, gradient, trend }) => (
  <div
    className="rounded-2xl p-5 text-white relative overflow-hidden"
    style={{ background: gradient, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
  >
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 translate-x-8 -translate-y-8" />
    <div className="absolute bottom-0 right-8 w-16 h-16 rounded-full bg-white/5 translate-y-6" />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        {trend !== undefined && (
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">{title}</p>
      <p className="text-3xl font-extrabold leading-none">{value ?? '—'}</p>
      {sub && <p className="text-white/60 text-xs mt-1.5">{sub}</p>}
    </div>
  </div>
);

/* ── Mini Stat Bar Card ─────────────────────────────────────────────── */
const MiniStat = ({ label, value, total, color, emoji }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="card-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{emoji} {label}</span>
        <span className="text-sm font-bold text-gray-900">{value?.toLocaleString()}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{pct}% of total</p>
    </div>
  );
};

/* ── Status Badge ───────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    draft:     'badge bg-gray-100 text-gray-600',
    sending:   'badge bg-amber-100 text-amber-700',
    completed: 'badge bg-emerald-100 text-emerald-700',
    partial:   'badge bg-orange-100 text-orange-700',
    failed:    'badge bg-red-100 text-red-700',
  };
  return (
    <span className={map[status] || 'badge badge-gray'}>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skel key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skel className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 flex-shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <p className="font-semibold">Failed to load dashboard</p>
          <p className="text-xs mt-0.5 opacity-80">{error}</p>
          <button onClick={() => fetchStats()} className="text-xs underline mt-1.5">Try again</button>
        </div>
      </div>
    );
  }

  const totalDelivered  = (stats.totalMessagesDelivered || 0) + (stats.totalMessagesRead || 0);
  const totalSent       = stats.totalMessagesSent || 0;
  const deliveryRate    = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const readRate        = totalSent > 0 ? Math.round(((stats.totalMessagesRead || 0) / totalSent) * 100) : 0;
  const failedRate      = totalSent > 0 ? Math.round(((stats.totalMessagesFailed || 0) / totalSent) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {stats.hasBillingError && (
        <div className="alert-error flex items-start gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="font-bold">WATI credits exhausted</h4>
            <p className="text-sm mt-1">Recharge your WATI account to continue sending campaigns.</p>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your WhatsApp CRM campaigns</p>
        </div>
        <div className="flex gap-2">
          <button
            id="refresh-dashboard-btn"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="btn-ghost text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link to="/campaigns" className="btn-primary text-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Campaign
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Contacts"
          value={stats.totalContacts?.toLocaleString()}
          icon="👥"
          gradient="linear-gradient(135deg, #4f46e5, #7c3aed)"
          sub="In your CRM"
        />
        <KpiCard
          title="Total Campaigns"
          value={stats.totalCampaigns?.toLocaleString()}
          icon="📢"
          gradient="linear-gradient(135deg, #0ea5e9, #6366f1)"
          sub="All time"
        />
        <KpiCard
          title="Messages Sent"
          value={totalSent?.toLocaleString()}
          icon="📤"
          gradient="linear-gradient(135deg, #25d366, #128c7e)"
          sub={`${deliveryRate}% delivery rate`}
        />
        <KpiCard
          title="Messages Read"
          value={stats.totalMessagesRead?.toLocaleString()}
          icon="👁️"
          gradient="linear-gradient(135deg, #f59e0b, #ef4444)"
          sub={`${readRate}% open rate`}
        />
      </div>

      {/* ── Analytics Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Delivery Overview */}
        <div className="card lg:col-span-2">
          <div className="section-header">
            <h3 className="section-title">Delivery Overview</h3>
            <span className="badge badge-primary">All Campaigns</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label="Sent"      value={stats.totalMessagesSent || 0}      total={totalSent} color="#6366f1" emoji="📤" />
            <MiniStat label="Delivered" value={stats.totalMessagesDelivered || 0} total={totalSent} color="#25d366" emoji="✅" />
            <MiniStat label="Read"      value={stats.totalMessagesRead || 0}      total={totalSent} color="#f59e0b" emoji="👁️" />
            <MiniStat label="Failed"    value={stats.totalMessagesFailed || 0}    total={totalSent} color="#ef4444" emoji="❌" />
          </div>
        </div>

        {/* Delivery Rate Donut */}
        <div className="card flex flex-col items-center justify-center text-center">
          <h3 className="section-title mb-4">Delivery Rate</h3>
          <DonutRing value={deliveryRate} max={100} color="#4f46e5" size={100} stroke={10} />
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
            <span>🟢 Delivered: {deliveryRate}%</span>
            <span>👁 Read: {readRate}%</span>
            <span>🔴 Failed: {failedRate}%</span>
            <span>⏳ Pending: {Math.max(0, 100 - deliveryRate - failedRate)}%</span>
          </div>
        </div>
      </div>

      {/* ── Recent Campaigns Table ── */}
      <div className="card p-0 overflow-hidden">
        <div className="section-header px-6 pt-5 pb-4 border-b border-gray-50">
          <h3 className="section-title">Recent Campaigns</h3>
          <Link to="/campaigns" className="text-primary-600 hover:text-primary-700 text-sm font-semibold flex items-center gap-1">
            View all
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>

        {!stats.recentCampaigns?.length ? (
          <div className="empty-state py-12">
            <p className="empty-state-icon">📭</p>
            <p className="font-semibold text-gray-700 mb-1">No campaigns yet</p>
            <p className="empty-state-text">Create your first campaign to start sending WhatsApp messages.</p>
            <Link to="/campaigns" className="btn-primary mt-4 text-sm">
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Template</th>
                  <th>Total</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Failed</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((c) => {
                  const pct = c.totalContacts > 0
                    ? Math.round(((c.sentCount + c.failedCount) / c.totalContacts) * 100)
                    : 0;
                  return (
                    <tr key={c._id}>
                      <td className="font-semibold text-gray-900 max-w-[160px] truncate">{c.campaignName}</td>
                      <td>
                        {c.metaTemplateName ? (
                          <span className="chip font-mono">{c.metaTemplateName}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="font-medium">{c.totalContacts}</td>
                      <td className="text-primary-600 font-semibold">{c.sentCount}</td>
                      <td className="text-emerald-600 font-semibold">{c.deliveredCount || 0}</td>
                      <td className="text-red-500 font-semibold">{c.failedCount}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="min-w-[80px]">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{pct}%</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: '/contacts',        icon: '👥', label: 'Manage Contacts',  color: '#4f46e5' },
          { to: '/templates',       icon: '📄', label: 'View Templates',   color: '#7c3aed' },
          { to: '/whatsapp-inbox',  icon: '💬', label: 'Open Inbox',       color: '#25d366' },
          { to: '/wati/settings',   icon: '⚙️', label: 'WATI Settings',   color: '#0ea5e9' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="card-sm flex items-center gap-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${item.color}15` }}
            >
              {item.icon}
            </div>
            <span className="text-sm font-semibold text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
