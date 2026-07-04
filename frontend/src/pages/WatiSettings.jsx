import { useEffect, useState } from 'react';
import { watiAPI, templatesAPI } from '../services/api';

/* ── Status Pill ──────────────────────────────────────────────────────── */
const StatusPill = ({ active, trueLabel = 'Configured', falseLabel = 'Not Set' }) => (
  <span
    className={`badge ${active ? 'badge-success' : 'badge-danger'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
    {active ? trueLabel : falseLabel}
  </span>
);

/* ── Config Row ───────────────────────────────────────────────────────── */
const ConfigRow = ({ label, value, isCode }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-600">{label}</span>
    {isCode ? (
      <code className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg font-mono max-w-[240px] truncate">
        {value || '—'}
      </code>
    ) : (
      value
    )}
  </div>
);

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

/* ── WatiSettings ─────────────────────────────────────────────────────── */
const WatiSettings = () => {
  const [settings, setSettings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [toast, setToast]         = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = () => setToast(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await watiAPI.getSettings();
      setSettings(data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load WATI settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const syncTemplates = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await watiAPI.syncTemplates({ all: true });
      setSyncResult({ total: data.total || 0, templates: data.templates || [] });
      showToast(`✓ Synced ${data.total || 0} WATI template(s)`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Template sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const isWati    = settings?.provider === 'wati';
  const allGood   = settings?.endpointConfigured && settings?.accessTokenConfigured;

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">

      {/* ── Page Header ── */}
      <div>
        <h1 className="page-title">WATI Settings</h1>
        <p className="page-subtitle">Manage your WhatsApp provider configuration</p>
      </div>

      {/* ── Provider Status Card ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: isWati ? 'linear-gradient(135deg, #25d366, #128c7e)' : 'linear-gradient(135deg, #4267B2, #0080ff)' }}
            >
              {isWati ? (
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M11.5 2C6.262 2 2 6.262 2 11.5c0 1.836.528 3.55 1.442 5L2 22l5.664-1.41A9.427 9.427 0 0011.5 21c5.238 0 9.5-4.262 9.5-9.5S16.738 2 11.5 2z" opacity="0.8"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">
                {isWati ? 'WATI' : 'Meta Cloud API'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Active WhatsApp Provider</p>
            </div>
          </div>
          <StatusPill active={allGood} trueLabel="Connected" falseLabel="Misconfigured" />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <ConfigRow label="Provider" value={
              <span className={`font-semibold text-sm ${isWati ? 'gradient-text-green' : 'gradient-text'}`}>
                {settings?.provider?.toUpperCase() || '—'}
              </span>
            } />
            <ConfigRow label="API Endpoint" value={<StatusPill active={settings?.endpointConfigured} />} />
            <ConfigRow label="Access Token" value={<StatusPill active={settings?.accessTokenConfigured} />} />
            <ConfigRow label="Webhook Verify Token" value={<StatusPill active={settings?.webhookVerifyTokenConfigured} />} />
            <ConfigRow label="Business Number" value={settings?.businessNumber} isCode />
            <ConfigRow label="Webhook URL" value={settings?.webhookUrl} isCode />
          </div>
        )}
      </div>

      {/* ── Template Sync Card ── */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Template Sync</h2>
            <p className="text-sm text-gray-500 mt-1">
              Pull approved WhatsApp templates from WATI and make them available for campaigns.
            </p>
          </div>
          <button
            id="sync-templates-btn"
            onClick={syncTemplates}
            disabled={syncing}
            className="btn-primary flex-shrink-0"
          >
            {syncing ? (
              <>
                <div className="spinner w-4 h-4 border-white/30 border-t-white" />
                Syncing…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                Sync Templates
              </>
            )}
          </button>
        </div>

        {/* Sync Flow Diagram */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-5">
          {['WATI Dashboard', 'Approved Templates', 'CRM Sync', 'MongoDB', 'Campaign Dropdown'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg font-medium">{step}</span>
              {i < arr.length - 1 && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-300">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Sync Results */}
        {syncResult && (
          <div className="alert-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <p className="font-semibold">Sync complete — {syncResult.total} template(s) imported</p>
              {syncResult.templates.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {syncResult.templates.slice(0, 8).map((t) => (
                    <span key={t.name} className="chip">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${t.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-gray-400'}`}
                      />
                      {t.name}
                    </span>
                  ))}
                  {syncResult.templates.length > 8 && (
                    <span className="chip">+{syncResult.templates.length - 8} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <strong>Note:</strong> Only templates with status <strong>APPROVED</strong> are available in campaign creation.
          Templates are stored in MongoDB and updated on each sync.
        </div>
      </div>

      {/* ── Environment Guide ── */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-4">Environment Configuration</h2>
        <p className="text-sm text-gray-500 mb-3">Configure these variables in your backend <code className="chip">.env</code> file:</p>
        <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed">
{`# Provider Selection
WHATSAPP_PROVIDER=wati          # 'wati' or 'meta'

# WATI Configuration
WATI_API_ENDPOINT=https://live-server.wati.io
WATI_ACCESS_TOKEN=your-token-here
WATI_WEBHOOK_SECRET=your-secret
WATI_WEBHOOK_VERIFY_TOKEN=your-verify-token
WATI_BUSINESS_NUMBER=91XXXXXXXXXX`}
        </pre>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default WatiSettings;
