import { useState, useEffect } from 'react';
import { emailTemplatesAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FileEdit, Trash2, Plus, Code, X } from 'lucide-react';

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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 space-y-8 text-slate-800 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Email Templates</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and design your email layouts.</p>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', subject: '', htmlContent: '' }); setIsModalOpen(true); }} 
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Plus size={18} /> Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <motion.div 
            whileHover={{ y: -4 }}
            key={t._id} 
            className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mb-4">
                <Code size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800">{t.name}</h3>
              <p className="text-sm text-slate-500 font-medium mb-4 truncate" title={t.subject}>Subject: {t.subject}</p>
            </div>
            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
              <button 
                onClick={() => { setFormData(t); setIsModalOpen(true); }} 
                className="flex-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <FileEdit size={16} /> Edit
              </button>
              <button 
                onClick={() => handleDelete(t._id)} 
                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </motion.div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
            <p className="text-slate-500 font-bold mb-4">No templates found.</p>
            <button 
              onClick={() => { setFormData({ name: '', subject: '', htmlContent: '' }); setIsModalOpen(true); }} 
              className="text-primary font-bold hover:underline"
            >
              Create your first template
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-800"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-2xl font-bold">{formData._id ? 'Edit Template' : 'New Template'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 md:p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Welcome Email" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Subject Line</label>
                    <input required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Welcome to Techzon CRM!" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">HTML Content</label>
                  <textarea required rows={10} value={formData.htmlContent} onChange={e => setFormData({ ...formData, htmlContent: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 font-mono text-sm focus:outline-none focus:border-primary transition-colors custom-scrollbar" placeholder="<p>Hello {{name}},</p>" />
                  
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Dynamic Variables</p>
                    <div className="flex flex-wrap gap-2">
                      {['{{name}}', '{{company}}', '{{email}}', '{{phone}}', '{{website}}', '{{industry}}', '{{location}}'].map(v => (
                        <span key={v} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-mono font-bold border border-indigo-100">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold hover:bg-slate-100 text-slate-600 transition-colors">Cancel</button>
                  <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-colors">Save Template</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
