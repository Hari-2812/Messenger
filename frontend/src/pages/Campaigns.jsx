import { useEffect, useState } from 'react';
import { campaignsAPI, contactsAPI, templatesAPI } from '../services/api';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  sending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    campaignName: '',
    templateId: '',
    contactIds: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, contactsRes, templatesRes] = await Promise.all([
        campaignsAPI.getAll(),
        contactsAPI.getAll(),
        templatesAPI.getAll(),
      ]);
      setCampaigns(campaignsRes.data);
      setContacts(contactsRes.data);
      setTemplates(templatesRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleContact = (id) => {
    setForm((prev) => ({
      ...prev,
      contactIds: prev.contactIds.includes(id)
        ? prev.contactIds.filter((c) => c !== id)
        : [...prev.contactIds, id],
    }));
  };

  const selectAllContacts = () => {
    setForm((prev) => ({
      ...prev,
      contactIds: prev.contactIds.length === contacts.length ? [] : contacts.map((c) => c._id),
    }));
  };

  const handlePreview = async () => {
    setError('');
    if (!form.templateId || form.contactIds.length === 0) {
      setError('Select a template and at least one contact');
      return;
    }

    try {
      const { data } = await campaignsAPI.preview({
        templateId: form.templateId,
        contactIds: form.contactIds,
      });
      setPreviews(data);
      setShowPreview(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Preview failed');
    }
  };

  const handleCreate = async (send = false) => {
    setError('');
    setSuccess('');

    if (!form.campaignName || !form.templateId || form.contactIds.length === 0) {
      setError('Fill all fields and select contacts');
      return;
    }

    setSubmitting(true);
    try {
      await campaignsAPI.create({ ...form, send });
      setSuccess(send ? 'Campaign sent successfully!' : 'Campaign saved as draft');
      setShowForm(false);
      setShowPreview(false);
      setForm({ campaignName: '', templateId: '', contactIds: [] });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendDraft = async (id) => {
    if (!window.confirm('Send this campaign now?')) return;
    setError('');
    try {
      await campaignsAPI.send(id);
      setSuccess('Campaign sent!');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Send failed');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="flex justify-between items-center">
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Create Campaign
        </button>
        <p className="text-sm text-gray-500">{campaigns.length} campaigns</p>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-lg">New Campaign</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              value={form.campaignName}
              onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
              className="input-field"
              placeholder="Summer Promo 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
            <select
              value={form.templateId}
              onChange={(e) => setForm({ ...form, templateId: e.target.value })}
              className="input-field"
            >
              <option value="">Choose template...</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Select Contacts ({form.contactIds.length} selected)</label>
              <button type="button" onClick={selectAllContacts} className="text-sm text-primary-600 hover:underline">
                {form.contactIds.length === contacts.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="p-4 text-gray-500 text-sm">No contacts available. Add contacts first.</p>
              ) : (
                contacts.map((contact) => (
                  <label key={contact._id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={form.contactIds.includes(contact._id)}
                      onChange={() => toggleContact(contact._id)}
                      className="rounded text-primary-600"
                    />
                    <span className="text-sm">{contact.name}</span>
                    <span className="text-xs text-gray-400">{contact.phone}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={handlePreview} className="btn-secondary">Preview Messages</button>
            <button onClick={() => handleCreate(false)} disabled={submitting} className="btn-secondary">Save Draft</button>
            <button onClick={() => handleCreate(true)} disabled={submitting} className="btn-primary">
              {submitting ? 'Sending...' : 'Send Campaign'}
            </button>
            <button onClick={() => { setShowForm(false); setShowPreview(false); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {showPreview && previews.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Message Preview</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {previews.map((p) => (
              <div key={p.contactId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-500">{p.phone}</span>
                </div>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-green-50 p-3 rounded-lg">{p.message}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No campaigns yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Template</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Contacts</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Sent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Failed</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{campaign.campaignName}</td>
                    <td className="py-3 px-4">{campaign.templateId?.title || '-'}</td>
                    <td className="py-3 px-4">{campaign.totalContacts}</td>
                    <td className="py-3 px-4 text-green-600">{campaign.sentCount}</td>
                    <td className="py-3 px-4 text-red-600">{campaign.failedCount}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {campaign.status === 'draft' && (
                        <button onClick={() => handleSendDraft(campaign._id)} className="text-primary-600 hover:underline text-sm">
                          Send Now
                        </button>
                      )}
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

export default Campaigns;
