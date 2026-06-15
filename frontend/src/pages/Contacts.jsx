import { useEffect, useState, useCallback } from 'react';
import { contactsAPI } from '../services/api';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [importing, setImporting] = useState(false);
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

      // Support both paginated and legacy flat array response
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchContacts(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchContacts]);

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await contactsAPI.update(editingId, form);
        setSuccess('Contact updated successfully');
      } else {
        await contactsAPI.create(form);
        setSuccess('Contact created successfully');
      }
      resetForm();
      fetchContacts(page, search);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (contact) => {
    setForm({ name: contact.name, phone: contact.phone, email: contact.email || '' });
    setEditingId(contact._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await contactsAPI.delete(id);
      setSuccess('Contact deleted');
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
      setSuccess(`Import complete: ${data.imported} imported, ${data.skipped} skipped${data.errors > 0 ? `, ${data.errors} errors` : ''}`);
      fetchContacts(1, search);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchContacts(newPage, search);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Actions + Search */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-3">
          <button
            id="add-contact-btn"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary"
          >
            + Add Contact
          </button>
          <label className="btn-secondary cursor-pointer">
            {importing ? 'Importing...' : '📁 Import CSV'}
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
          <input
            id="contact-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="input-field w-56"
          />
          <p className="text-sm text-gray-500 whitespace-nowrap">{total} contacts</p>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card">
          <h3 className="font-semibold mb-4">{editingId ? 'Edit Contact' : 'Add Contact'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              id="contact-name"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              required
            />
            <input
              id="contact-phone"
              placeholder="Phone (e.g. 919999999999)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              required
            />
            <input
              id="contact-email"
              placeholder="Email (optional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
            <div className="md:col-span-3 flex gap-2">
              <button id="contact-save-btn" type="submit" className="btn-primary">
                {editingId ? 'Update' : 'Save'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            CSV format: Name, Phone (digits only e.g. 919999999999), Email
          </p>
        </div>
      )}

      {/* Contacts Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {search ? 'No contacts match your search.' : 'No contacts yet. Add manually or import CSV.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact._id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{contact.name}</td>
                      <td className="py-3 px-4 font-mono text-xs">{contact.phone}</td>
                      <td className="py-3 px-4">{contact.email || '—'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="text-primary-600 hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(contact._id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
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

export default Contacts;
