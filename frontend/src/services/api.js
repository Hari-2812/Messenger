import axios from 'axios';

// In development, Vite proxies /api/* to localhost:5000 — so baseURL is just '/api'
// In production, VITE_API_URL must include the /api prefix (e.g. https://backend.onrender.com/api)
const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
  : '/api';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    '[API] VITE_API_URL is not set! All API calls will fail. ' +
    'Set this in your Vercel environment variables to your Render backend URL (including /api).'
  );
}

const API = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach JWT on every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  logout: () => API.post('/auth/logout'),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

export const contactsAPI = {
  getAll: (params) => API.get('/contacts', { params }),
  create: (data) => API.post('/contacts', data),
  update: (id, data) => API.put(`/contacts/${id}`, data),
  delete: (id) => API.delete(`/contacts/${id}`),
  syncAll: () => API.post('/contacts/sync-all'),
  retrySync: (id) => API.post(`/contacts/${id}/sync-retry`),
  syncRetry: (id) => API.post(`/contacts/${id}/sync-retry`),
  bulkDelete: (data) => API.delete('/contacts/bulk-delete', { data }),
  bulkImport: (data) => API.post('/contacts/bulk-import', data),
  importCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const templatesAPI = {
  getAll: (params) => API.get('/templates', { params }),
  create: (data) => API.post('/templates', data),
  update: (id, data) => API.put(`/templates/${id}`, data),
  delete: (id) => API.delete(`/templates/${id}`),
  syncWati: (params) => API.get('/templates/sync/wati', { params }),
};

export const campaignsAPI = {
  getAll: (params) => API.get('/campaigns', { params }),
  create: (data) => API.post('/campaigns', data),
  getById: (id) => API.get(`/campaigns/${id}`),
  preview: (data) => API.post('/campaigns/preview', data),
  send: (id) => API.post(`/campaigns/${id}/send`),
};

export const logsAPI = {
  getAll: (params) => API.get('/logs', { params }),
  getDashboard: () => API.get('/logs/dashboard'),
};

export const watiAPI = {
  getSettings: () => API.get('/wati/settings'),
  syncTemplates: (params) => API.get('/templates/sync/wati', { params }),
};

export const inboxAPI = {
  getAll: (params) => API.get('/inbox', { params }),
  getById: (id) => API.get(`/inbox/${id}`),
  reply: (id, data) => API.post(`/inbox/${id}/reply`, data),
};

export const analyticsAPI = {
  get: () => API.get('/analytics'),
};

export const automationAPI = {
  getAll: () => API.get('/automation'),
  create: (data) => API.post('/automation', data),
  update: (id, data) => API.put(`/automation/${id}`, data),
};

export const emailCampaignsAPI = {
  getAll: (params) => API.get('/email-campaigns', { params }),
  getDashboardStats: () => API.get('/email-campaigns/dashboard-stats'),
  create: (data) => {
    // If it's FormData (for attachments), send directly, otherwise JSON
    if (data instanceof FormData) {
      return API.post('/email-campaigns', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return API.post('/email-campaigns', data);
  },
  getById: (id) => API.get(`/email-campaigns/${id}`),
  delete: (id) => API.delete(`/email-campaigns/${id}`),
  pause: (id) => API.put(`/email-campaigns/${id}/pause`),
  resume: (id) => API.put(`/email-campaigns/${id}/resume`),
};

export const emailTemplatesAPI = {
  getAll: (params) => API.get('/email-templates', { params }),
  getById: (id) => API.get(`/email-templates/${id}`),
  create: (data) => API.post('/email-templates', data),
  update: (id, data) => API.put(`/email-templates/${id}`, data),
  delete: (id) => API.delete(`/email-templates/${id}`),
};

export const settingsAPI = {
  get: () => API.get('/settings'),
  addSender: (data) => API.post('/settings/senders', data),
  removeSender: (email) => API.delete(`/settings/senders/${email}`),
};

export const googleSheetsAPI = {
  getAuthUrl: () => API.get('/google-sheets/auth-url'),
  checkAuth: () => API.get('/google-sheets/check-auth'),
  getSpreadsheets: () => API.get('/google-sheets/spreadsheets'),
  getSheets: (spreadsheetId) => API.get(`/google-sheets/spreadsheets/${spreadsheetId}/sheets`),
  getHeaders: (spreadsheetId, sheetName) => API.get(`/google-sheets/spreadsheets/${spreadsheetId}/sheets/${sheetName}/headers`),
  importContacts: (data) => API.post('/google-sheets/import', data),
  syncCampaignSheet: () => API.post('/google-sheets/sync-campaign-sheet'),
};

export default API;
