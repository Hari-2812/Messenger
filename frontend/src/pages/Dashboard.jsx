import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { logsAPI } from '../services/api';

const StatCard = ({ title, value, icon, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  sending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    logsAPI
      .getDashboard()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Contacts" value={stats.totalContacts} icon="👥" color="bg-blue-100" />
        <StatCard title="Total Templates" value={stats.totalTemplates} icon="📝" color="bg-purple-100" />
        <StatCard title="Total Campaigns" value={stats.totalCampaigns} icon="📢" color="bg-orange-100" />
        <StatCard title="Messages Sent" value={stats.totalMessagesSent} icon="✅" color="bg-green-100" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
          <Link to="/campaigns" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all →
          </Link>
        </div>

        {stats.recentCampaigns?.length === 0 ? (
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Contacts</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Sent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((campaign) => (
                  <tr key={campaign._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{campaign.campaignName}</td>
                    <td className="py-3 px-4">{campaign.templateId?.title || '-'}</td>
                    <td className="py-3 px-4">{campaign.totalContacts}</td>
                    <td className="py-3 px-4">{campaign.sentCount}</td>
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
