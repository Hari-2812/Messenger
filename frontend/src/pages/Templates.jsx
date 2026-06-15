import { useEffect, useState, useCallback } from 'react';
import { metaAPI, templatesAPI } from '../services/api';

// ── Meta Template Card ───────────────────────────────────────────────────────

const metaStatusConfig = {
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

// ── Local Template Card ──────────────────────────────────────────────────────

const LocalTemplateCard = ({ template, onEdit, onDelete }) => (
  <div className="card border-l-4 border-l-gray-400">
    <div className="flex items-start justify-between mb-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">{template.title}</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            📝 Local CRM
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Created {new Date(template.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
    <div className="bg-gray-50 rounded-lg p-3 mb-3">
      <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">{template.message}</p>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onEdit(template)}
        className="text-xs text-primary-600 hover:underline"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(template._id)}
        className="text-xs text-red-600 hover:underline"
      >
        Delete
      </button>
    </div>
  </div>
);

const Templates = () => {
  // Tab: 'meta' | 'local'
  const [activeTab, setActiveTab] = useState('meta');

  // Meta templates state
  const [metaTemplates, setMetaTemplates] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState('');
  const [metaSuccess, setMetaSuccess] = useState('');
  const [metaFilter, setMetaFilter] = useState('ALL');
  const [metaSearch, setMetaSearch] = useState('');

  // Local templates state
  const [localTemplates, setLocalTemplates] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [editingLocalId, setEditingLocalId] = useState(null);
  const [localForm, setLocalForm] = useState({ title: '', message: '' });

  // ── Meta Templates ─────────────────────────────────────────────────────────

  const fetchMetaTemplates = useCallback(async (showSuccess = false) => {
    setMetaLoading(true);
    setMetaError('');
    try {
      const { data } = await metaAPI.getAllTemplates();
      setMetaTemplates(data.templates || []);
      if (showSuccess) {
        setMetaSuccess(`✅ Synced — ${data.total} template(s) loaded from Meta`);
        setTimeout(() => setMetaSuccess(''), 4000);
      }
    } catch (err) {
      setMetaError(err.response?.data?.message || 'Failed to load Meta templates');
    } finally {
      setMetaLoading(false);
    }
  }, []);

  // ── Local Templates ─────────────────────────────────────────────────────────

  const fetchLocalTemplates = useCallback(async () => {
    setLocalLoading(true);
    try {
      const { data } = await templatesAPI.getAll({ source: 'local' });
      setLocalTemplates(data);
      setLocalError('');
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Failed to load local templates');
    } finally {
      setLocalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetaTemplates();
    fetchLocalTemplates();
  }, [fetchMetaTemplates, fetchLocalTemplates]);

  const resetLocalForm = () => {
    setLocalForm({ title: '', message: '' });
    setEditingLocalId(null);
    setShowLocalForm(false);
    setLocalError('');
  };

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalSuccess('');
    try {
      if (editingLocalId) {
        await templatesAPI.update(editingLocalId, localForm);
        setLocalSuccess('Template updated');
      } else {
        await templatesAPI.create(localForm);
        setLocalSuccess('Template created');
      }
      resetLocalForm();
      fetchLocalTemplates();
      setTimeout(() => setLocalSuccess(''), 3000);
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleLocalEdit = (template) => {
    setLocalForm({ title: template.title, message: template.message });
    setEditingLocalId(template._id);
    setShowLocalForm(true);
  };

  const handleLocalDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await templatesAPI.delete(id);
      setLocalSuccess('Template deleted');
      fetchLocalTemplates();
      setTimeout(() => setLocalSuccess(''), 3000);
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Delete failed');
    }
  };

  // ── Meta filtering ─────────────────────────────────────────────────────────
  const filteredMeta = metaTemplates.filter((t) => {
    const matchesStatus = metaFilter === 'ALL' || t.status === metaFilter;
    const matchesSearch =
      !metaSearch ||
      t.name.toLowerCase().includes(metaSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(metaSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const metaCounts = metaTemplates.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* ── Tab Bar ── */}
      <div className="flex items-center border-b border-gray-200">
        <button
          id="meta-templates-tab"
          onClick={() => setActiveTab('meta')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'meta'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📱 Meta Templates
          {metaTemplates.length > 0 && (
            <span className="ml-2 bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">
              {metaTemplates.length}
            </span>
          )}
        </button>
        <button
          id="local-templates-tab"
          onClick={() => setActiveTab('local')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'local'
              ? 'border-gray-600 text-gray-800'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 Local CRM Templates
          {localTemplates.length > 0 && (
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
              {localTemplates.length}
            </span>
          )}
        </button>
      </div>

      {/* ── META TEMPLATES TAB ── */}
      {activeTab === 'meta' && (
        <div className="space-y-6">
          {metaError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {metaError}
            </div>
          )}
          {metaSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {metaSuccess}
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <span>ℹ️</span>
            <span>
              <strong>Meta-approved templates</strong> are created and managed in{' '}
              <a
                href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Meta Business Manager
              </a>
              . They cannot be edited here — only used in campaigns.
            </span>
          </div>

          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Meta WhatsApp Templates</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Live from your Meta Business Account · {metaTemplates.length} total
              </p>
            </div>
            <button
              id="sync-templates-btn"
              onClick={() => fetchMetaTemplates(true)}
              disabled={metaLoading}
              className="flex items-center gap-2 btn-primary disabled:opacity-50"
            >
              {metaLoading ? (
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

          {/* Status filter pills */}
          {metaTemplates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMetaFilter('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  metaFilter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({metaTemplates.length})
              </button>
              {Object.entries(metaStatusConfig).map(([status, cfg]) =>
                metaCounts[status] ? (
                  <button
                    key={status}
                    onClick={() => setMetaFilter(metaFilter === status ? 'ALL' : status)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      metaFilter === status
                        ? cfg.color + ' ring-2 ring-offset-1 ring-current'
                        : cfg.color + ' opacity-70 hover:opacity-100'
                    }`}
                  >
                    {cfg.icon} {cfg.label} ({metaCounts[status]})
                  </button>
                ) : null
              )}
            </div>
          )}

          {/* Search */}
          {metaTemplates.length > 0 && (
            <input
              type="text"
              value={metaSearch}
              onChange={(e) => setMetaSearch(e.target.value)}
              className="input-field w-full md:w-80"
              placeholder="Search by name or category…"
            />
          )}

          {/* Template Grid */}
          {metaLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : filteredMeta.length === 0 ? (
            <div className="card text-center py-12 text-gray-500">
              {metaTemplates.length === 0
                ? 'No templates found in your Meta Business Account. Create templates in Meta Business Manager and click Sync.'
                : 'No templates match the current filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeta.map((template) => {
                const statusCfg = metaStatusConfig[template.status] || metaStatusConfig.PENDING;
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
                          <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">
                            📱 Meta
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusCfg.color}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                    </div>

                    {template.bodyText && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">
                          {template.bodyText}
                        </p>
                      </div>
                    )}

                    {template.status === 'REJECTED' && template.rejectedReason && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-2 mt-2">
                        <p className="text-xs text-red-600">
                          <strong>Reason:</strong> {template.rejectedReason}
                        </p>
                      </div>
                    )}

                    {template.status === 'APPROVED' && (
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        ✓ Available for campaign campaigns
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── LOCAL TEMPLATES TAB ── */}
      {activeTab === 'local' && (
        <div className="space-y-6">
          {localError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {localError}
            </div>
          )}
          {localSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {localSuccess}
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <span>📝</span>
            <span>
              <strong>Local CRM templates</strong> are stored in your CRM database for reference and
              note-taking. They are <em>not</em> sent via WhatsApp — to send via WhatsApp, create and
              approve templates in Meta Business Manager.
            </span>
          </div>

          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Local CRM Templates
              <span className="ml-2 text-sm text-gray-400 font-normal">({localTemplates.length})</span>
            </h2>
            <button
              id="add-local-template-btn"
              onClick={() => { resetLocalForm(); setShowLocalForm(true); }}
              className="btn-secondary text-sm"
            >
              + Add Local Template
            </button>
          </div>

          {/* Local Template Form */}
          {showLocalForm && (
            <div className="card">
              <h3 className="font-semibold mb-4">{editingLocalId ? 'Edit Template' : 'New Local Template'}</h3>
              <form onSubmit={handleLocalSubmit} className="space-y-4">
                <input
                  id="local-template-title"
                  placeholder="Template Title"
                  value={localForm.title}
                  onChange={(e) => setLocalForm({ ...localForm, title: e.target.value })}
                  className="input-field"
                  required
                />
                <textarea
                  id="local-template-message"
                  placeholder="Message content (use {{name}}, {{phone}} for variables)"
                  value={localForm.message}
                  onChange={(e) => setLocalForm({ ...localForm, message: e.target.value })}
                  className="input-field h-32 resize-none"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">
                    {editingLocalId ? 'Update' : 'Save'}
                  </button>
                  <button type="button" onClick={resetLocalForm} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Local Templates Grid */}
          {localLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
            </div>
          ) : localTemplates.length === 0 ? (
            <div className="card text-center py-12 text-gray-500">
              No local templates yet. Create one above for reference/notes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localTemplates.map((template) => (
                <LocalTemplateCard
                  key={template._id}
                  template={template}
                  onEdit={handleLocalEdit}
                  onDelete={handleLocalDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Templates;
