import { useEffect, useState, useCallback } from 'react';
import { campaignsAPI, contactsAPI, templatesAPI } from '../services/api';
import { getSocket, connectSocket } from '../services/socket';

// ── Constants ─────────────────────────────────────────────────────────────────

const statusColors = {
  draft:     'bg-gray-100 text-gray-700',
  sending:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  partial:   'bg-orange-100 text-orange-700',
  failed:    'bg-red-100 text-red-700',
};

const categoryColors = {
  MARKETING:      'bg-purple-100 text-purple-700',
  UTILITY:        'bg-blue-100 text-blue-700',
  AUTHENTICATION: 'bg-orange-100 text-orange-700',
};

// Contact fields available for variable mapping
const CONTACT_FIELDS = [
  { value: 'name',  label: 'Contact Name' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'email', label: 'Email Address' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract {{1}}, {{2}}, ... placeholders from a WATI template.
 * Uses paramCount from backend if available, otherwise counts from bodyText.
 */
const extractTemplateParams = (template) => {
  if (!template) return [];

  // Prefer backend-computed paramCount
  const count = template.paramCount || 0;
  if (count > 0) {
    return Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      label: `{{${i + 1}}}`,
    }));
  }

  // Fallback: count from bodyText directly
  const bodyText = template.bodyText || '';
  const matches = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)];
  return Array.from({ length: matches.length }, (_, i) => ({
    index: i + 1,
    label: `{{${i + 1}}}`,
  }));
};

// ── Sub-components ────────────────────────────────────────────────────────────

const CampaignProgress = ({ progress }) => (
  <div className="card border-l-4 border-l-primary-500 space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="font-semibold text-gray-800">🚀 Campaign Sending...</h4>
      <span className="text-sm font-bold text-primary-600">{progress.percent}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
        style={{ width: `${progress.percent}%` }}
      />
    </div>
    <div className="flex gap-4 text-sm">
      <span className="text-green-600">✓ Sent: {progress.sent}</span>
      {progress.failed > 0 && (
        <span className="text-red-600">✗ Failed: {progress.failed}</span>
      )}
      <span className="text-gray-500">Total: {progress.total}</span>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const Campaigns = () => {
  const [campaigns, setCampaigns]           = useState([]);
  const [contacts, setContacts]             = useState([]);
  const [watiTemplates, setWatiTemplates]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [showForm, setShowForm]             = useState(false);
  const [previews, setPreviews]             = useState([]);
  const [showPreview, setShowPreview]       = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [activeCampaignProgress, setActiveCampaignProgress] = useState(null);
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [templateParams, setTemplateParams] = useState([]); // [{ index, label }]

  const [form, setForm] = useState({
    campaignName:         '',
    metaTemplateName:     '',
    metaTemplateLanguage: 'en_US',
    metaTemplateBodyText: '',
    templateVariables:    [],  // e.g. ['name', 'phone']
    templateParamCount:   0,
    contactIds:           [],
  });

  // ── Data Fetching ───────────────────────────────────────────────────────────

  const fetchWatiTemplates = useCallback(async (showToast = false) => {
    setTemplatesLoading(true);
    try {
      const { data } = await templatesAPI.syncWati({ all: true });
      setWatiTemplates(Array.isArray(data?.templates) ? data.templates : []);
      if (showToast) {
        setSuccess(`✅ Templates refreshed — ${(data?.templates || []).length} approved template(s) loaded`);
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load WATI templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchCampaigns = useCallback(async (p = 1) => {
    try {
      const { data } = await campaignsAPI.getAll({ page: p, limit: 20 });
      setCampaigns(data.campaigns || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load campaigns');
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsRes] = await Promise.all([
        contactsAPI.getAll({ limit: 200 }),
        fetchCampaigns(1),
      ]);
      setContacts(contactsRes.data.contacts || []);
    } finally {
      setLoading(false);
    }
  }, [fetchCampaigns]);

  // ── Socket.io — Real-time Progress ─────────────────────────────────────────

  useEffect(() => {
    const socket = connectSocket();

    socket.on('campaign:progress', (data) => {
      setActiveCampaignProgress(data);
    });

    socket.on('campaign:completed', (data) => {
      setActiveCampaignProgress(null);
      fetchCampaigns(page);
      setSuccess(
        `✅ Campaign completed! Sent: ${data.sentCount}` +
        (data.failedCount > 0 ? ` | Failed: ${data.failedCount}` : '')
      );
      setTimeout(() => setSuccess(''), 6000);
    });

    socket.on('campaign:failed', (data) => {
      setActiveCampaignProgress(null);
      fetchCampaigns(page);
      setError(`Campaign failed: ${data.error}`);
    });

    return () => {
      socket.off('campaign:progress');
      socket.off('campaign:completed');
      socket.off('campaign:failed');
    };
  }, [fetchCampaigns, page]);

  useEffect(() => {
    fetchData();
    fetchWatiTemplates();
  }, [fetchData, fetchWatiTemplates]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const subscribeToActiveCampaign = (campaignId) => {
    const socket = getSocket();
    socket.emit('subscribe:campaign', campaignId);
  };

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
      contactIds:
        prev.contactIds.length === contacts.length
          ? []
          : contacts.map((c) => c._id),
    }));
  };

  const resetForm = () => {
    setShowForm(false);
    setShowPreview(false);
    setTemplateParams([]);
    setError('');
    setForm({
      campaignName:         '',
      metaTemplateName:     '',
      metaTemplateLanguage: 'en_US',
      metaTemplateBodyText: '',
      templateVariables:    [],
      templateParamCount:   0,
      contactIds:           [],
    });
  };

  // ── Template Selection ──────────────────────────────────────────────────────

  const handleTemplateChange = (e) => {
    const tpl = watiTemplates.find((t) => t.name === e.target.value);
    const params = extractTemplateParams(tpl);
    setTemplateParams(params);
    setForm({
      ...form,
      metaTemplateName:     e.target.value,
      metaTemplateLanguage: tpl?.language || 'en_US',
      metaTemplateBodyText: tpl?.bodyText || '',
      templateVariables:    params.map(() => 'name'), // default all to name
      templateParamCount:   params.length,
    });
  };

  // ── Preview ─────────────────────────────────────────────────────────────────

  const handlePreview = () => {
    setError('');
    if (!form.metaTemplateName || form.contactIds.length === 0) {
      setError('Select a WATI template and at least one contact');
      return;
    }

    const selectedTemplate = watiTemplates.find(
      (t) => t.name === form.metaTemplateName
    );

    setPreviews(
      contacts
        .filter((c) => form.contactIds.includes(c._id))
        .map((contact) => {
          // Resolve {{1}}, {{2}} → actual contact field values
          let resolvedMessage = form.metaTemplateBodyText ||
            `📨 Template "${form.metaTemplateName}"`;

          form.templateVariables.forEach((field, i) => {
            resolvedMessage = resolvedMessage.replace(
              new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'),
              contact[field] || `[${field}]`
            );
          });

          return {
            contactId: contact._id,
            name:      contact.name,
            phone:     contact.phone,
            templateName: form.metaTemplateName,
            category:  selectedTemplate?.category,
            language:  selectedTemplate?.language,
            message:   resolvedMessage,
          };
        })
    );
    setShowPreview(true);
  };

  // ── Create / Send ───────────────────────────────────────────────────────────

  const handleCreate = async (send = false) => {
    setError('');
    setSuccess('');

    if (!form.campaignName || !form.metaTemplateName || form.contactIds.length === 0) {
      setError('Fill all fields and select at least one contact');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await campaignsAPI.create({ ...form, send });

      if (send) {
        subscribeToActiveCampaign(data._id);
        setSuccess('🚀 Campaign queued! Sending in progress...');
      } else {
        setSuccess('💾 Campaign saved as draft');
        setTimeout(() => setSuccess(''), 4000);
      }

      resetForm();
      fetchCampaigns(page);
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
      subscribeToActiveCampaign(id);
      setSuccess('🚀 Campaign queued for sending!');
      fetchCampaigns(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Send failed');
    }
  };

  const selectedTemplateInfo = watiTemplates.find(
    (t) => t.name === form.metaTemplateName
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Real-time progress bar */}
      {activeCampaignProgress && (
        <CampaignProgress progress={activeCampaignProgress} />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          id="create-campaign-btn"
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          + Create Campaign
        </button>
        <p className="text-sm text-gray-500">{campaigns.length} campaign(s)</p>
      </div>

      {/* Campaign Creation Form */}
      {showForm && (
        <div className="card space-y-5">
          <h3 className="font-semibold text-lg">New Campaign</h3>

          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              id="campaign-name-input"
              value={form.campaignName}
              onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
              className="input-field"
              placeholder="Summer Promo 2025"
            />
          </div>

          {/* WATI Template Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Select WATI Template
              </label>
              <button
                id="refresh-templates-btn"
                type="button"
                onClick={() => fetchWatiTemplates(true)}
                disabled={templatesLoading}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 border border-primary-200 hover:border-primary-400 bg-primary-50 hover:bg-primary-100 rounded-md px-2.5 py-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {templatesLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Refreshing…
                  </>
                ) : <>🔄 Refresh Templates</>}
              </button>
            </div>

            {watiTemplates.length === 0 && !templatesLoading ? (
              <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500">
                No approved WATI templates found.{' '}
                <button
                  type="button"
                  onClick={() => fetchWatiTemplates(true)}
                  className="text-primary-600 hover:underline"
                >
                  Click Refresh
                </button>{' '}
                to load templates from WATI.
              </div>
            ) : (
              <select
                id="meta-template-select"
                value={form.metaTemplateName}
                onChange={handleTemplateChange}
                className="input-field"
              >
                <option value="">Choose WATI template…</option>
                {watiTemplates.map((t) => (
                  <option key={`${t.name}-${t.language}`} value={t.name}>
                    {t.name} — {t.category} ({t.language})
                    {t.paramCount > 0 ? ` · ${t.paramCount} variable(s)` : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Template info badges */}
            {selectedTemplateInfo && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[selectedTemplateInfo.category] || 'bg-gray-100 text-gray-600'}`}>
                  {selectedTemplateInfo.category}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  🌐 {selectedTemplateInfo.language}
                </span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  ✓ APPROVED
                </span>
                {selectedTemplateInfo.paramCount > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    📝 {selectedTemplateInfo.paramCount} variable(s)
                  </span>
                )}
                {selectedTemplateInfo.bodyText && (
                  <span className="text-xs text-gray-500 italic w-full mt-1">
                    "{selectedTemplateInfo.bodyText.substring(0, 80)}
                    {selectedTemplateInfo.bodyText.length > 80 ? '…' : ''}"
                  </span>
                )}
              </div>
            )}

            {/* Variable Mapping UI */}
            {templateParams.length > 0 && (
              <div className="mt-3 border border-blue-100 bg-blue-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700">
                  📝 Map template variables to contact fields
                </p>
                {templateParams.map((param, i) => (
                  <div key={param.index} className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded w-10 text-center">
                      {param.label}
                    </span>
                    <span className="text-xs text-gray-500">→</span>
                    <select
                      className="input-field text-sm py-1"
                      value={form.templateVariables[i] || 'name'}
                      onChange={(e) => {
                        const updated = [...form.templateVariables];
                        updated[i] = e.target.value;
                        setForm({ ...form, templateVariables: updated });
                      }}
                    >
                      {CONTACT_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Live preview for first selected contact */}
                {(() => {
                  const firstContact = contacts.find((c) =>
                    form.contactIds.includes(c._id)
                  );
                  if (!firstContact) return null;
                  return (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Preview for <strong>{firstContact.name}</strong>:{' '}
                      {form.templateVariables.map((field, i) => (
                        <span key={i} className="font-mono text-blue-700">
                          {`{{${i + 1}}}`}={firstContact[field] || '—'}
                          {i < form.templateVariables.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Contact Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Contacts ({form.contactIds.length}/{contacts.length} selected)
              </label>
              <button
                type="button"
                onClick={selectAllContacts}
                className="text-sm text-primary-600 hover:underline"
              >
                {form.contactIds.length === contacts.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="p-4 text-gray-500 text-sm">
                  No contacts available. Add contacts first.
                </p>
              ) : (
                contacts.map((contact) => (
                  <label
                    key={contact._id}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={form.contactIds.includes(contact._id)}
                      onChange={() => toggleContact(contact._id)}
                      className="rounded text-primary-600"
                    />
                    <span className="text-sm font-medium">{contact.name}</span>
                    <span className="text-xs text-gray-400">{contact.phone}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              id="preview-campaign-btn"
              onClick={handlePreview}
              className="btn-secondary"
            >
              Preview
            </button>
            <button
              id="save-draft-btn"
              onClick={() => handleCreate(false)}
              disabled={submitting}
              className="btn-secondary"
            >
              Save Draft
            </button>
            <button
              id="send-campaign-btn"
              onClick={() => handleCreate(true)}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Queuing…' : '🚀 Send Campaign'}
            </button>
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {showPreview && previews.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">
            Message Preview ({previews.length} recipient{previews.length !== 1 ? 's' : ''})
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {previews.map((p) => (
              <div key={p.contactId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-500 font-mono text-xs">{p.phone}</span>
                </div>
                <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg flex items-start gap-2">
                  <span>📱</span>
                  <span className="whitespace-pre-wrap">{p.message}</span>
                </div>
                {p.category && (
                  <div className="mt-2 flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[p.category] || 'bg-gray-100 text-gray-600'}`}>
                      {p.category}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {p.language}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No campaigns yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">WATI Template</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Variables</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Sent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Failed</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign._id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium">{campaign.campaignName}</td>
                    <td className="py-3 px-4">
                      {campaign.metaTemplateName ? (
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {campaign.metaTemplateName}
                          </span>
                          {campaign.metaTemplateLanguage && (
                            <span className="text-xs text-gray-400">
                              ({campaign.metaTemplateLanguage})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          {campaign.templateId?.title || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {campaign.templateVariables?.length > 0 ? (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {campaign.templateVariables.join(', ')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">none</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{campaign.totalContacts}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">
                      {campaign.sentCount}
                    </td>
                    <td className="py-3 px-4 text-red-600 font-medium">
                      {campaign.failedCount}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                        {campaign.status === 'partial' ? '⚠ partial' : campaign.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleSendDraft(campaign._id)}
                          className="text-primary-600 hover:underline text-sm"
                        >
                          Send Now
                        </button>
                      )}
                      {campaign.status === 'sending' && (
                        <span className="text-xs text-yellow-600 flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Sending…
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => { setPage((p) => p - 1); fetchCampaigns(page - 1); }}
                  disabled={page <= 1}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => { setPage((p) => p + 1); fetchCampaigns(page + 1); }}
                  disabled={page >= totalPages}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;