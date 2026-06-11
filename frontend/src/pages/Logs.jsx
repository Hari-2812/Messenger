import { useEffect, useState } from 'react';
import { campaignsAPI, logsAPI } from '../services/api';

const statusConfig = {
  pending:   { color: 'bg-gray-100 text-gray-600',    label: '⏳ Pending' },
  sent:      { color: 'bg-blue-100 text-blue-700',    label: '📤 Sent' },
  delivered: { color: 'bg-green-100 text-green-700',  label: '✅ Delivered' },
  read:      { color: 'bg-purple-100 text-purple-700', label: '👁 Read' },
  failed:    { color: 'bg-red-100 text-red-700',      label: '❌ Failed' },
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');

  const fetchLogs = (campaignId = '') => {
    setLoading(true);
    const params = campaignId ? { campaignId } : {};
    logsAPI
      .getAll(params)
      .then((res) => setLogs(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    campaignsAPI.getAll().then((res) => setCampaigns(res.data)).catch(() => {});
    fetchLogs();
  }, []);

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setFilterCampaign(value);
    fetchLogs(value);
  };

  // Status summary counts for the filtered view
  const statusCounts = logs.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── Filters & Summary ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <select value={filterCampaign} onChange={handleFilterChange} className="input-field w-64">
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c._id} value={c._id}>{c.campaignName}</option>
          ))}
        </select>
        <p className="text-sm text-gray-500">{logs.length} log entries</p>
      </div>

      {/* ── Delivery Status Summary ── */}
      {logs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(statusConfig).map(([status, cfg]) =>
            statusCounts[status] ? (
              <span key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                {cfg.label}: {statusCounts[status]}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* ── Logs Table ── */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No message logs yet. Send a campaign to see delivery tracking here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Timestamp</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Template / Message</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Meta ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const cfg = statusConfig[log.status] || statusConfig.pending;
                  return (
                    <tr key={log._id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{log.campaignId?.campaignName || '—'}</td>
                      <td className="py-3 px-4">{log.contactId?.name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs">{log.phone}</td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-xs text-gray-600 truncate block" title={log.message}>
                          {log.message || '—'}
                        </span>
                        {log.failureReason && (
                          <span className="text-xs text-red-500 block mt-1" title={log.failureReason}>
                            ⚠ {log.failureReason.substring(0, 60)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {log.deliveredAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Delivered: {new Date(log.deliveredAt).toLocaleTimeString()}
                          </div>
                        )}
                        {log.readAt && (
                          <div className="text-xs text-purple-400 mt-0.5">
                            Read: {new Date(log.readAt).toLocaleTimeString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log.metaMessageId ? (
                          <span className="font-mono text-xs text-gray-400 break-all">
                            {log.metaMessageId.substring(0, 20)}…
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;
