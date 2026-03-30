import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * Pre-configured axios instance that automatically:
 * 1. Prepends the API base URL
 * 2. Attaches the Authorization header from localStorage
 * 3. Sends cookies (withCredentials) as a fallback
 */
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Attach Authorization header from localStorage on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// On 401 responses, try to refresh the token once
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }
                const res = await axios.post(`${API_URL}/api/auth/refresh`, {
                    refresh_token: refreshToken
                }, { withCredentials: true });

                const newToken = res.data?.access_token;
                if (newToken) {
                    localStorage.setItem('access_token', newToken);
                    processQueue(null, newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
export { API_URL };
