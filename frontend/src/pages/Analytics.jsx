import { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';

/* ── Rate Bar ─────────────────────────────────────────────────────── */
const RateBar = ({ label, value = 0, count, color, emoji }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-gray-700">{emoji} {label}</span>
      <div className="flex items-center gap-2">
        {count !== undefined && <span className="text-xs text-gray-400">{count?.toLocaleString()}</span>}
        <span className="font-bold text-gray-900">{value}%</span>
      </div>
    </div>
    <div className="progress-bar h-3">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  </div>
);

/* ── KPI Card ─────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, icon, color }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between mb-3">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
        style={{ background: `${color}18` }}
      >
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">30 days</span>
    </div>
    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
    <p className="text-3xl font-extrabold text-gray-900 mt-1">{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

/* ── Campaign Row ──────────────────────────────────────────────────── */
const CampaignRow = ({ c }) => {
  const total = c.sentCount || 1;
  const delivPct = Math.round(((c.deliveredCount || 0) / total) * 100);
  const readPct  = Math.round(((c.readCount || 0) / total) * 100);

  return (
    <tr>
      <td className="font-semibold text-gray-900 max-w-[180px] truncate">{c.campaignName}</td>
      <td className="font-medium">{c.sentCount}</td>
      <td>
        <div className="flex items-center gap-2">
          <div className="progress-bar w-16 h-1.5">
            <div className="progress-fill h-full" style={{ width: `${delivPct}%`, background: '#25d366' }} />
          </div>
          <span className="text-emerald-600 font-semibold">{c.deliveredCount || 0}</span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <div className="progress-bar w-16 h-1.5">
            <div className="progress-fill h-full" style={{ width: `${readPct}%`, background: '#6366f1' }} />
          </div>
          <span className="text-primary-600 font-semibold">{c.readCount || 0}</span>
        </div>
      </td>
      <td className="text-red-500 font-semibold">{c.failedCount || 0}</td>
      <td className="text-amber-600 font-semibold">{c.replyCount || 0}</td>
    </tr>
  );
};

/* ── Analytics Page ────────────────────────────────────────────────── */
const Analytics = () => {
  const [data, setData]   = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsAPI.get()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics'));
  }, []);

  if (error) return (
    <div className="alert-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {error}
    </div>
  );

  if (!data) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
      <div className="skeleton h-56 rounded-2xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Campaign performance and delivery insights</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Messages Sent"
          value={data.totalMessagesSent?.toLocaleString()}
          icon="📤"
          color="#6366f1"
          sub="Total dispatched"
        />
        <KpiCard
          label="Delivery Rate"
          value={`${data.deliveredRate}%`}
          sub={`${data.delivered?.toLocaleString()} delivered`}
          icon="✅"
          color="#25d366"
        />
        <KpiCard
          label="Read Rate"
          value={`${data.readRate}%`}
          sub={`${data.read?.toLocaleString()} opened`}
          icon="👁️"
          color="#f59e0b"
        />
        <KpiCard
          label="Replies"
          value={data.customerReplies?.toLocaleString()}
          sub={`${data.conversionRate}% conversion`}
          icon="💬"
          color="#8b5cf6"
        />
      </div>

      {/* ── Performance Bars ── */}
      <div className="card">
        <div className="section-header mb-6">
          <h2 className="section-title">Funnel Performance</h2>
          <span className="badge badge-primary">All Campaigns</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
          <RateBar
            label="Delivered"
            value={data.deliveredRate}
            count={data.delivered}
            color="linear-gradient(90deg, #25d366, #128c7e)"
            emoji="✅"
          />
          <RateBar
            label="Read"
            value={data.readRate}
            count={data.read}
            color="linear-gradient(90deg, #6366f1, #4f46e5)"
            emoji="👁️"
          />
          <RateBar
            label="Failed"
            value={data.failedRate}
            count={data.failed}
            color="linear-gradient(90deg, #ef4444, #dc2626)"
            emoji="❌"
          />
          <RateBar
            label="Conversion"
            value={data.conversionRate}
            count={data.customerReplies}
            color="linear-gradient(90deg, #f59e0b, #d97706)"
            emoji="🔁"
          />
        </div>
      </div>

      {/* ── Campaign Breakdown Table ── */}
      <div className="card p-0 overflow-hidden">
        <div className="section-header px-6 pt-5 pb-4 border-b border-gray-50">
          <h2 className="section-title">Campaign Breakdown</h2>
          <span className="text-xs text-gray-400">{(data.recentCampaigns || []).length} campaigns</span>
        </div>
        {(!data.recentCampaigns || data.recentCampaigns.length === 0) ? (
          <div className="empty-state py-10">
            <p className="empty-state-icon">📊</p>
            <p className="font-semibold text-gray-700">No campaign data yet</p>
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Read</th>
                  <th>Failed</th>
                  <th>Replies</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCampaigns.map((c) => (
                  <CampaignRow key={c._id} c={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Analytics;
