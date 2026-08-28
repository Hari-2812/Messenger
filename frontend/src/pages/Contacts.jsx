import { useEffect, useState, useCallback } from 'react';
import { contactsAPI } from '../services/api';
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

  // Bulk Import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  // Bulk Delete / Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Selection Logic
  const handleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    contacts.forEach(c => newSelected.add(c._id));
    setSelectedIds(newSelected);
  };

  const handleUnselectAll = () => {
    const newSelected = new Set(selectedIds);
    contacts.forEach(c => newSelected.delete(c._id));
    setSelectedIds(newSelected);
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk Delete Logic
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    const loadingToast = toast.loading('Deleting contacts...');
    
    try {
      const res = await contactsAPI.bulkDelete({ ids: Array.from(selectedIds) });
      
      const delCount = res.data.deletedCount !== undefined ? res.data.deletedCount : res.data.deleted;
      const reqCount = res.data.requestedCount || selectedIds.size;
      
      if (res.data.success && delCount > 0) {
        if (delCount < reqCount) {
          toast.success(`Deleted ${delCount} out of ${reqCount} contacts. Some contacts were invalid or already deleted.`, {
            id: loadingToast,
            duration: 5000,
            icon: '⚠️'
          });
        } else {
          toast.success(`${delCount} contacts deleted successfully.`, {
            id: loadingToast,
            duration: 4000
          });
        }
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        // Soft refresh current page
        fetchContacts(page, search);
      } else if (res.data.success && delCount === 0) {
        toast.error('No valid records were found to delete. They may have already been deleted.', { id: loadingToast, duration: 5000 });
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        fetchContacts(page, search);
      } else {
        toast.error(res.data.message || 'Failed to delete contacts', { id: loadingToast });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete selected contacts. Please try again.', { id: loadingToast });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Import Logic
  const handlePreviewImport = () => {
    if (!importText.trim()) {
      toast.error('Please paste some contacts first');
      return;
    }

    const rows = importText.split('\n').filter(r => r.trim());
    const previewData = [];
    let validCount = 0;
    let invalidCount = 0;

    rows.forEach(row => {
      const delimiter = row.includes('\t') ? '\t' : (row.includes(',') ? ',' : (row.includes(';') ? ';' : null));
      let name = '';
      let email = '';

      if (delimiter) {
        const parts = row.split(delimiter);
        if (parts.length >= 2) {
          name = parts[0].trim();
          email = parts[1].trim();
        } else if (parts.length === 1 && parts[0].includes('@')) {
          email = parts[0].trim();
          name = email.split('@')[0];
        }
      } else {
        const parts = row.split(' ').filter(p => p.trim());
        if (parts.length === 2 && parts[1].includes('@')) {
          name = parts[0].trim();
          email = parts[1].trim();
        } else {
          const emailMatch = row.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
          if (emailMatch) {
            email = emailMatch[0];
            name = row.replace(email, '').trim() || email.split('@')[0];
          }
        }
      }

      const isValidEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      
      if (isValidEmail) validCount++;
      else invalidCount++;

      previewData.push({
        name,
        email,
        isValid: !!isValidEmail
      });
    });

    setImportPreview({
      rows: previewData,
      valid: validCount,
      invalid: invalidCount,
      total: rows.length
    });
  };

  const handleImportSubmit = async () => {
    if (!importPreview || importPreview.valid === 0) {
      toast.error('No valid contacts to import');
      return;
    }

    setImporting(true);
    const loadingToast = toast.loading('Importing contacts...');
    
    try {
      const validContacts = importPreview.rows
        .filter(r => r.isValid)
        .map(r => ({ name: r.name, email: r.email }));

      const res = await contactsAPI.bulkImport({ contacts: validContacts });
      
      if (res.data.success) {
        toast.success(`Import complete: ${res.data.imported} new, ${res.data.updated} updated, ${res.data.duplicatesSkipped} duplicates skipped.`, {
          id: loadingToast,
          duration: 5000
        });
        setShowBulkImport(false);
        setImportText('');
        setImportPreview(null);
        setPage(1);
        fetchContacts(1, search);
      } else {
        toast.error(res.data.message || 'Import failed', { id: loadingToast });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import contacts', { id: loadingToast });
    } finally {
      setImporting(false);
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
            Manage your CRM contacts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
          >
            📋 Bulk Import
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

      {/* Bulk Selection Actions */}
      {!loading && contacts.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl shadow-sm">
          <button
            onClick={handleSelectAll}
            disabled={isDeleting}
            className="text-sm font-bold text-text-muted hover:text-text px-3 py-1.5 rounded-lg bg-background hover:bg-border transition-colors disabled:opacity-50"
          >
            Select All
          </button>
          <button
            onClick={handleUnselectAll}
            disabled={isDeleting}
            className="text-sm font-bold text-text-muted hover:text-text px-3 py-1.5 rounded-lg bg-background hover:bg-border transition-colors disabled:opacity-50"
          >
            Unselect All
          </button>

          <div className="mx-2 h-4 w-px bg-border"></div>
          
          <span className="text-sm font-bold text-primary mr-auto">
            {selectedIds.size} Selected
          </span>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedIds.size === 0 || isDeleting}
            className="text-sm font-bold text-white px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-2xl shadow-sm">
          <div className="spinner w-10 h-10 mb-4 border-primary border-t-accent" />
          <p className="text-base text-text-muted font-bold">Loading contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-2xl shadow-sm text-center">
          <div className="text-6xl mb-4 opacity-80">👥</div>
          <h4 className="text-xl font-bold text-text">No contacts found.</h4>
          <p className="text-base text-text-muted max-w-sm mt-2 font-medium mb-6">
            Import contacts to start your email campaigns.
          </p>
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-hover"
          >
            Bulk Import
          </button>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-background/80 border-b border-border">
                  <tr>
                    <th className="w-12 text-center py-4 px-2">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="text-left py-4 px-5 font-bold text-text-muted">Name</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Email</th>
                    <th className="text-left py-4 px-4 font-bold text-text-muted">Source</th>
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
                      className="hover:bg-background/50 transition-colors cursor-pointer"
                      onClick={() => toggleSelection(contact._id)}
                    >
                      <td className="py-4 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                          checked={selectedIds.has(contact._id)}
                          onChange={() => toggleSelection(contact._id)}
                          disabled={isDeleting}
                        />
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-text">{contact.name}</div>
                        {contact.phone && <div className="text-xs text-text-muted font-mono">{contact.phone}</div>}
                      </td>
                      <td className="py-4 px-4 text-text-muted font-medium">
                        {contact.email || '-'}
                      </td>
                      <td className="py-4 px-4 text-text-muted font-medium">
                        {contact.source || 'CRM'}
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-text mb-4">Delete Contacts?</h3>
              <p className="text-text-muted mb-6">
                You are about to permanently delete <strong>{selectedIds.size}</strong> contacts. This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl font-bold text-text-muted hover:text-text hover:bg-background transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Contacts'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkImport && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card w-full max-w-3xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-background/50">
                <h3 className="text-2xl font-bold text-text">Bulk Import Contacts</h3>
                <button onClick={() => { setShowBulkImport(false); setImportPreview(null); setImportText(''); }} className="text-text-muted hover:text-text text-xl">&times;</button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {!importPreview ? (
                  <>
                    <p className="text-sm text-text-muted mb-4">Paste your contact list below using Name and Email. (Comma or Tab separated)</p>
                    <div className="mb-4 bg-background border border-border p-3 rounded-xl">
                      <p className="text-xs font-mono text-text-muted">Example:</p>
                      <p className="text-sm font-mono text-text mt-1">John Doe, john@example.com</p>
                      <p className="text-sm font-mono text-text">Jane Smith  jane@example.com</p>
                    </div>
                    <textarea 
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Paste contacts here..."
                      className="w-full h-64 bg-background border border-border rounded-xl p-4 text-text font-mono text-sm focus:outline-none focus:border-primary resize-none custom-scrollbar"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-text">Import Preview</h4>
                      <div className="text-sm">
                        <span className="text-text-muted">Total: {importPreview.total} | </span>
                        <span className="text-emerald-500 font-bold">Valid: {importPreview.valid}</span>
                        <span className="text-text-muted"> | </span>
                        <span className="text-red-500 font-bold">Invalid: {importPreview.invalid}</span>
                      </div>
                    </div>
                    <div className="border border-border rounded-xl overflow-hidden bg-background">
                      <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-card border-b border-border sticky top-0">
                            <tr>
                              <th className="p-3 font-bold text-text-muted">Name</th>
                              <th className="p-3 font-bold text-text-muted">Email</th>
                              <th className="p-3 font-bold text-text-muted">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {importPreview.rows.slice(0, 100).map((r, i) => (
                              <tr key={i} className="hover:bg-card/50">
                                <td className="p-3 text-text">{r.name || '-'}</td>
                                <td className="p-3 text-text font-mono">{r.email || '-'}</td>
                                <td className="p-3">
                                  {r.isValid 
                                    ? <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">Valid</span>
                                    : <span className="text-red-500 text-xs font-bold bg-red-500/10 px-2 py-1 rounded">Invalid</span>
                                  }
                                </td>
                              </tr>
                            ))}
                            {importPreview.rows.length > 100 && (
                              <tr>
                                <td colSpan="3" className="p-3 text-center text-text-muted text-xs italic">
                                  ...and {importPreview.rows.length - 100} more rows
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-border bg-background/50 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    if (importPreview) setImportPreview(null);
                    else setShowBulkImport(false);
                  }} 
                  className="px-5 py-2.5 rounded-xl font-bold text-text-muted hover:text-text hover:bg-card transition-colors"
                >
                  {importPreview ? 'Back' : 'Cancel'}
                </button>
                
                {!importPreview ? (
                  <button 
                    onClick={handlePreviewImport}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition-colors"
                  >
                    Preview Import
                  </button>
                ) : (
                  <button 
                    onClick={handleImportSubmit}
                    disabled={importing || importPreview.valid === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : `Import ${importPreview.valid} Contacts`}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default Contacts;

