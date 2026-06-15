import { useEffect, useState, useCallback } from 'react';
import { logsAPI } from '../services/api';
import { Link } from 'react-router-dom';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  sending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  partial: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
};

const StatCard = ({ title, value, icon, color, sub }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        {error}
        <button
          onClick={() => fetchStats()}
          className="ml-3 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalDelivered = (stats.totalMessagesDelivered || 0) + (stats.totalMessagesRead || 0);
  const deliveryRate = stats.totalMessagesSent > 0
    ? Math.round((totalDelivered / stats.totalMessagesSent) * 100)
    : null;

  return (
    <div className="space-y-8">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your WhatsApp campaigns</p>
        </div>
        <button
          id="refresh-dashboard-btn"
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 btn-secondary text-sm"
        >
          {refreshing ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <span>🔄</span>
          )}
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Contacts" value={stats.totalContacts} icon="👥" color="bg-blue-100" />
        <StatCard title="Total Campaigns" value={stats.totalCampaigns} icon="📢" color="bg-orange-100" />
        <StatCard title="Messages Sent" value={stats.totalMessagesSent} icon="📤" color="bg-green-100" />
        <StatCard
          title="Delivered / Read"
          value={totalDelivered}
          icon="✅"
          color="bg-purple-100"
          sub={deliveryRate !== null ? `${deliveryRate}% delivery rate` : null}
        />
      </div>

      {/* Message status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-blue-600">{stats.totalMessagesSent || 0}</p>
          <p className="text-xs text-gray-500 mt-1">📤 Sent</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-green-600">{stats.totalMessagesDelivered || 0}</p>
          <p className="text-xs text-gray-500 mt-1">✅ Delivered</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-purple-600">{stats.totalMessagesRead || 0}</p>
          <p className="text-xs text-gray-500 mt-1">👁 Read</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-red-600">{stats.totalMessagesFailed || 0}</p>
          <p className="text-xs text-gray-500 mt-1">❌ Failed</p>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
          <Link to="/campaigns" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all →
          </Link>
        </div>

        {!stats.recentCampaigns?.length ? (
          <div className="text-center py-12 text-gray-500">
            <p>No campaigns yet.</p>
            <Link to="/campaigns" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Template</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Sent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Failed</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((campaign) => (
                  <tr key={campaign._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{campaign.campaignName}</td>
                    <td className="py-3 px-4">
                      {campaign.metaTemplateName ? (
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {campaign.metaTemplateName}
                        </span>
                      ) : (
                        campaign.templateId?.title || '—'
                      )}
                    </td>
                    <td className="py-3 px-4">{campaign.totalContacts}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">{campaign.sentCount}</td>
                    <td className="py-3 px-4 text-red-600 font-medium">{campaign.failedCount}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
