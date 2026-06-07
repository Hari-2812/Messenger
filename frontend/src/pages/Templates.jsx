import { useEffect, useState } from 'react';
import { templatesAPI } from '../services/api';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', message: '' });

  const fetchTemplates = () => {
    setLoading(true);
    templatesAPI
      .getAll()
      .then((res) => setTemplates(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load templates'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const resetForm = () => {
    setForm({ title: '', message: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await templatesAPI.update(editingId, form);
        setSuccess('Template updated');
      } else {
        await templatesAPI.create(form);
        setSuccess('Template created');
      }
      resetForm();
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (template) => {
    setForm({ title: template.title, message: template.message });
    setEditingId(template._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await templatesAPI.delete(id);
      setSuccess('Template deleted');
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="flex justify-between items-center">
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          + Create Template
        </button>
        <p className="text-sm text-gray-500">{templates.length} templates</p>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="font-semibold mb-4">{editingId ? 'Edit Template' : 'New Template'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
                placeholder="Welcome Message"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="input-field min-h-[150px]"
                placeholder="Hello {{name}}\n\nWelcome to our program."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Variables: {'{{name}}'}, {'{{phone}}'}, {'{{email}}'}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Save'}</button>
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No templates yet. Create your first template.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div key={template._id} className="card">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900">{template.title}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(template)} className="text-primary-600 text-sm hover:underline">Edit</button>
                  <button onClick={() => handleDelete(template._id)} className="text-red-600 text-sm hover:underline">Delete</button>
                </div>
              </div>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{template.message}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;
