import { useEffect, useState, useCallback } from 'react';
import { campaignsAPI, contactsAPI, templatesAPI } from '../services/api';
import { getSocket, connectSocket } from '../services/socket';

const statusColors = {
  draft:     'bg-slate-100 text-slate-700 border-slate-200',
  sending:   'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial:   'bg-orange-50 text-orange-700 border-orange-200',
  failed:    'bg-red-50 text-red-700 border-red-200',
};

const categoryColors = {
  MARKETING:      'bg-purple-50 text-purple-700 border-purple-200',
  UTILITY:        'bg-blue-50 text-blue-700 border-blue-200',
  AUTHENTICATION: 'bg-amber-50 text-amber-700 border-amber-200',
};

const CONTACT_FIELDS = [
  { value: 'name',  label: 'Contact Name (Name)' },
  { value: 'phone', label: 'Phone Number (Phone)' },
  { value: 'email', label: 'Email Address (Email)' },
];

const extractTemplateParams = (template) => {
  if (!template) return [];
  const count = template.paramCount || 0;
  if (count > 0) {
    return Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      label: `{{${i + 1}}}`,
    }));
  }
  const bodyText = template.bodyText || '';
  const matches = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)];
  return Array.from({ length: matches.length }, (_, i) => ({
    index: i + 1,
    label: `{{${i + 1}}}`,
  }));
};

const CampaignProgress = ({ progress }) => (
  <div className="card border-l-4 border-l-indigo-600 bg-indigo-50/20 p-5 space-y-3 animate-fade-in">
    <div className="flex items-center justify-between">
      <h4 className="font-bold text-slate-900 flex items-center gap-2">
        <span className="animate-bounce">🚀</span> Campaign Sending In Progress...
      </h4>
      <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">{progress.percent}%</span>
    </div>
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div
        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
        style={{ width: `${progress.percent}%` }}
      />
    </div>
    <div className="flex gap-4 text-xs font-semibold">
      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-250">✓ Sent: {progress.sent}</span>
      {progress.failed > 0 && (
        <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-250">✗ Failed: {progress.failed}</span>
      )}
      <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">Total Recipient Queue: {progress.total}</span>
    </div>
  </div>
);

const Campaigns = () => {
  const [campaigns, setCampaigns]           = useState([]);
  const [contacts, setContacts]             = useState([]);
  const [watiTemplates, setWatiTemplates]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [showWizard, setShowWizard]         = useState(false);
  const [currentStep, setCurrentStep]       = useState(1);
  const [contactSelectionType, setContactSelectionType] = useState('all'); // 'all' | 'manual' | 'tags'
  const [selectedTags, setSelectedTags]     = useState([]);
  const [previews, setPreviews]             = useState([]);
  const [submitting, setSubmitting]         = useState(false);
  const [activeCampaignProgress, setActiveCampaignProgress] = useState(null);
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [templateParams, setTemplateParams] = useState([]);

  const [form, setForm] = useState({
    campaignName:         '',
    metaTemplateName:     '',
    metaTemplateLanguage: 'en_US',
    metaTemplateBodyText: '',
    templateVariables:    [],
    templateParamCount:   0,
    contactIds:           [],
  });

  const fetchWatiTemplates = useCallback(async (showToast = false) => {
    setTemplatesLoading(true);
    try {
      const { data } = await templatesAPI.syncWati({ all: true });
      setWatiTemplates(Array.isArray(data?.templates) ? data.templates : []);
      if (showToast) {
        setSuccess(`✅ Refreshed templates successfully from WATI.`);
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sync WATI templates');
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
        contactsAPI.getAll({ limit: 10000 }),
        fetchCampaigns(1),
      ]);
      setContacts(contactsRes.data.contacts || []);
    } finally {
      setLoading(false);
    }
  }, [fetchCampaigns]);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('campaign:progress', (data) => {
      setActiveCampaignProgress(data);
    });

    socket.on('campaign:completed', (data) => {
      setActiveCampaignProgress(null);
      fetchCampaigns(page);
      setSuccess(`✅ Campaign completed! Sent: ${data.sentCount} message(s)`);
      setTimeout(() => setSuccess(''), 6000);
    });

    socket.on('campaign:failed', (data) => {
      setActiveCampaignProgress(null);
      fetchCampaigns(page);
      setError(`Campaign execution failed: ${data.error}`);
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

  const toggleContact = (id) => {
    setForm((prev) => ({
      ...prev,
      contactIds: prev.contactIds.includes(id)
        ? prev.contactIds.filter((c) => c !== id)
        : [...prev.contactIds, id],
    }));
  };

  const handleTagToggle = (tag) => {
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(nextTags);

    // Auto-update form contacts that match selected tags
    const matched = contacts
      .filter((c) => (c.tags || []).some((t) => nextTags.includes(t)))
      .map((c) => c._id);
    setForm((prev) => ({ ...prev, contactIds: matched }));
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
    setShowWizard(false);
    setCurrentStep(1);
    setContactSelectionType('all');
    setSelectedTags([]);
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

  const handleTemplateChange = (name) => {
    const tpl = watiTemplates.find((t) => t.name === name);
    const params = extractTemplateParams(tpl);
    setTemplateParams(params);
    setForm({
      ...form,
      metaTemplateName:     name,
      metaTemplateLanguage: tpl?.language || 'en_US',
      metaTemplateBodyText: tpl?.bodyText || '',
      templateVariables:    params.map(() => 'name'), // fallback mapper
      templateParamCount:   params.length,
    });
  };

  // Generate Preview Data
  const generatePreviews = () => {
    const selectedTemplate = watiTemplates.find(
      (t) => t.name === form.metaTemplateName
    );

    let activeContacts = [];
    if (contactSelectionType === 'all') {
      activeContacts = contacts;
    } else {
      activeContacts = contacts.filter((c) => form.contactIds.includes(c._id));
    }

    const previewList = activeContacts.slice(0, 5).map((contact) => {
      let resolvedMessage = form.metaTemplateBodyText || `[Template: ${form.metaTemplateName}]`;
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
    });

    setPreviews(previewList);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!form.campaignName.trim()) {
        setError('Please enter a campaign name');
        return;
      }
      if (!form.metaTemplateName) {
        setError('Please select a WATI template');
        return;
      }
    }

    if (currentStep === 2) {
      // Set contact ids if 'all' is selected
      if (contactSelectionType === 'all') {
        setForm(prev => ({ ...prev, contactIds: contacts.map(c => c._id) }));
      } else if (form.contactIds.length === 0) {
        setError('Please select at least one contact');
        return;
      }
    }

    setError('');
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    if (nextStep === 4) {
      generatePreviews();
    }
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleCreateCampaign = async (sendNow = false) => {
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const { data } = await campaignsAPI.create({ ...form, send: sendNow });
      if (sendNow) {
        const socket = getSocket();
        socket.emit('subscribe:campaign', data._id);
        setSuccess('🚀 Campaign launched successfully! Progress updates will stream live.');
      } else {
        setSuccess('💾 Campaign saved as draft successfully.');
      }
      resetForm();
      fetchCampaigns(1);
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
      const socket = getSocket();
      socket.emit('subscribe:campaign', id);
      setSuccess('🚀 Campaign queued for sending!');
      fetchCampaigns(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Send failed');
    }
  };

  const uniqueTags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])));

  return (
    <div className="space-y-6">
      {/* Alert notifications */}
      {error && (
        <div className="alert alert-error animate-fade-in">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success animate-fade-in">
          <span>{success}</span>
        </div>
      )}

      {/* Campaign Progress Display */}
      {activeCampaignProgress && (
        <CampaignProgress progress={activeCampaignProgress} />
      )}

      {/* Top action header */}
      {!showWizard && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h2>
            <p className="text-sm text-slate-500 mt-1">
              Broadcast template notifications to your synced contacts via WATI WhatsApp APIs.
            </p>
          </div>
          <button
            id="create-campaign-btn"
            onClick={() => { resetForm(); setShowWizard(true); }}
            className="btn-primary"
          >
            + Build Campaign
          </button>
        </div>
      )}

      {/* Wizard Builder Component */}
      {showWizard && (
        <div className="card bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
          {/* Step wizard indicator header */}
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create Broadcast Campaign</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-sm">
                Cancel Builder
              </button>
            </div>
            {/* Step bubbles */}
            <div className="mt-6 grid grid-cols-5 gap-2 text-center text-xs font-semibold">
              {[
                'Choose Template',
                'Select Contacts',
                'Map Variables',
                'Preview Message',
                'Launch Campaign',
              ].map((stepLabel, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;
                return (
                  <div key={idx} className="space-y-2">
                    <div
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : isActive
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm ring-2 ring-offset-2 ring-indigo-500'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? '✓' : stepNum}
                    </div>
                    <span className={isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}>
                      {stepLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 1: CHOOSE TEMPLATE */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="form-group">
                <label className="label">Campaign Name</label>
                <input
                  id="campaign-name-input"
                  value={form.campaignName}
                  onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Summer Promo Broadcast"
                  required
                />
              </div>

              <div className="form-group">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Select WATI Template</label>
                  <button
                    id="refresh-templates-btn"
                    type="button"
                    onClick={() => fetchWatiTemplates(true)}
                    disabled={templatesLoading}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Refresh Templates
                  </button>
                </div>

                <select
                  id="meta-template-select"
                  value={form.metaTemplateName}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Choose WATI Template...</option>
                  {watiTemplates.map((t) => (
                    <option key={`${t.name}-${t.language}`} value={t.name}>
                      {t.name} [{t.category}] ({t.language})
                    </option>
                  ))}
                </select>
              </div>

              {form.metaTemplateName && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Template Preview:</div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {form.metaTemplateBodyText || 'This template has no text body.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELECT CRM CONTACTS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="form-group">
                <label className="label">Recipients Grouping Selection</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'all', label: 'All Contacts', desc: `Broadcast to all ${contacts.length} entries` },
                    { value: 'manual', label: 'Select Manually', desc: 'Check individual contact rows' },
                    { value: 'tags', label: 'Filter by Tags', desc: 'Target specific label segments' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition ${
                        contactSelectionType === opt.value
                          ? 'border-indigo-600 bg-indigo-50/10'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="selection-type"
                          value={opt.value}
                          checked={contactSelectionType === opt.value}
                          onChange={() => {
                            setContactSelectionType(opt.value);
                            setForm(prev => ({ ...prev, contactIds: [] }));
                          }}
                          className="text-indigo-600"
                        />
                        <span className="text-xs font-bold text-slate-800">{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {contactSelectionType === 'tags' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="label">Select segment tags:</label>
                  <div className="flex flex-wrap gap-2">
                    {uniqueTags.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No tags configured in database contacts.</span>
                    ) : (
                      uniqueTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                            selectedTags.includes(tag)
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {tag}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Matching Contacts selected: <strong>{form.contactIds.length}</strong>
                  </div>
                </div>
              )}

              {contactSelectionType === 'manual' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      Manual list: <strong>{form.contactIds.length}</strong> of {contacts.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={selectAllContacts}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      Toggle All
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {contacts.map((contact) => (
                      <label
                        key={contact._id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.contactIds.includes(contact._id)}
                          onChange={() => toggleContact(contact._id)}
                          className="rounded text-indigo-600"
                        />
                        <span className="text-xs font-bold text-slate-800">{contact.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{contact.phone}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: MAP VARIABLES */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-slate-500 leading-relaxed">
                Provide matching mappings for template variables placeholders. WATI replaces these for each customer.
              </p>

              {templateParams.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                  This template does not contain placeholders like {"{{1}}"}.
                </div>
              ) : (
                <div className="space-y-3">
                  {templateParams.map((param, i) => (
                    <div key={param.index} className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <span className="text-xs font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
                        {param.label}
                      </span>
                      <span className="text-xs text-slate-400">→ Map to contact property</span>
                      <select
                        className="input-field text-xs py-1"
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
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PREVIEW MESSAGES */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-slate-500">
                Double-check the dynamically mapped variables. (Showing preview limit up to 5 contacts)
              </p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {previews.map((p, idx) => (
                  <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <strong className="text-slate-800">{p.name}</strong>
                      <span className="text-slate-400 font-mono text-[10px]">{p.phone}</span>
                    </div>
                    <div className="bg-emerald-50 text-slate-700 p-2.5 rounded-lg text-xs border border-emerald-100 flex items-start gap-1">
                      <span>💬</span>
                      <span className="whitespace-pre-wrap">{p.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: SEND / SCHEDULE CAMPAIGN */}
          {currentStep === 5 && (
            <div className="space-y-4 text-center py-6 animate-fade-in">
              <div className="text-5xl mb-2">🚀</div>
              <h3 className="text-base font-bold text-slate-900">Confirm Broadcast Details</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Review your campaign parameter selections. You can save as draft configuration or fire it off immediately.
              </p>
              <div className="text-xs font-semibold bg-slate-50 border border-slate-100 p-3 rounded-xl max-w-xs mx-auto space-y-1">
                <div className="flex justify-between"><span>Template:</span> <span className="font-mono">{form.metaTemplateName}</span></div>
                <div className="flex justify-between"><span>Recipients:</span> <span>{contactSelectionType === 'all' ? contacts.length : form.contactIds.length}</span></div>
                <div className="flex justify-between"><span>Params:</span> <span>{templateParams.length} Variable(s)</span></div>
              </div>
            </div>
          )}

          {/* Stepper Wizard Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            {currentStep > 1 ? (
              <button type="button" onClick={handlePrevStep} className="btn-secondary">
                Back
              </button>
            ) : (
              <span />
            )}

            {currentStep < 5 ? (
              <button type="button" onClick={handleNextStep} className="btn-primary">
                Continue →
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateCampaign(false)}
                  disabled={submitting}
                  className="btn-secondary"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateCampaign(true)}
                  disabled={submitting}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                >
                  🚀 Fire Broadcast
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Campaigns Listing */}
      <div className="card p-0 overflow-hidden bg-white border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900">Broadcast Campaigns History</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No broadcast campaigns logged yet. Launch one above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500">Campaign</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500">Template</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500">Mapping</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500">Recipients</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500">Metrics (S/F)</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign._id}
                    className="hover:bg-slate-50/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-800">{campaign.campaignName}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs bg-slate-100 border border-slate-150 px-1.5 py-0.5 rounded text-slate-600">
                        {campaign.metaTemplateName || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {campaign.templateVariables?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {campaign.templateVariables.map((v, i) => (
                            <span key={i} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">none</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{campaign.totalContacts}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-2 text-xs font-semibold">
                        <span className="text-emerald-700">{campaign.sentCount} sent</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-red-600">{campaign.failedCount} failed</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusColors[campaign.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleSendDraft(campaign._id)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Send Broadcast
                        </button>
                      )}
                      {campaign.status === 'sending' && (
                        <span className="text-xs text-amber-600 font-bold flex items-center justify-end gap-1.5">
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Queued...
                        </span>
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