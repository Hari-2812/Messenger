import { useEffect, useState } from 'react';
import { watiAPI } from '../services/api';

const StatusPill = ({ active }) => (
  <span className={`text-xs font-medium px-2 py-1 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
    {active ? 'Configured' : 'Missing'}
  </span>
);

const WatiSettings = () => {
  const [settings, setSettings] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await watiAPI.getSettings();
      setSettings(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load WATI settings');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const syncTemplates = async () => {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const { data } = await watiAPI.syncTemplates({ all: true });
      setMessage(`Synced ${data.total || 0} WATI template(s)`);
    } catch (err) {
      setError(err.response?.data?.message || 'Template sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {message && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{message}</div>}

      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">WATI API Configuration</h2>
            <p className="text-sm text-gray-500 mt-1">Secrets are read only from backend environment variables.</p>
          </div>
          <button onClick={syncTemplates} disabled={syncing} className="btn-primary">
            {syncing ? 'Syncing...' : 'Sync Templates'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">Provider</span>
            <span className="font-mono text-sm">{settings?.provider || '-'}</span>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">API endpoint</span>
            <StatusPill active={settings?.endpointConfigured} />
          </div>
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">Access token</span>
            <StatusPill active={settings?.accessTokenConfigured} />
          </div>
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">Webhook verify token</span>
            <StatusPill active={settings?.webhookVerifyTokenConfigured} />
          </div>
          <div className="border border-gray-200 rounded-lg p-4 md:col-span-2">
            <p className="text-sm text-gray-600 mb-2">Webhook URL</p>
            <code className="block bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs break-all">
              {settings?.webhookUrl || '-'}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatiSettings;
