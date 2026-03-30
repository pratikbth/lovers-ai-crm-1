import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Create an axios instance with auth interceptor
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Add Authorization header from localStorage to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Export the axios instance for use across the app
export { api };

function formatApiErrorDetail(detail) {
    if (detail == null) return "Something went wrong. Please try again.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const checkAuth = useCallback(async () => {
        try {
            const response = await api.get('/api/auth/me');
            setUser(response.data);
            return true;
        } catch (err) {
            // Try to refresh token
            if (err.response?.status === 401) {
                try {
                    const refreshToken = localStorage.getItem('refresh_token');
                    const refreshRes = await api.post('/api/auth/refresh', {
                        refresh_token: refreshToken
                    });
                    // Store the new access token
                    if (refreshRes.data?.access_token) {
                        localStorage.setItem('access_token', refreshRes.data.access_token);
                    }
                    const response = await api.get('/api/auth/me');
                    setUser(response.data);
                    return true;
                } catch (refreshErr) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    setUser(null);
                    return false;
                }
            }
            setUser(null);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
        // Set up periodic token refresh (every 50 minutes)
        const refreshInterval = setInterval(async () => {
            if (user) {
                try {
                    const refreshToken = localStorage.getItem('refresh_token');
                    const res = await api.post('/api/auth/refresh', {
                        refresh_token: refreshToken
                    });
                    if (res.data?.access_token) {
                        localStorage.setItem('access_token', res.data.access_token);
                    }
                } catch (err) {
                    // If refresh fails, check auth state
                    checkAuth();
                }
            }
        }, 50 * 60 * 1000);

        return () => clearInterval(refreshInterval);
    }, [checkAuth, user]);

    const login = async (email, password) => {
        try {
            setError(null);
            const response = await api.post('/api/auth/login', { email, password });
            
            // Store tokens from response body
            if (response.data?.access_token) {
                localStorage.setItem('access_token', response.data.access_token);
            }
            if (response.data?.refresh_token) {
                localStorage.setItem('refresh_token', response.data.refresh_token);
            }
            
            // Remove tokens from user data before storing
            const userData = { ...response.data };
            delete userData.access_token;
            delete userData.refresh_token;
            setUser(userData);
            return { success: true };
        } catch (err) {
            const errorMsg = formatApiErrorDetail(err.response?.data?.detail);
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }
    };

    const logout = async () => {
        try {
            await api.post('/api/auth/logout', {});
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
        }
    };

    const refreshToken = async () => {
        try {
            const storedRefreshToken = localStorage.getItem('refresh_token');
            const res = await api.post('/api/auth/refresh', {
                refresh_token: storedRefreshToken
            });
            if (res.data?.access_token) {
                localStorage.setItem('access_token', res.data.access_token);
            }
            await checkAuth();
            return true;
        } catch (err) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
            return false;
        }
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        refreshToken,
        checkAuth,
        isAdmin: user?.role === 'admin',
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
