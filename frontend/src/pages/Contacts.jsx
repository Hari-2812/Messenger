import { useEffect, useState, useCallback } from 'react';
import { contactsAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
    if (!window.confirm('Delete this contact from CRM and WATI?')) return;
    try {
      setSuccess('Deleting from WATI...');
      await contactsAPI.delete(id);
      setSuccess('Contact deleted successfully');
      fetchContacts(page, search);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'WATI delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected contacts from CRM and WATI?`)) return;
    
    setIsBulkDeleting(true);
    setError('');
    setSuccess('Deleting from WATI...');
    
    try {
      const res = await contactsAPI.bulkDelete({ ids: Array.from(selectedIds) });
      setSuccess(res.data?.message || `Successfully deleted ${selectedIds.size} contacts`);
      setSelectedIds(new Set());
      fetchContacts(page, search);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(contacts.map(c => c._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
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
      case 'delete_failed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200" title="WATI delete failed">
            🔴 Delete Failed
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
      {success && (
        <div className="alert alert-success animate-fade-in">
          <span>{success}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text">Contacts Catalog</h2>
          <p className="text-base text-text-muted mt-1 font-medium">
            Synchronize, group, and manage custom contact information with your WATI WhatsApp CRM.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 transition disabled:opacity-50"
          >
            {syncingAll ? 'Syncing...' : '🔄 Sync All'}
          </motion.button>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card rounded-2xl border border-border p-4 shadow-card">
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            id="add-contact-btn"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary bg-gradient-to-r from-primary to-secondary shadow-lg"
          >
            + Add New Contact
          </motion.button>
          <motion.label 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-secondary cursor-pointer border-border font-bold text-text-muted hover:text-text hover:bg-background"
          >
            {importing ? 'Importing CSV/Excel...' : '📁 Import CSV/Excel'}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              disabled={importing}
            />
          </motion.label>
          {selectedIds.size > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="btn-secondary text-status-danger border-status-danger/20 hover:bg-status-danger/10 hover:border-status-danger/30 transition disabled:opacity-50 font-bold"
            >
              🗑 {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </motion.button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              id="contact-search"
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
          <span className="text-sm text-text-muted whitespace-nowrap bg-background border border-border px-3 py-1.5 rounded-xl font-bold">
            Total: <strong>{total}</strong>
          </span>
        </div>
      </div>

      {/* Add / Edit Form Drawer/Panel */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="card border-primary/20 bg-primary/5 p-6 overflow-hidden"
          >
            <h3 className="text-xl font-bold text-text mb-4">{editingId ? 'Edit Contact Profile' : 'Create New Contact Profile'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <input
                    id="contact-name"
                    placeholder="Enter name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field border-border"
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
                    className="input-field border-border"
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
                    className="input-field border-border"
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
                    className="input-field border-border"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Custom JSON Fields (Optional)</label>
                  <textarea
                    placeholder='e.g. { "school": "Hogwarts", "year": "2026" }'
                    value={form.customFields}
                    onChange={(e) => setForm({ ...form, customFields: e.target.value })}
                    className="input-field h-16 font-mono text-xs border-border"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={resetForm} className="btn-ghost border-border font-bold text-text-muted hover:text-text hover:bg-background">
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} id="contact-save-btn" type="submit" className="btn-primary bg-gradient-to-r from-primary to-secondary shadow-md">
                  {editingId ? 'Save Updates' : 'Create Contact'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid: Table or Card display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-2xl shadow-sm">
          <div className="spinner w-10 h-10 mb-4 border-primary border-t-accent" />
          <p className="text-base text-text-muted font-bold">Loading your contact catalog...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-2xl shadow-sm text-center">
          <div className="text-6xl mb-4 opacity-80">👥</div>
          <h4 className="text-xl font-bold text-text">No Contacts Found</h4>
          <p className="text-base text-text-muted max-w-sm mt-2 font-medium">
            {search ? 'Adjust your search parameters and try again.' : 'Populate your database by creating a contact or importing a CSV/Excel file.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background/80 border-b border-border">
                  <tr>
                    <th className="py-4 pl-5 pr-2 text-left">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                        checked={contacts.length > 0 && selectedIds.size === contacts.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Contact Details</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Phone</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Sync Details</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Tags & Custom Data</th>
                    <th className="text-right py-4 px-5 font-bold text-text-muted">Actions</th>
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
                      <td className="py-4 pl-5 pr-2">
                        <input 
                          type="checkbox"
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                          checked={selectedIds.has(contact._id)}
                          onChange={() => handleSelectOne(contact._id)}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-text">{contact.name}</div>
                        <div className="text-xs text-text-muted mt-1 font-medium">{contact.email || 'No Email'}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-sm font-medium text-text-muted">{contact.phone}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getSyncStatusBadge(contact.syncStatus)}
                          {contact.lastSyncedAt && (
                            <span className="text-[11px] text-text-muted font-bold">
                              Synced: {new Date(contact.lastSyncedAt).toLocaleString()}
                            </span>
                          )}
                          {contact.syncError && contact.syncStatus === 'failed' && (
                            <span className="text-[11px] text-status-danger font-bold max-w-[180px] truncate" title={contact.syncError}>
                              {contact.syncError}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {contact.tags && contact.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center rounded-md bg-primary/5 px-2 py-1 text-[11px] font-bold text-primary ring-1 ring-inset ring-primary/10">
                              {tag}
                            </span>
                          ))}
                          {Object.keys(contact.customFields || {}).length > 0 && (
                            <span className="inline-flex items-center rounded-md bg-background px-2 py-1 text-[11px] font-bold text-text-muted border border-border">
                              {Object.keys(contact.customFields).length} Custom Fields
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex gap-2 justify-end">
                          {contact.syncStatus !== 'synced' && (
                            <button
                              onClick={() => handleRetrySync(contact._id)}
                              disabled={retryingId === contact._id}
                              className="text-xs font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {retryingId === contact._id ? (contact.syncStatus === 'delete_failed' ? 'Deleting...' : 'Syncing...') : (contact.syncStatus === 'delete_failed' ? 'Retry Delete' : 'Retry Sync')}
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(contact)}
                            className="text-xs font-bold text-text-muted hover:text-text bg-background hover:bg-border/50 px-3 py-1.5 rounded-lg transition-colors border border-border"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(contact._id)}
                            className="text-xs font-bold text-status-danger hover:text-red-900 bg-status-danger/10 hover:bg-status-danger/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile responsive Cards list */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {contacts.map((contact) => (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={contact._id} 
                className="card p-5 space-y-4 bg-card border border-border rounded-2xl shadow-sm relative pl-12"
              >
                <div className="absolute top-5 left-4">
                  <input 
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    checked={selectedIds.has(contact._id)}
                    onChange={() => handleSelectOne(contact._id)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-text text-base">{contact.name}</h4>
                    <p className="text-sm font-medium text-text-muted mt-0.5">{contact.email || 'No email configured'}</p>
                  </div>
                  {getSyncStatusBadge(contact.syncStatus)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm border-t border-border pt-3">
                  <div>
                    <span className="text-text-muted font-bold block mb-0.5">Phone</span>
                    <strong className="font-mono text-text">{contact.phone}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted font-bold block mb-0.5">Last Synced</span>
                    <span className="text-text font-medium block truncate">
                      {contact.lastSyncedAt ? new Date(contact.lastSyncedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Mobile Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-md bg-primary/5 px-2 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Mobile Actions */}
                <div className="flex gap-2 justify-end border-t border-border pt-4">
                  {contact.syncStatus !== 'synced' && (
                    <button
                      onClick={() => handleRetrySync(contact._id)}
                      disabled={retryingId === contact._id}
                      className="text-sm font-bold text-primary bg-primary/10 px-3 py-2 rounded-xl transition active:bg-primary/20 flex-1 text-center disabled:opacity-50"
                    >
                      {retryingId === contact._id ? (contact.syncStatus === 'delete_failed' ? 'Deleting...' : 'Syncing...') : (contact.syncStatus === 'delete_failed' ? 'Retry Delete' : 'Retry Sync')}
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(contact)}
                    className="text-sm font-bold text-text bg-background border border-border px-3 py-2 rounded-xl transition active:bg-border/50 flex-1 text-center"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contact._id)}
                    className="text-sm font-bold text-status-danger bg-status-danger/10 px-3 py-2 rounded-xl transition active:bg-status-danger/20 flex-1 text-center"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
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
                Page {page} of {totalPages} · {total} total
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
