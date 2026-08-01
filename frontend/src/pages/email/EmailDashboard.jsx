import { useState, useEffect } from 'react';
import { emailCampaignsAPI } from '../../services/api';
import Card from '../../components/ui/Card';

export default function EmailDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await emailCampaignsAPI.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading dashboard...</div>;

  return (
    <div className="p-8 space-y-6 text-white max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#F57C20,#f59e0b)]">Email Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Contacts" value={stats?.totalContacts} />
        <StatCard title="Total Campaigns" value={stats?.totalCampaigns} />
        <StatCard title="Emails Sent Today" value={stats?.emailsSentToday} />
        <StatCard title="Delivered" value={stats?.delivered} />
        <StatCard title="Failed" value={stats?.failed} />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Campaigns</h2>
        <div className="bg-[#1f2937] rounded-xl overflow-hidden border border-white/10">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Sent</th>
                <th className="p-4 font-medium">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentCampaigns?.map(c => (
                <tr key={c._id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">{c.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${c.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-orange-500/20 text-orange-300'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4">{c.stats?.totalSent || 0}</td>
                  <td className="p-4">{c.stats?.delivered || 0}</td>
                </tr>
              ))}
              {(!stats?.recentCampaigns || stats.recentCampaigns.length === 0) && (
                <tr><td colSpan="4" className="p-4 text-center text-slate-400">No recent campaigns.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-[#241252]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
      <h3 className="text-sm font-medium text-slate-400 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white">{value || 0}</p>
    </div>
  );
}
