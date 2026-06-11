import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
  getAll: () => API.get('/contacts'),
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
  getAll: () => API.get('/templates'),
  create: (data) => API.post('/templates', data),
  update: (id, data) => API.put(`/templates/${id}`, data),
  delete: (id) => API.delete(`/templates/${id}`),
};

export const campaignsAPI = {
  getAll: () => API.get('/campaigns'),
  create: (data) => API.post('/campaigns', data),
  preview: (data) => API.post('/campaigns/preview', data),
  send: (id) => API.post(`/campaigns/${id}/send`),
};

export const logsAPI = {
  getAll: (params) => API.get('/logs', { params }),
  getDashboard: () => API.get('/logs/dashboard'),
};

export const metaAPI = {
  getTemplates: () => API.get('/meta/templates'),
};

export default API;
