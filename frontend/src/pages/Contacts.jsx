import { useEffect, useState, useCallback } from 'react';
import { contactsAPI, googleSheetsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const fetchContacts = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (q.trim()) params.search = q.trim();

      const res = await contactsAPI.getAll(params);
      const data = res.data;

      if (Array.isArray(data)) {
        setContacts(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setContacts(data.contacts || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 1);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts(1);
  }, [fetchContacts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchContacts(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchContacts]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchContacts(newPage, search);
  };

  const handleSyncSheet = async () => {
    setSyncing(true);
    const loadingToast = toast.loading('Syncing with Google Sheets...');
    try {
      const res = await googleSheetsAPI.syncCampaignSheet();
      if (res.data.success) {
        const d = res.data;
        toast.success(`Sync Complete: ${d.imported} New, ${d.updated} Updated, ${d.skipped} Skipped, ${d.invalid} Invalid.`, {
          id: loadingToast,
          duration: 5000
        });
        // Auto refresh
        setPage(1);
        fetchContacts(1, search);
      } else {
        toast.error(res.data.message || 'Sync failed', { id: loadingToast });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Sync failed', { id: loadingToast });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent':
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">Sent</span>;
      case 'failed':
        return <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">Failed</span>;
      case 'bounced':
        return <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 border border-orange-200">Bounced</span>;
      case 'unsubscribed':
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-300">Unsubscribed</span>;
      case 'replied':
        return <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">Replied</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">New</span>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Top Banner Message */}
      {error && (
        <div className="alert alert-error animate-fade-in">
          <span>{error}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text">Contacts</h2>
          <p className="text-base text-text-muted mt-1 font-medium">
            Manage your email campaign recipients.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSyncSheet}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <div className="spinner w-4 h-4 border-white border-t-transparent" />
                Syncing...
              </>
            ) : (
              '📁 Sync Email Campaign Sheet'
            )}
          </button>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card rounded-2xl border border-border p-4 shadow-card">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="input-field w-64 pr-10 border-border"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-text-muted">
              🔍
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted whitespace-nowrap bg-background border border-border px-3 py-1.5 rounded-xl font-bold">
            Total: <strong>{total}</strong>
          </span>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-2xl shadow-sm">
          <div className="spinner w-10 h-10 mb-4 border-primary border-t-accent" />
          <p className="text-base text-text-muted font-bold">Loading contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-2xl shadow-sm text-center">
          <div className="text-6xl mb-4 opacity-80">👥</div>
          <h4 className="text-xl font-bold text-text">No contacts yet.</h4>
          <p className="text-base text-text-muted max-w-sm mt-2 font-medium mb-6">
            Import contacts from Google Sheets to start your email campaigns.
          </p>
          <button
            onClick={handleSyncSheet}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-hover disabled:opacity-70"
          >
            {syncing ? 'Syncing...' : 'Sync Email Campaign Sheet'}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-background/80 border-b border-border">
                  <tr>
                    <th className="text-left py-4 px-5 font-bold text-text-muted">Contact</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Company</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Industry</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Location</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Status</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Added On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contacts.map((contact) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={contact._id} 
                      className="hover:bg-background/50 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-text">{contact.name}</div>
                        <div className="text-xs text-text-muted mt-0.5 font-medium">{contact.email}</div>
                        {contact.phone && <div className="text-xs text-text-muted font-mono">{contact.phone}</div>}
                      </td>
                      <td className="py-4 px-4 text-text-muted font-medium">
                        {contact.companyName || '-'}
                      </td>
                      <td className="py-4 px-4 text-text-muted font-medium">
                        {contact.industry || '-'}
                      </td>
                      <td className="py-4 px-4 text-text-muted font-medium">
                        {contact.location || '-'}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(contact.status || 'New')}
                      </td>
                      <td className="py-4 px-4 text-text-muted font-medium text-xs">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 bg-card rounded-2xl border border-border shadow-sm text-sm">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="btn-secondary text-sm py-2 px-4 disabled:opacity-40 border-border font-bold text-text-muted hover:text-text hover:bg-background"
              >
                ← Previous
              </motion.button>
              <span className="text-text-muted font-bold">
                Page {page} of {totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="btn-secondary text-sm py-2 px-4 disabled:opacity-40 border-border font-bold text-text-muted hover:text-text hover:bg-background"
              >
                Next →
              </motion.button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Contacts;
