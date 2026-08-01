import { useState, useEffect } from 'react';
import { emailCampaignsAPI } from '../../services/api';

export default function EmailHistory() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data } = await emailCampaignsAPI.getAll();
      setCampaigns(data.campaigns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await emailCampaignsAPI.delete(id);
      fetchCampaigns();
    } catch (err) {
      alert('Error deleting campaign');
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="p-8 space-y-6 text-white max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#F57C20,#f59e0b)]">Campaign History</h1>
      
      <div className="bg-[#1f2937] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="p-4 font-medium text-slate-300">Campaign Name</th>
                <th className="p-4 font-medium text-slate-300">Subject</th>
                <th className="p-4 font-medium text-slate-300">Status</th>
                <th className="p-4 font-medium text-slate-300">Recipients</th>
                <th className="p-4 font-medium text-slate-300">Sent</th>
                <th className="p-4 font-medium text-slate-300">Created Date</th>
                <th className="p-4 font-medium text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campaigns.map(c => (
                <tr key={c._id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4 text-slate-300 truncate max-w-[200px]" title={c.subject}>{c.subject}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-medium ${c.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : c.status === 'Draft' ? 'bg-slate-500/20 text-slate-300' : 'bg-orange-500/20 text-orange-300'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-300">{c.stats?.totalContacts || 0}</td>
                  <td className="p-4 text-slate-300">{c.stats?.totalSent || 0}</td>
                  <td className="p-4 text-slate-300">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-right space-x-2">
                    <button className="text-sm px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors">View</button>
                    <button onClick={() => handleDelete(c._id)} className="text-sm px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">No campaigns found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
