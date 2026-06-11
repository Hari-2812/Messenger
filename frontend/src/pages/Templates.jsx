import { useEffect, useState, useCallback } from 'react';
import { metaAPI } from '../services/api';

const statusConfig = {
  APPROVED: { color: 'bg-green-100 text-green-700',   icon: '✅', label: 'Approved' },
  PENDING:  { color: 'bg-yellow-100 text-yellow-700', icon: '⏳', label: 'Pending' },
  REJECTED: { color: 'bg-red-100 text-red-700',       icon: '❌', label: 'Rejected' },
  PAUSED:   { color: 'bg-orange-100 text-orange-700', icon: '⏸', label: 'Paused' },
  DISABLED: { color: 'bg-gray-100 text-gray-500',     icon: '🚫', label: 'Disabled' },
};

const categoryColors = {
  MARKETING:      'bg-purple-100 text-purple-700',
  UTILITY:        'bg-blue-100 text-blue-700',
  AUTHENTICATION: 'bg-orange-100 text-orange-700',
};

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchTemplates = useCallback(async (showSuccess = false) => {
    setLoading(true);
    setError('');
    try {
      // Fetch ALL statuses (not just APPROVED) by calling Meta directly
      const { data } = await metaAPI.getAllTemplates();
      setTemplates(data.templates || []);
      if (showSuccess) {
        setSuccess(`✅ Synced — ${data.total} template(s) loaded from Meta`);
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Meta templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filtered = templates.filter((t) => {
    const matchesStatus = filter === 'ALL' || t.status === filter;
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts = templates.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Meta WhatsApp Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Live from your Meta Business Account · {templates.length} total
          </p>
        </div>
        <button
          id="sync-templates-btn"
          onClick={() => fetchTemplates(true)}
          disabled={loading}
          className="flex items-center gap-2 btn-primary disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Syncing…
            </>
          ) : (
            <>🔄 Sync from Meta</>
          )}
        </button>
      </div>

      {/* ── Status Summary Pills ── */}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({templates.length})
          </button>
          {Object.entries(statusConfig).map(([status, cfg]) =>
            counts[status] ? (
              <button
                key={status}
                onClick={() => setFilter(filter === status ? 'ALL' : status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filter === status ? cfg.color + ' ring-2 ring-offset-1 ring-current' : cfg.color + ' opacity-70 hover:opacity-100'
                }`}
              >
                {cfg.icon} {cfg.label} ({counts[status]})
              </button>
            ) : null
          )}
        </div>
      )}

      {/* ── Search ── */}
      {templates.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full md:w-80"
          placeholder="Search by name or category…"
        />
      )}

      {/* ── Templates Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          {templates.length === 0
            ? 'No templates found in your Meta Business Account. Create templates in Meta Business Manager and click Sync.'
            : 'No templates match the current filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const statusCfg = statusConfig[template.status] || statusConfig.PENDING;
            const catColor = categoryColors[template.category] || 'bg-gray-100 text-gray-600';
            return (
              <div
                key={`${template.name}-${template.language}`}
                className={`card border-l-4 ${
                  template.status === 'APPROVED'
                    ? 'border-l-green-400'
                    : template.status === 'REJECTED'
                    ? 'border-l-red-400'
                    : template.status === 'PENDING'
                    ? 'border-l-yellow-400'
                    : 'border-l-gray-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-mono text-sm font-semibold text-gray-800 break-all">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor}`}>
                        {template.category}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        🌐 {template.language}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusCfg.color}`}>
                    {statusCfg.icon} {statusCfg.label}
                  </span>
                </div>

                {/* Body Text Preview */}
                {template.bodyText && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">
                      {template.bodyText}
                    </p>
                  </div>
                )}

                {/* Rejection Reason */}
                {template.status === 'REJECTED' && template.rejectedReason && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-2 mt-2">
                    <p className="text-xs text-red-600">
                      <strong>Reason:</strong> {template.rejectedReason}
                    </p>
                  </div>
                )}

                {/* Approved — usable in campaigns */}
                {template.status === 'APPROVED' && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Available in Campaign creation
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Info Note ── */}
      <div className="text-xs text-gray-400 text-center mt-4">
        To create new templates, go to{' '}
        <a
          href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          Meta Business Manager → Message Templates
        </a>
        . Approved templates appear here automatically after Sync.
      </div>
    </div>
  );
};

export default Templates;
