import { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';

const Stat = ({ label, value, sub }) => (
  <div className="card">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-3xl font-bold text-gray-900 mt-2">{value ?? 0}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const Analytics = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsAPI.get()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics'));
  }, []);

  if (error) return <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading analytics...</div>;

  const bars = [
    { label: 'Delivered', value: data.deliveredRate, color: 'bg-green-500' },
    { label: 'Read', value: data.readRate, color: 'bg-blue-500' },
    { label: 'Failed', value: data.failedRate, color: 'bg-red-500' },
    { label: 'Replies', value: data.conversionRate, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Stat label="Total Messages Sent" value={data.totalMessagesSent} />
        <Stat label="Delivered Rate" value={`${data.deliveredRate}%`} sub={`${data.delivered} delivered`} />
        <Stat label="Read Rate" value={`${data.readRate}%`} sub={`${data.read} read`} />
        <Stat label="Customer Replies" value={data.customerReplies} sub={`${data.conversionRate}% conversion`} />
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-5">Campaign Performance</h2>
        <div className="space-y-4">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">{bar.label}</span>
                <span className="font-medium">{bar.value}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${bar.color}`} style={{ width: `${Math.min(bar.value, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Campaigns</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Campaign</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Sent</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Delivered</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Read</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Failed</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Replies</th>
            </tr>
          </thead>
          <tbody>
            {(data.recentCampaigns || []).map((campaign) => (
              <tr key={campaign._id} className="border-t border-gray-100">
                <td className="py-3 px-4 font-medium">{campaign.campaignName}</td>
                <td className="py-3 px-4">{campaign.sentCount}</td>
                <td className="py-3 px-4">{campaign.deliveredCount}</td>
                <td className="py-3 px-4">{campaign.readCount}</td>
                <td className="py-3 px-4">{campaign.failedCount}</td>
                <td className="py-3 px-4">{campaign.replyCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics;
