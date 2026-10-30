import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const API_BASE = '/api';

/**
 * Main axios instance - single source of truth for all API calls
 * Configured with base URL, credentials, and interceptors
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token from store if available
    // This will be set by the auth module
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 - token expired, try refresh.
    // Важно: для самих auth-запросов refresh не вызываем и НЕ перезагружаем
    // страницу — иначе на /admin/login возникает бесконечный цикл
    // (me -> 401 -> refresh -> 401 -> redirect -> me ...).
    const url = originalRequest?.url ?? '';
    const isAuthRequest = url.includes('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh', {}, { withCredentials: true });
        return api(originalRequest);
      } catch (refreshError) {
        // Редирект делает роутер (AdminRoutes), а не интерсептор.
        return Promise.reject(refreshError);
      }
    }

    // NestJS/class-validator отдаёт message строкой ИЛИ массивом строк.
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const raw = data?.message;
    const text = Array.isArray(raw) ? raw.join('. ') : raw;
    return Promise.reject(new Error(text || error.message || 'Request failed'));
  }
);

export default api;