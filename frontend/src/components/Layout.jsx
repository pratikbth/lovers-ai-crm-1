import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const API_URL = process.env.REACT_APP_API_URL;

export default function Layout() {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [counts, setCounts] = useState({});
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const response = await api.get(`/api/leads/count`, {
                    withCredentials: true
                });
                setCounts(response.data);
            } catch (err) {
                console.error('Error fetching counts:', err);
            }
        };

        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen bg-[#FFF5F5]">
            {/* Desktop Sidebar */}
            <Sidebar 
                counts={counts} 
                currentPath={location.pathname}
                user={user}
                isAdmin={isAdmin}
                onLogout={handleLogout}
                className="hidden md:flex"
            />

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div 
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <Sidebar 
                        counts={counts} 
                        currentPath={location.pathname}
                        user={user}
                        isAdmin={isAdmin}
                        onLogout={handleLogout}
                        onClose={() => setSidebarOpen(false)}
                        className="absolute left-0 top-0 h-full"
                        isMobile
                    />
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 min-h-screen pb-20 md:pb-0">
                <div className="p-4 md:p-6 lg:p-8">
                    <Outlet context={{ counts, user, isAdmin }} />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav 
                counts={counts} 
                currentPath={location.pathname}
                onMenuClick={() => setSidebarOpen(true)}
            />
        </div>
    );
}
