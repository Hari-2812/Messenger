import { useState, useEffect } from 'react';
import { emailCampaignsAPI, emailTemplatesAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function EmailCreateCampaign() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    senderName: '',
    senderEmail: '',
    htmlContent: '',
    templateId: '',
    scheduledAt: '',
    isDraft: false,
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    emailTemplatesAPI.getAll().then(res => setTemplates(res.data)).catch(console.error);
  }, []);

  const handleTemplateChange = (e) => {
    const tId = e.target.value;
    setFormData({ ...formData, templateId: tId });
    if (tId) {
      const tmpl = templates.find(t => t._id === tId);
      if (tmpl) {
        setFormData(prev => ({ ...prev, subject: tmpl.subject, htmlContent: tmpl.htmlContent }));
      }
    }
  };

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'isDraft') data.append(key, isDraft);
        else if (formData[key]) data.append(key, formData[key]);
      });
      if (file) {
        data.append('attachment', file);
      }
      
      await emailCampaignsAPI.create(data);
      navigate('/email/history');
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 text-white max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#F57C20,#f59e0b)]">Create Email Campaign</h1>
      
      <form className="bg-[#241252]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Campaign Name</label>
            <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Template (Optional)</label>
            <select value={formData.templateId} onChange={handleTemplateChange} className="w-full bg-[#1f2937] border border-white/10 rounded-lg p-2.5 text-white">
              <option value="">-- Custom HTML --</option>
              {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Sender Name</label>
            <input required value={formData.senderName} onChange={e => setFormData({ ...formData, senderName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sender Email</label>
            <input required type="email" value={formData.senderEmail} onChange={e => setFormData({ ...formData, senderEmail: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">HTML Content</label>
          <textarea required rows={10} value={formData.htmlContent} onChange={e => setFormData({ ...formData, htmlContent: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono text-sm" placeholder="<p>Hello {{name}}!</p>" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Upload Attachment</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Schedule Now/Later (Empty for immediate send)</label>
            <input type="datetime-local" value={formData.scheduledAt} onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white" />
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
          <button type="button" disabled={loading} onClick={(e) => handleSubmit(e, true)} className="px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors font-medium">Save as Draft</button>
          <button type="button" disabled={loading} onClick={(e) => handleSubmit(e, false)} className="bg-[#F57C20] hover:bg-[#d96a1a] px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2">
            {loading ? 'Processing...' : 'Send Campaign'}
          </button>
        </div>

      </form>
    </div>
  );
}
