import { useEffect, useState } from 'react';
import { campaignsAPI, logsAPI } from '../services/api';

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

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="flex justify-between items-center">
        <select value={filterCampaign} onChange={handleFilterChange} className="input-field w-64">
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c._id} value={c._id}>{c.campaignName}</option>
          ))}
        </select>
        <p className="text-sm text-gray-500">{logs.length} log entries</p>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No message logs yet. Send a campaign to see logs.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Timestamp</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Message</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{log.campaignId?.campaignName || '-'}</td>
                    <td className="py-3 px-4">{log.contactId?.name || '-'}</td>
                    <td className="py-3 px-4">{log.phone}</td>
                    <td className="py-3 px-4 max-w-xs truncate" title={log.message}>{log.message}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
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

export default Logs;
