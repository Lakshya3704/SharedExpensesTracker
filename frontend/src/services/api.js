import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Group APIs
export const groupAPI = {
  create: (data) => api.post('/groups', data),
  getAll: () => api.get('/groups'),
  getOne: (id) => api.get(`/groups/${id}`),
  update: (id, data) => api.put(`/groups/${id}`, data),
  addMember: (id, data) => api.post(`/groups/${id}/members`, data),
  updateMember: (id, userId, data) => api.put(`/groups/${id}/members/${userId}`, data),
  getAllUsers: () => api.get('/groups/users/all'),
};

// Expense APIs
export const expenseAPI = {
  create: (groupId, data) => api.post(`/groups/${groupId}/expenses`, data),
  getByGroup: (groupId, page = 1) => api.get(`/groups/${groupId}/expenses?page=${page}`),
  getOne: (id) => api.get(`/expenses/${id}`),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Settlement APIs
export const settlementAPI = {
  create: (groupId, data) => api.post(`/groups/${groupId}/settlements`, data),
  getByGroup: (groupId) => api.get(`/groups/${groupId}/settlements`),
  delete: (id) => api.delete(`/settlements/${id}`),
};

// Balance APIs
export const balanceAPI = {
  getGroupBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
  getSimplified: (groupId) => api.get(`/groups/${groupId}/balances/simplified`),
  getBreakdown: (groupId, userId) => api.get(`/groups/${groupId}/balances/${userId}/breakdown`),
};

// Import APIs
export const importAPI = {
  upload: (groupId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/groups/${groupId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getImport: (id) => api.get(`/imports/${id}`),
  resolveAnomaly: (importId, anomalyId, data) =>
    api.put(`/imports/${importId}/anomalies/${anomalyId}`, data),
  finalize: (id, resolutions) => api.post(`/imports/${id}/finalize`, { resolutions }),
  getReport: (id) => api.get(`/imports/${id}/report`),
};

// Dashboard APIs
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export default api;
