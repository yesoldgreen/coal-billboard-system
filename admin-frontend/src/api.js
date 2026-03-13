import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const login = (username, password) => {
  return api.post('/admin/login', { username, password });
};

// 告示牌API
export const getBillboards = () => {
  return api.get('/billboards');
};

export const createBillboard = (name) => {
  return api.post('/billboards', { name });
};

export const updateBillboard = (id, name) => {
  return api.put(`/billboards/${id}`, { name });
};

export const deleteBillboard = (id) => {
  return api.delete(`/billboards/${id}`);
};

export const getBillboardData = (id) => {
  return api.get(`/billboards/${id}/data`);
};

// 数据更新API
export const updateQueueData = (id, data) => {
  return api.put(`/billboards/${id}/queue`, { data });
};

export const updateQualityData = (id, data) => {
  return api.put(`/billboards/${id}/quality`, { data });
};

export const updateLogisticsData = (id, data) => {
  return api.put(`/billboards/${id}/logistics`, { data });
};

export const updateAds = (id, moduleType, data) => {
  return api.put(`/billboards/${id}/ads`, { moduleType, data });
};

export default api;
