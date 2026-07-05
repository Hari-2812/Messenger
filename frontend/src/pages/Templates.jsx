import { useEffect, useState, useCallback } from 'react';
import { templatesAPI } from '../services/api';

const watiStatusConfig = {
  APPROVED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✅', label: 'Approved' },
  PENDING:  { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '⏳', label: 'Pending' },
  REJECTED: { color: 'bg-red-50 text-red-700 border-red-200', icon: '❌', label: 'Rejected' },
  PAUSED:   { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '⏸', label: 'Paused' },
  DISABLED: { color: 'bg-slate-50 text-slate-500 border-slate-200', icon: '🚫', label: 'Disabled' },
};

const categoryColors = {
  MARKETING:      'bg-purple-50 text-purple-700 border-purple-200',
  UTILITY:        'bg-blue-50 text-blue-700 border-blue-200',
  AUTHENTICATION: 'bg-amber-50 text-amber-700 border-amber-200',
};

const Templates = () => {
  const [watiTemplates, setWatiTemplates] = useState([]);
  const [watiLoading, setWatiLoading] = useState(true);
  const [watiError, setWatiError] = useState('');
  const [watiSuccess, setWatiSuccess] = useState('');
  const [watiFilter, setWatiFilter] = useState('ALL');
  const [watiSearch, setWatiSearch] = useState('');

  const fetchWatiTemplates = useCallback(async (showSuccess = false) => {
    setWatiLoading(true);
    setWatiError('');
    try {
      const { data } = await templatesAPI.syncWati({ all: true });
      const templates = Array.isArray(data?.templates) ? data.templates : [];
      setWatiTemplates(templates);
      if (showSuccess) {
        setWatiSuccess(`✅ Synced — ${data.total || templates.length} template(s) loaded from WATI`);
        setTimeout(() => setWatiSuccess(''), 4000);
      }
    } catch (err) {
      setWatiError(err.response?.data?.message || 'Failed to sync templates from WATI');
    } finally {
      setWatiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatiTemplates();
  }, [fetchWatiTemplates]);

  const filteredWati = watiTemplates.filter((t) => {
    const matchesStatus = watiFilter === 'ALL' || t.status === watiFilter;
    const matchesSearch =
      !watiSearch ||
      t.name.toLowerCase().includes(watiSearch.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(watiSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const watiCounts = watiTemplates.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {watiError && (
        <div className="alert alert-error animate-fade-in">
          <span>{watiError}</span>
        </div>
      )}
      {watiSuccess && (
        <div className="alert alert-success animate-fade-in">
          <span>{watiSuccess}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">WhatsApp Templates</h2>
          <p className="text-sm text-slate-500 mt-1">
            Templates are loaded directly from your WATI WhatsApp business configuration.
          </p>
        </div>
        <button
          id="sync-templates-btn"
          onClick={() => fetchWatiTemplates(true)}
          disabled={watiLoading}
          className="inline-flex items-center gap-2 btn-primary disabled:opacity-50"
        >
          {watiLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Syncing from WATI...
            </>
          ) : (
            <>🔄 Sync from WATI</>
          )}
        </button>
      </div>

      {/* Filtering Actions Panel */}
      <div className="flex flex-col gap-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setWatiFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              watiFilter === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Templates ({watiTemplates.length})
          </button>
          {Object.entries(watiStatusConfig).map(([status, cfg]) =>
            watiCounts[status] ? (
              <button
                key={status}
                onClick={() => setWatiFilter(watiFilter === status ? 'ALL' : status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  watiFilter === status
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cfg.icon} {cfg.label} ({watiCounts[status]})
              </button>
            ) : null
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={watiSearch}
            onChange={(e) => setWatiSearch(e.target.value)}
            className="input-field w-full md:w-80"
            placeholder="Search templates by name or category..."
          />
        </div>
      </div>

      {/* Grid List */}
      {watiLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3" />
          <p className="text-sm text-slate-500 font-medium">Fetching templates from your WATI platform...</p>
        </div>
      ) : filteredWati.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
          <div className="text-4xl mb-3">📄</div>
          <h4 className="text-base font-semibold text-slate-800">No Templates Found</h4>
          <p className="text-sm text-slate-500 max-w-xs mt-1">
            {watiTemplates.length === 0
              ? 'Try clicking "Sync from WATI" to sync your WATI templates.'
              : 'No templates match your search filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWati.map((template) => {
            const statusCfg = watiStatusConfig[template.status] || watiStatusConfig.PENDING;
            const catColor = categoryColors[template.category] || 'bg-slate-100 text-slate-600 border-slate-200';
            return (
              <div
                key={`${template.name}-${template.language}`}
                className="card flex flex-col justify-between bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.color}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                    <span className="text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-slate-500 font-mono">
                      {template.language}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-mono break-all">{template.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${catColor}`}>
                        {template.category}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Body Text Preview</div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {template.bodyText || template.message || 'No body text specified'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 space-y-2">
                  {/* Variable mapping tag */}
                  {template.variables && template.variables.length > 0 ? (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Variables:</span>
                      {template.variables.map((v, i) => (
                        <span key={i} className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
                          {v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">No custom parameters in this template.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Templates;
