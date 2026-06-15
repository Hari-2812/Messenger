import { useEffect, useState, useCallback } from 'react';
import { campaignsAPI, logsAPI } from '../services/api';
import { connectSocket } from '../services/socket';

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async (campaignId = '', p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (campaignId) params.campaignId = campaignId;

      const res = await logsAPI.getAll(params);
      const data = res.data;

      // Support both paginated and legacy flat array response
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 1);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    campaignsAPI.getAll({ limit: 100 }).then((res) => {
      const data = res.data;
      setCampaigns(Array.isArray(data) ? data : (data.campaigns || []));
    }).catch(() => {});
    fetchLogs();
  }, [fetchLogs]);

  // Socket.io — real-time delivery status updates
  useEffect(() => {
    const socket = connectSocket();
    socket.emit('subscribe:logs');

    const handleStatusUpdate = (update) => {
      setLogs((prev) =>
        prev.map((log) => {
          if (log._id !== update.logId) return log;
          return {
            ...log,
            status: update.status,
            deliveredAt: update.deliveredAt || log.deliveredAt,
            readAt: update.readAt || log.readAt,
            failureReason: update.failureReason || log.failureReason,
          };
        })
      );
    };

    socket.on('log:status_update', handleStatusUpdate);

    return () => {
      socket.off('log:status_update', handleStatusUpdate);
    };
  }, []);

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setFilterCampaign(value);
    setPage(1);
    fetchLogs(value, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchLogs(filterCampaign, newPage);
  };

  // Status summary counts
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

      {/* Real-time indicator */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
        <span className="text-xs text-gray-500">Live updates — delivery statuses update in real-time</span>
      </div>

      {/* Filters & Summary */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <select value={filterCampaign} onChange={handleFilterChange} className="input-field w-64">
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c._id} value={c._id}>{c.campaignName}</option>
          ))}
        </select>
        <p className="text-sm text-gray-500">{total} log entries</p>
      </div>

      {/* Delivery Status Summary Pills */}
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

      {/* Logs Table */}
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
          <>
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
                      <tr key={log._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {total} total
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Logs;
