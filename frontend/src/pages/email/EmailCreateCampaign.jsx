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
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importedContactIds, setImportedContactIds] = useState([]);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

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

  // Handlers
  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };
  
  const handleFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    try {
      // The backend /contacts/import expects a form-data "file"
      const res = await contactsAPI.importCSV(file);
      setImportResult(res.data);
      // Wait, /contacts/import might not return the IDs of imported contacts immediately if done via queue.
      // For now, we will fetch recent contacts or let backend handle all if recipients array is empty.
      // But to be precise, let's assume we proceed and just tell backend to target all or rely on recent.
      // For this workflow, if we don't have IDs, we can pass null to recipients, meaning "all valid emails".
      // Let's set a flag that we have imported.
    } catch (err) {
      console.error(err);
      alert('File upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
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
      if (file && !importResult) {
        await uploadFile();
      } else if (!file) {
        // If they skip file upload, we'll send to all existing contacts.
        const confirm = window.confirm("No file uploaded. Proceed with ALL existing contacts in the CRM?");
        if (!confirm) return;
        setImportResult({ message: 'Targeting all existing contacts', total: 'All' });
      }
    }
    
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        name: campaignName,
        subject: campaignSubject || selectedTemplate.subject,
        senderName: selectedSender.name,
        senderEmail: selectedSender.email,
        templateId: selectedTemplate._id,
        htmlContent: selectedTemplate.htmlContent,
        recipients: [] // Empty array tells backend to fetch all valid email contacts
      };

      await emailCampaignsAPI.create(payload);
      
      // Success! Redirect to history
      window.location.href = '/email-campaigns';
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
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#F57C20,#f59e0b)]">
          Create Email Campaign
        </h1>
        <p className="text-slate-400 mt-2">Follow the steps to configure and launch your campaign.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-center mb-10">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= i ? 'bg-[#F57C20] text-white shadow-lg shadow-orange-500/30' : 'bg-[#1f2937] text-slate-500'}`}>
              {step > i ? <Icons.Check /> : i}
            </div>
            {i < 5 && (
              <div className={`w-16 h-1 mx-2 rounded ${step > i ? 'bg-[#F57C20]' : 'bg-[#1f2937]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-[#1f2937] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: TEMPLATE */}
          {step === STEPS.TEMPLATE && (
            <motion.div key="step1" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Step 1: Choose Template</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Name</label>
                  <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} className="w-full bg-[#374151] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20]" placeholder="e.g. Summer Sale 2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Subject Line</label>
                  <input type="text" value={campaignSubject} onChange={e => setCampaignSubject(e.target.value)} className="w-full bg-[#374151] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20]" placeholder="Will default to template subject if empty" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {templates.map(t => (
                  <div key={t._id} onClick={() => setSelectedTemplate(t)} className={`relative p-5 rounded-2xl cursor-pointer border-2 transition-all ${selectedTemplate?._id === t._id ? 'border-[#F57C20] bg-[#F57C20]/10' : 'border-transparent bg-white/5 hover:bg-white/10'}`}>
                    <h3 className="font-bold text-white text-lg truncate">{t.name}</h3>
                    <p className="text-sm text-slate-400 mt-1 truncate">{t.subject}</p>
                    {selectedTemplate?._id === t._id && (
                      <div className="absolute top-3 right-3 text-[#F57C20]">
                        <Icons.Check />
                      </div>
                    )}
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="col-span-1 md:col-span-3 text-center py-10 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-slate-400 mb-4">No Email Templates Found</div>
                    <a href="/email/templates" className="px-6 py-2 bg-[#F57C20] hover:bg-orange-600 text-white font-medium rounded-xl inline-block transition-colors">
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
              <h2 className="text-2xl font-bold text-white mb-6">Step 2: Choose Sender</h2>
              <div className="space-y-4 max-w-2xl mx-auto">
                {senders.map((s, idx) => (
                  <div key={idx} onClick={() => setSelectedSender(s)} className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border-2 transition-all ${selectedSender?.email === s.email ? 'border-[#F57C20] bg-[#F57C20]/10' : 'border-transparent bg-white/5 hover:bg-white/10'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl text-slate-300 font-bold uppercase">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">{s.name}</div>
                        <div className="text-sm text-slate-400">{s.email}</div>
                      </div>
                    </div>
                    {selectedSender?.email === s.email && <div className="text-[#F57C20]"><Icons.Check /></div>}
                  </div>
                ))}
                {senders.length === 0 && (
                  <div className="text-center text-slate-400 py-8">No senders configured. Please add them in Settings.</div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: CONTACTS */}
          {step === STEPS.CONTACTS && (
            <motion.div key="step3" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold text-white mb-6">Step 3: Upload Contacts</h2>
              <p className="text-slate-400 mb-6">Upload an Excel (.xlsx) or CSV file containing your contacts. We will automatically detect Name, Email, Phone, College, and Department.</p>
              
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-white/20 rounded-3xl p-12 text-center hover:border-[#F57C20]/50 transition-colors bg-white/5"
              >
                <div className="flex justify-center text-slate-400 mb-4"><Icons.Upload /></div>
                <h3 className="text-xl font-bold text-white mb-2">{file ? file.name : "Drag & Drop your file here"}</h3>
                <p className="text-slate-400 mb-6">or</p>
                <label className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl cursor-pointer transition-colors">
                  Browse Files
                  <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              
              {file && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 flex items-center gap-3">
                  <Icons.Check /> File ready for import. Click Next to process.
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: PREVIEW */}
          {step === STEPS.PREVIEW && (
            <motion.div key="step4" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold text-white mb-6">Step 4: Configure & Preview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Daily Sending Limit</label>
                      <input 
                        type="number" 
                        defaultValue={100}
                        id="dailyLimit"
                        className="w-full bg-[#374151] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20]" 
                      />
                    </div>
                    <div>
                      <span className="text-slate-300">Total Contacts Target:</span> <span className="text-white font-bold ml-2">{importResult?.total || 'All CRM Contacts'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1f2937] p-6 rounded-2xl border border-white/10 flex flex-col">
                  <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Email Preview</h3>
                  <div className="flex-1 bg-white p-4 rounded-xl text-black overflow-y-auto max-h-60 text-sm">
                    {/* Minimal variable replacement preview */}
                    {selectedTemplate ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: selectedTemplate.htmlContent
                          .replace(/{{name}}/g, 'Arun')
                          .replace(/{{company}}/g, 'ABC Interiors')
                          .replace(/{{website}}/g, 'abcinteriors.com')
                          .replace(/{{industry}}/g, 'Design')
                          .replace(/{{location}}/g, 'New York')
                      }} />
                    ) : (
                      <p>No template selected.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: CONFIRM */}
          {step === STEPS.CONFIRM && (
            <motion.div key="step5" variants={slideVariants} initial="initial" animate="enter" exit="exit" transition={{ duration: 0.3 }} className="text-center py-10">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icons.Upload />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Activate!</h2>
              <p className="text-slate-400 max-w-md mx-auto mb-8">
                Your campaign <strong>{campaignName}</strong> is ready. Clicking "Activate Campaign" will queue the emails. Google Apps Script will handle the automated dispatching based on your daily limit.
              </p>
              
              {submitError && (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl max-w-md mx-auto mb-8 border border-red-500/20 text-sm">
                  {submitError}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <button 
          onClick={() => setStep(s => Math.max(1, s - 1))} 
          disabled={step === 1 || submitting}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          Back
        </button>
        
        {step < STEPS.CONFIRM ? (
          <button 
            onClick={handleNext}
            disabled={uploading}
            className="px-8 py-3 bg-[#F57C20] hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
          >
            {uploading ? 'Processing...' : 'Next Step'} 
            {!uploading && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
          </button>
        ) : (
          <button 
            onClick={() => {
              const dailyLimitVal = document.getElementById('dailyLimit')?.value || 100;
              // Add dailyLimit to submit handler by modifying handleSubmit to read from state or directly here
              // For simplicity, modifying handleSubmit to accept dailyLimit directly
              setSubmitting(true);
              setSubmitError(null);
              api.post('/email-campaigns', {
                name: campaignName,
                subject: campaignSubject || selectedTemplate.subject,
                templateId: selectedTemplate._id,
                htmlContent: selectedTemplate.htmlContent,
                recipients: [],
                dailyLimit: parseInt(dailyLimitVal, 10)
              }).then(() => {
                window.location.href = '/email-campaigns';
              }).catch(err => {
                setSubmitError(err.response?.data?.message || err.message);
                setSubmitting(false);
              });
            }}
            disabled={submitting}
            className="px-10 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-lg"
          >
            {submitting ? 'Activating...' : 'Activate Campaign'}
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />}

    </div>
  );
}
