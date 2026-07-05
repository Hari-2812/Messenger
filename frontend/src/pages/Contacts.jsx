import { useEffect, useState, useCallback } from 'react';
import { contactsAPI } from '../services/api';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', tags: '', customFields: '' });
  const [importing, setImporting] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', tags: '', customFields: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const parsedTags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      let parsedCustomFields = {};
      if (form.customFields) {
        try {
          parsedCustomFields = JSON.parse(form.customFields);
        } catch {
          throw new Error('Custom Fields must be a valid JSON object');
        }
      }

      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        tags: parsedTags,
        customFields: parsedCustomFields
      };

      if (editingId) {
        await contactsAPI.update(editingId, payload);
        setSuccess('Contact updated successfully');
      } else {
        await contactsAPI.create(payload);
        setSuccess('Contact created successfully');
      }
      resetForm();
      fetchContacts(page, search);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (contact) => {
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      tags: (contact.tags || []).join(', '),
      customFields: contact.customFields ? JSON.stringify(contact.customFields, null, 2) : ''
    });
    setEditingId(contact._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await contactsAPI.delete(id);
      setSuccess('Contact deleted successfully');
      fetchContacts(page, search);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await contactsAPI.importCSV(file);
      setSuccess(
        `Import complete: ${data.imported} imported, ${data.synced ?? 0} synced, ${data.failed ?? 0} failed, ${data.pending ?? 0} pending, ${data.skipped} skipped`
      );
      fetchContacts(1, search);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await contactsAPI.syncAll();
      setSuccess(
        data.message ||
          `Sync complete: ${data.synced ?? 0} synced, ${data.failed ?? 0} failed out of ${data.total ?? 0}`
      );
      fetchContacts(page, search);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Bulk synchronization failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleRetrySync = async (id) => {
    setRetryingId(id);
    setError('');
    setSuccess('');
    try {
      const { data } = await contactsAPI.retrySync(id);
      if (data.success) {
        setSuccess(data.message || 'Contact synced with WATI');
      } else {
        setError(data.error || 'Sync retry failed');
      }
      fetchContacts(page, search);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const errData = err.response?.data;
      setError(errData?.error || errData?.message || 'Sync retry failed');
      fetchContacts(page, search);
    } finally {
      setRetryingId(null);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchContacts(newPage, search);
  };

  const getSyncStatusBadge = (status) => {
    switch (status) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
            🟢 Synced
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">
            🔴 Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
            🟡 Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {error && (
        <div className="alert alert-error animate-fade-in">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success animate-fade-in">
          <span>{success}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Contacts Catalog</h2>
          <p className="text-sm text-slate-500 mt-1">
            Synchronize, group, and manage custom contact information with your WATI WhatsApp CRM.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50"
          >
            {syncingAll ? 'Syncing...' : '🔄 Sync All'}
          </button>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            id="add-contact-btn"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary"
          >
            + Add New Contact
          </button>
          <label className="btn-secondary cursor-pointer">
            {importing ? 'Importing CSV...' : '📁 Import CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
              disabled={importing}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              id="contact-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="input-field w-64 pr-10"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              🔍
            </span>
          </div>
          <span className="text-sm text-slate-500 whitespace-nowrap bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
            Total: <strong>{total}</strong>
          </span>
        </div>
      </div>

      {/* Add / Edit Form Drawer/Panel */}
      {showForm && (
        <div className="card border-indigo-100 bg-indigo-50/20 p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-slate-900 mb-4">{editingId ? 'Edit Contact Profile' : 'Create New Contact Profile'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="label">Full Name</label>
                <input
                  id="contact-name"
                  placeholder="Enter name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Phone Number (with Country Code)</label>
                <input
                  id="contact-phone"
                  placeholder="e.g. 919876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Email Address (Optional)</label>
                <input
                  id="contact-email"
                  placeholder="e.g. name@domain.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Tags (comma separated)</label>
                <input
                  placeholder="e.g. Lead, VIP, Student"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="form-group">
                <label className="label">Custom JSON Fields (Optional)</label>
                <textarea
                  placeholder='e.g. { "school": "Hogwarts", "year": "2026" }'
                  value={form.customFields}
                  onChange={(e) => setForm({ ...form, customFields: e.target.value })}
                  className="input-field h-16 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button id="contact-save-btn" type="submit" className="btn-primary">
                {editingId ? 'Save Updates' : 'Create Contact'}
              </button>
              <button type="button" onClick={resetForm} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Grid: Table or Card display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading your contact catalog...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
          <div className="text-4xl mb-3">👥</div>
          <h4 className="text-base font-semibold text-slate-800">No Contacts Found</h4>
          <p className="text-sm text-slate-500 max-w-xs mt-1">
            {search ? 'Adjust your search parameters and try again.' : 'Populate your database by creating a contact or importing a CSV file.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-3.5 px-4 font-semibold text-slate-500">Contact Details</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-slate-500">Phone</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-slate-500">Sync Details</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-slate-500">Tags & Custom Data</th>
                    <th className="text-right py-3.5 px-4 font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.map((contact) => (
                    <tr key={contact._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{contact.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{contact.email || 'No Email'}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">{contact.phone}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getSyncStatusBadge(contact.syncStatus)}
                          {contact.lastSyncedAt && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Synced: {new Date(contact.lastSyncedAt).toLocaleString()}
                            </span>
                          )}
                          {contact.syncError && contact.syncStatus === 'failed' && (
                            <span className="text-[10px] text-red-500 font-medium max-w-[180px] truncate" title={contact.syncError}>
                              {contact.syncError}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags && contact.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                              {tag}
                            </span>
                          ))}
                          {Object.keys(contact.customFields || {}).length > 0 && (
                            <span className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-150">
                              {Object.keys(contact.customFields).length} Custom Fields
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {contact.syncStatus !== 'synced' && (
                            <button
                              onClick={() => handleRetrySync(contact._id)}
                              disabled={retryingId === contact._id}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1 rounded-md transition disabled:opacity-50"
                            >
                              {retryingId === contact._id ? 'Syncing...' : 'Retry Sync'}
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(contact)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-md transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(contact._id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100/80 px-2 py-1 rounded-md transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile responsive Cards list */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {contacts.map((contact) => (
              <div key={contact._id} className="card p-4 space-y-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{contact.name}</h4>
                    <p className="text-xs text-slate-500">{contact.email || 'No email configured'}</p>
                  </div>
                  {getSyncStatusBadge(contact.syncStatus)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-50 pt-2.5">
                  <div>
                    <span className="text-slate-400 block">Phone</span>
                    <strong className="font-mono text-slate-700">{contact.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Last Synced</span>
                    <span className="text-slate-700 block truncate">
                      {contact.lastSyncedAt ? new Date(contact.lastSyncedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Mobile Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Mobile Actions */}
                <div className="flex gap-2 justify-end border-t border-slate-50 pt-2.5">
                  {contact.syncStatus !== 'synced' && (
                    <button
                      onClick={() => handleRetrySync(contact._id)}
                      disabled={retryingId === contact._id}
                      className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg transition active:bg-indigo-100 flex-1 text-center disabled:opacity-50"
                    >
                      {retryingId === contact._id ? 'Syncing...' : 'Retry Sync'}
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(contact)}
                    className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg transition active:bg-slate-200 flex-1 text-center"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contact._id)}
                    className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg transition active:bg-red-100 flex-1 text-center"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-sm">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-slate-500 font-medium">
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
  );
};

export default Contacts;
