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
    <div className="p-8 space-y-6 text-white max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#F57C20,#f59e0b)]">Email Templates</h1>
        <button onClick={() => { setFormData({ name: '', subject: '', htmlContent: '' }); setIsModalOpen(true); }} className="bg-[#F57C20] hover:bg-[#d96a1a] px-4 py-2 rounded-lg font-medium transition-colors">
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map(t => (
          <div key={t._id} className="bg-[#241252]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">{t.name}</h3>
              <p className="text-sm text-slate-300 mb-4 truncate">Subject: {t.subject}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setFormData(t); setIsModalOpen(true); }} className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded transition-colors">Edit</button>
              <button onClick={() => handleDelete(t._id)} className="flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 py-2 rounded transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[#1f2937] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold">{formData._id ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">HTML Content</label>
                <textarea required rows={8} value={formData.htmlContent} onChange={e => setFormData({ ...formData, htmlContent: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono text-sm" />
                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Available Variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {['{{name}}', '{{company}}', '{{email}}', '{{phone}}', '{{website}}', '{{industry}}', '{{location}}'].map(v => (
                      <span key={v} className="text-xs bg-[#F57C20]/20 text-[#F57C20] px-2 py-1 rounded font-mono border border-[#F57C20]/30">{v}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded hover:bg-white/10">Cancel</button>
                <button type="submit" className="bg-[#F57C20] hover:bg-[#d96a1a] px-4 py-2 rounded font-medium">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
