import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const API_BASE = '/api';

/**
 * Main axios instance - single source of truth for all API calls
 * Configured with base URL, credentials, and interceptors
 */
// Без фиксированного Content-Type: axios сам ставит application/json для
// обычных объектов и multipart/form-data с нужным boundary — для FormData
// (загрузка фото). Жёстко заданный здесь application/json перебивал этот
// boundary на всех запросах через этот инстанс, из-за чего multer на
// бэкенде не распознавал файлы и ронял запрос с «property files should not
// exist» (поле "files" уходило как обычное текстовое поле, а не файл).
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
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

// На проде бэкенд раз в минуту ненадолго падает и поднимается заново
// (ограничение shared-хостинга вне нашего контроля — см. CLAUDE.md). В это
// окно nginx отдаёт 502, ещё не достучавшись до Node, то есть запрос
// гарантированно не выполнился — его безопасно повторить для любого метода.
// Сетевая ошибка (нет ответа вообще) трактуется так же.
const RETRY_DELAY_MS = 600;
const MAX_RETRIES = 2;

function isRetryableError(error: AxiosError): boolean {
  if (!error.response) return true; // сеть недоступна / соединение сброшено
  return error.response.status === 502;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    if (originalRequest && isRetryableError(error)) {
      const retryCount = originalRequest._retryCount ?? 0;
      if (retryCount < MAX_RETRIES) {
        originalRequest._retryCount = retryCount + 1;
        await delay(RETRY_DELAY_MS * originalRequest._retryCount);
        return api(originalRequest);
      }
    }

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