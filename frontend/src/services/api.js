import axios from 'axios';

// In development, Vite proxies /api/* to localhost:5000 — so baseURL is just '/api'
// In production, VITE_API_URL must include the /api prefix (e.g. https://backend.onrender.com/api)
// DO NOT append '/api' here — the env var already contains it.
const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
  : '/api';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    '[API] VITE_API_URL is not set! All API calls will fail. ' +
    'Set this in your Vercel environment variables to your Render backend URL (including /api).'
  );
}

// Debug logging — helps diagnose URL issues in all environments
console.log('[API] baseURL:', BASE_URL);

const API = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout
});

// Attach JWT on every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — force re-login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
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
  importCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const templatesAPI = {
  getAll: (params) => API.get('/templates', { params }),  // ?source=local|all
  create: (data) => API.post('/templates', data),
  update: (id, data) => API.put(`/templates/${id}`, data),
  delete: (id) => API.delete(`/templates/${id}`),
};

export const campaignsAPI = {
  getAll: (params) => API.get('/campaigns', { params }),
  create: (data) => API.post('/campaigns', data),
  getById: (id) => API.get(`/campaigns/${id}`),
  preview: (data) => API.post('/campaigns/preview', data),
  send: (id) => API.post(`/campaigns/${id}/send`),
};

export const logsAPI = {
  getAll: (params) => API.get('/logs', { params }),        // ?page=1&limit=50&campaignId=
  getDashboard: () => API.get('/logs/dashboard'),
};

export const metaAPI = {
  getTemplates: () => API.get('/meta/templates'),           // APPROVED only — Campaign dropdown
  getAllTemplates: () => API.get('/meta/templates/all'),    // All statuses — Templates page
};

export default API;
