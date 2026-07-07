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
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
};

export const contactsAPI = {
  getAll: (params) => API.get('/contacts', { params }),
  create: (data) => API.post('/contacts', data),
  update: (id, data) => API.put(`/contacts/${id}`, data),
  delete: (id) => API.delete(`/contacts/${id}`),
  syncAll: () => API.post('/contacts/sync-all'),
  retrySync: (id) => API.post(`/contacts/${id}/sync-retry`),
  syncRetry: (id) => API.post(`/contacts/${id}/sync-retry`),
  bulkDelete: (data) => API.post('/contacts/bulk-delete', data),
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

export default API;
