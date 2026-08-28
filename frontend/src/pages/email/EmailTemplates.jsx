import { useState, useEffect } from 'react';
import { emailTemplatesAPI } from '../../services/api';

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', htmlContent: '' });
  
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data } = await emailTemplatesAPI.getAll();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData._id) {
        await emailTemplatesAPI.update(formData._id, formData);
      } else {
        await emailTemplatesAPI.create(formData);
      }
      setIsModalOpen(false);
      fetchTemplates();
      setFormData({ name: '', subject: '', htmlContent: '' });
    } catch (err) {
      alert('Error saving template');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await emailTemplatesAPI.delete(id);
      fetchTemplates();
    } catch (err) {
      alert('Error deleting template');
    }
  };

  return (
    <div className="p-8 space-y-6 text-text max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary-dark">Email Templates</h1>
        <button onClick={() => { setFormData({ name: '', subject: '', htmlContent: '' }); setIsModalOpen(true); }} className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map(t => (
          <div key={t._id} className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2 text-text">{t.name}</h3>
              <p className="text-sm text-text-muted mb-4 truncate">Subject: {t.subject}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setFormData(t); setIsModalOpen(true); }} className="flex-1 bg-background border border-border hover:bg-border text-text py-2 rounded transition-colors">Edit</button>
              <button onClick={() => handleDelete(t._id)} className="flex-1 bg-status-danger/10 text-status-danger hover:bg-status-danger/20 py-2 rounded transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-text">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="text-xl font-bold">{formData._id ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background border border-border rounded-lg p-2.5 text-text focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-background border border-border rounded-lg p-2.5 text-text focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">HTML Content</label>
                <textarea required rows={8} value={formData.htmlContent} onChange={e => setFormData({ ...formData, htmlContent: e.target.value })} className="w-full bg-background border border-border rounded-lg p-2.5 text-text font-mono text-sm focus:outline-none focus:border-primary" />
                <div className="mt-3 p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wider">Available Variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {['{{name}}', '{{company}}', '{{email}}', '{{phone}}', '{{website}}', '{{industry}}', '{{location}}'].map(v => (
                      <span key={v} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono border border-primary/20">{v}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded hover:bg-background text-text">Cancel</button>
                <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded font-medium shadow-sm">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
