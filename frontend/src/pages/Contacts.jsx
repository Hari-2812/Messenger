import { useEffect, useState } from 'react';
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

  const fetchContacts = () => {
    setLoading(true);
    contactsAPI
      .getAll()
      .then((res) => setContacts(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load contacts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '' });
    setEditingId(null);
    setShowForm(false);
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
      fetchContacts();
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
      fetchContacts();
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
      setSuccess(`Import complete: ${data.imported} imported, ${data.skipped} skipped`);
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-3">
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            + Add Contact
          </button>
          <label className="btn-secondary cursor-pointer">
            {importing ? 'Importing...' : '📁 Import CSV'}
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>
        <p className="text-sm text-gray-500">{contacts.length} contacts</p>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="font-semibold mb-4">{editingId ? 'Edit Contact' : 'Add Contact'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              required
            />
            <input
              placeholder="Phone (e.g. 919999999999)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              required
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Save'}</button>
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No contacts yet. Add manually or import CSV.</p>
            <p className="text-xs mt-2">CSV format: Name,Phone,Email</p>
          </div>
        ) : (
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
                    <td className="py-3 px-4">{contact.phone}</td>
                    <td className="py-3 px-4">{contact.email || '-'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleEdit(contact)} className="text-primary-600 hover:underline mr-3">Edit</button>
                      <button onClick={() => handleDelete(contact._id)} className="text-red-600 hover:underline">Delete</button>
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

export default Contacts;
