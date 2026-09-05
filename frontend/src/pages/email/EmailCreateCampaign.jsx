import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emailTemplatesAPI, emailCampaignsAPI, settingsAPI, contactsAPI } from '../../services/api';

/* ── Wizard Steps Enum ──────────────────────────────────────────────────────── */
const STEPS = {
  TEMPLATE: 1,
  SENDER: 2,
  CONTACTS: 3,
  PREVIEW: 4,
  CONFIRM: 5,
};

/* ── Helper Icons ─────────────────────────────────────────────────────────── */
const Icons = {
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

/* ── Toast ────────────────────────────────────────────────────────────── */
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold animate-fade-in ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      <span>{type === 'success' ? '✓' : '✗'}</span>
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
};

export default function EmailCreateCampaign() {
  const [step, setStep] = useState(STEPS.TEMPLATE);
  
  // Data States
  const [templates, setTemplates] = useState([]);
  const [senders, setSenders] = useState([]);
  const [toast, setToast] = useState(null);
  
  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = () => setToast(null);
  
  // Selections
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSender, setSelectedSender] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  
  // Contacts
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [fetchingContacts, setFetchingContacts] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchTemplates();
    fetchSenders();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data } = await emailTemplatesAPI.getAll();
      setTemplates(Array.isArray(data) ? data : data.templates || []);
    } catch (err) {
      console.error('Failed to load templates', err);
      showToast('Failed to load templates', 'error');
    }
  };

  const fetchSenders = async () => {
    try {
      const { data } = await settingsAPI.get();
      if (data.settings && data.settings.senders) {
        setSenders(data.settings.senders);
        if (data.settings.senders.length > 0) {
          setSelectedSender(data.settings.senders[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load senders', err);
    }
  };

  const fetchCRMContacts = async () => {
    setFetchingContacts(true);
    try {
      const res = await contactsAPI.getAll({ page: 1, limit: 5000 });
      const data = res.data.contacts || res.data || [];
      const valid = data.filter(c => c.email && c.email.includes('@'));
      setContacts(valid);
      setFilteredContacts(valid);
    } catch (err) {
      showToast('Failed to load contacts', 'error');
    } finally {
      setFetchingContacts(false);
    }
  };

  useEffect(() => {
    if (step === STEPS.CONTACTS && contacts.length === 0 && !fetchingContacts) {
      fetchCRMContacts();
    }
  }, [step]);

  useEffect(() => {
    if (search.trim()) {
      setFilteredContacts(contacts.filter(c => 
        c.name?.toLowerCase().includes(search.toLowerCase()) || 
        c.email?.toLowerCase().includes(search.toLowerCase())
      ));
    } else {
      setFilteredContacts(contacts);
    }
  }, [search, contacts]);

  const toggleContactSelection = (id) => {
    const newSelection = new Set(selectedContactIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedContactIds(newSelection);
  };

  const selectAllFiltered = () => {
    const newSelection = new Set(selectedContactIds);
    filteredContacts.forEach(c => newSelection.add(c._id));
    setSelectedContactIds(newSelection);
  };

  const unselectAllFiltered = () => {
    const newSelection = new Set(selectedContactIds);
    filteredContacts.forEach(c => newSelection.delete(c._id));
    setSelectedContactIds(newSelection);
  };

  const handleNext = async () => {
    if (step === STEPS.TEMPLATE) {
      if (!selectedTemplate) return alert('Select a template');
      if (!campaignName) return alert('Enter a campaign name');
      if (!campaignSubject) setCampaignSubject(selectedTemplate.subject);
    }
    if (step === STEPS.SENDER) {
      if (!selectedSender) return alert('Select a sender');
    }
    if (step === STEPS.CONTACTS) {
      if (selectedContactIds.size === 0) {
        const confirm = window.confirm("No contacts selected. Proceed with ALL active CRM contacts?");
        if (!confirm) return;
      }
    }
    
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const dailyLimitVal = document.getElementById('dailyLimit')?.value || 100;
      
      const payload = {
        name: campaignName,
        subject: campaignSubject || selectedTemplate.subject,
        senderName: selectedSender.name,
        senderEmail: selectedSender.email,
        templateId: selectedTemplate._id,
        htmlContent: selectedTemplate.htmlContent,
        recipients: Array.from(selectedContactIds),
        dailyLimit: parseInt(dailyLimitVal, 10)
      };

      const res = await emailCampaignsAPI.create(payload);
      setSubmitResult(res.data.stats || { queued: res.data.campaign?.stats?.totalContacts || 0, skipped: 0 });
      setStep(STEPS.CONFIRM + 1); // Move to a final success step implicitly
      
      setTimeout(() => {
        window.location.href = '/email-campaigns';
      }, 3000);
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message);
      setSubmitting(false);
    }
  };

  /* ── Variants ───────────────────────────────────────────────────────────── */
  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary-dark">
          Create Email Campaign
        </h1>
        <p className="text-text-muted mt-2">Follow the steps to configure and launch your campaign.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-center mb-10">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= i ? 'bg-primary text-white shadow-lg' : 'bg-background text-text-muted border border-border'}`}>
              {step > i ? <Icons.Check /> : i}
            </div>
            {i < 5 && (
              <div className={`w-16 h-1 mx-2 rounded ${step > i ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: TEMPLATE */}
          {step === STEPS.TEMPLATE && (
            <motion.div key="step1" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <h2 className="text-2xl font-bold text-text mb-6">Step 1: Choose Template</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Campaign Name</label>
                  <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Summer Sale 2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Subject Line</label>
                  <input type="text" value={campaignSubject} onChange={e => setCampaignSubject(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary transition-colors" placeholder="Will default to template subject if empty" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {templates.map(t => (
                  <div key={t._id} onClick={() => setSelectedTemplate(t)} className={`relative p-5 rounded-2xl cursor-pointer border-2 transition-all ${selectedTemplate?._id === t._id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}>
                    <h3 className="font-bold text-text text-lg truncate">{t.name}</h3>
                    <p className="text-sm text-text-muted mt-1 truncate">{t.subject}</p>
                    {selectedTemplate?._id === t._id && (
                      <div className="absolute top-3 right-3 text-primary">
                        <Icons.Check />
                      </div>
                    )}
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="col-span-1 md:col-span-3 text-center py-10 bg-background rounded-2xl border border-border">
                    <div className="text-text-muted mb-4">No Email Templates Found</div>
                    <a href="/email/templates" className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl inline-block transition-colors">
                      Create Template
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: SENDER */}
          {step === STEPS.SENDER && (
            <motion.div key="step2" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold text-text mb-6">Step 2: Choose Sender</h2>
              <div className="space-y-4 max-w-2xl mx-auto">
                {senders.map((s, idx) => (
                  <div key={idx} onClick={() => setSelectedSender(s)} className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border-2 transition-all ${selectedSender?.email === s.email ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center text-xl text-text-muted font-bold uppercase">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-text text-lg">{s.name}</div>
                        <div className="text-sm text-text-muted">{s.email}</div>
                      </div>
                    </div>
                    {selectedSender?.email === s.email && <div className="text-primary"><Icons.Check /></div>}
                  </div>
                ))}
                {senders.length === 0 && (
                  <div className="text-center text-text-muted py-8">No senders configured. Please add them in Settings.</div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: CONTACTS */}
          {step === STEPS.CONTACTS && (
            <motion.div key="step3" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text">Campaign Contacts</h2>
                  <p className="text-text-muted mt-1">Select from your CRM contacts to include in this campaign.</p>
                </div>
              </div>

              <div className="bg-background border border-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-text font-bold">{contacts.length} Contacts</span>
                    <span className="text-primary font-bold">{selectedContactIds.size} Selected</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Search contacts..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                    <button onClick={selectAllFiltered} className="text-xs bg-card border border-border hover:bg-background px-3 py-1.5 rounded-lg text-text transition-colors shadow-sm">Select All</button>
                    <button onClick={unselectAllFiltered} className="text-xs bg-card border border-border hover:bg-background px-3 py-1.5 rounded-lg text-text transition-colors shadow-sm">Unselect All</button>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto custom-scrollbar bg-card">
                  {fetchingContacts ? (
                    <div className="p-8 text-center text-text-muted">Loading contacts...</div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-text-muted">No valid contacts found. Please add contacts to your CRM.</div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredContacts.map(c => (
                        <li key={c._id} className={`flex items-center gap-3 p-3 hover:bg-background/50 cursor-pointer transition-colors ${selectedContactIds.has(c._id) ? 'bg-primary/5' : ''}`} onClick={() => toggleContactSelection(c._id)}>
                          <input 
                            type="checkbox" 
                            checked={selectedContactIds.has(c._id)}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                          />
                          <div>
                            <div className="text-text font-medium">{c.name || 'Unknown'}</div>
                            <div className="text-text-muted text-xs">{c.email} {c.companyName && `• ${c.companyName}`}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* STEP 4: PREVIEW */}
          {step === STEPS.PREVIEW && (
            <motion.div key="step4" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold text-text mb-6">Step 4: Configure & Preview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-background p-6 rounded-2xl border border-border">
                  <h3 className="text-text-muted text-sm font-medium uppercase tracking-wider mb-4">Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Daily Sending Limit</label>
                      <input 
                        type="number" 
                        defaultValue={100}
                        id="dailyLimit"
                        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary transition-colors" 
                      />
                    </div>
                    <div>
                      <span className="text-text-muted">Total Contacts Target:</span> <span className="text-text font-bold ml-2">{selectedContactIds.size === 0 ? 'All CRM Contacts' : selectedContactIds.size}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-background p-6 rounded-2xl border border-border flex flex-col">
                  <h3 className="text-text-muted text-sm font-medium uppercase tracking-wider mb-4">Email Preview</h3>
                  <div className="flex-1 bg-card border border-border p-4 rounded-xl text-text overflow-y-auto max-h-60 text-sm shadow-sm">
                    {selectedTemplate ? (
                      (() => {
                        const previewContact = contacts.find(c => selectedContactIds.has(c._id));
                        const previewName = previewContact?.name?.trim() || 'Student';
                        return (
                          <div dangerouslySetInnerHTML={{ 
                            __html: selectedTemplate.htmlContent
                              .replace(/{{name}}/g, previewName)
                              .replace(/{{company}}/g, previewContact?.companyName || 'ABC Interiors')
                              .replace(/{{website}}/g, 'abcinteriors.com')
                              .replace(/{{industry}}/g, 'Design')
                              .replace(/{{location}}/g, 'New York')
                          }} />
                        );
                      })()
                    ) : (
                      <p className="text-text-muted">No template selected.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: CONFIRM */}
          {step === STEPS.CONFIRM && (
            <motion.div key="step5" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }} className="text-center py-10">
              <div className="w-20 h-20 bg-status-success/20 text-status-success rounded-full flex items-center justify-center mx-auto mb-6">
                <Icons.Check />
              </div>
              <h2 className="text-3xl font-bold text-text mb-4">Ready to Activate!</h2>
              <p className="text-text-muted mt-2 leading-relaxed max-w-md mx-auto">
                Your campaign <strong>{campaignName}</strong> is ready to send.<br /><br />
                Clicking "Activate Campaign" will add the selected recipients to the secure email queue. The CRM will automatically process and send the emails according to your configured daily sending limit.<br /><br />
                Duplicate and unsubscribe protections are automatically enforced.
              </p>
              
              {submitError && (
                <div className="p-4 bg-status-danger/10 text-status-danger rounded-xl max-w-md mx-auto mt-8 border border-status-danger/20 text-sm">
                  {submitError}
                </div>
              )}
            </motion.div>
          )}

          {/* SUCCESS MESSAGE IMPLICIT STEP */}
          {step === STEPS.CONFIRM + 1 && (
            <motion.div key="step6" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }} className="text-center py-10">
              <div className="w-20 h-20 bg-status-success/20 text-status-success rounded-full flex items-center justify-center mx-auto mb-6">
                <Icons.Check />
              </div>
              <h2 className="text-3xl font-bold text-text mb-4">Campaign Activated!</h2>
              <p className="text-status-success font-bold max-w-md mx-auto mb-4">
                Recipients Queued: {submitResult?.queued} <br/>
                Skipped (Unsubscribed/Invalid): {submitResult?.skipped}
              </p>
              <p className="text-text-muted max-w-md mx-auto mb-8">Redirecting to campaigns...</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <button 
          onClick={() => setStep(s => Math.max(1, s - 1))} 
          disabled={step === 1 || submitting || step > STEPS.CONFIRM}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 || step > STEPS.CONFIRM ? 'opacity-0 pointer-events-none' : 'bg-card border border-border text-text hover:bg-background shadow-sm'}`}
        >
          Back
        </button>
        
        {step < STEPS.CONFIRM ? (
          <button 
            onClick={handleNext}
            disabled={syncing || fetchingContacts}
            className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            Next Step <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        ) : step === STEPS.CONFIRM ? (
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
          >
            {submitting ? 'Activating...' : 'Activate Campaign'}
          </button>
        ) : null}
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />}

    </div>
  );
}
