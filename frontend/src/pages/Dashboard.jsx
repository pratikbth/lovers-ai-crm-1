import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import api from '../lib/api';
import { 
    Users, Calendar, CalendarDays, CheckCircle, GitBranch,
    TrendingUp, PhoneCall, Clock, MessageCircle, Instagram,
    CalendarCheck, Sparkles
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

const StatCard = ({ icon: Icon, label, value, color, path, className = '' }) => (
    <Link 
        to={path}
        data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`bg-white rounded-[16px] shadow-[0_2px_12px_rgba(232,83,106,0.06)] border border-gray-100 p-4 hover:shadow-[0_8px_24px_rgba(232,83,106,0.12)] transition-all cursor-pointer group ${className}`}
    >
        <div className="flex items-center gap-3">
            <div 
                className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${color}15` }}
            >
                <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-500 font-medium truncate">{label}</p>
                <p className="font-heading text-xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    </Link>
);

const CategoryCard = ({ label, value, color, bgColor, path }) => (
    <Link
        to={path}
        data-testid={`category-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className="flex items-center justify-between px-3 py-2 rounded-[10px] hover:opacity-80 transition-opacity"
        style={{ backgroundColor: bgColor }}
    >
        <span className="text-[12px] font-medium" style={{ color }}>{label}</span>
        <span className="text-[12px] font-bold" style={{ color }}>{value}</span>
    </Link>
);

export default function Dashboard() {
    const { user, isAdmin } = useOutletContext();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get(`/api/stats/dashboard`, {
                    withCredentials: true
                });
                setStats(response.data);
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
                <div className="w-8 h-8 border-2 border-[#E8536A] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="dashboard">
            {/* Header */}
            <div>
                <h1 className="font-heading text-2xl font-semibold text-gray-900">
                    Welcome back, {user?.name?.split(' ')[0] || 'User'}
                </h1>
                <p className="text-[13px] text-gray-500 mt-1">
                    Here's what's happening with your leads today.
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard 
                    icon={Users} 
                    label="Total Leads" 
                    value={stats?.totalLeads || 0}
                    color="#E8536A"
                    path="/leads"
                />
                <StatCard 
                    icon={Calendar} 
                    label="Today" 
                    value={stats?.todayFollowups || 0}
                    color="#3B82F6"
                    path="/today"
                />
                <StatCard 
                    icon={CalendarDays} 
                    label="Tomorrow" 
                    value={stats?.tomorrowFollowups || 0}
                    color="#10B981"
                    path="/tomorrow"
                />
                <StatCard 
                    icon={CheckCircle} 
                    label="Interested" 
                    value={stats?.interestedLeads || 0}
                    color="#8B5CF6"
                    path="/category/interested"
                />
                <StatCard 
                    icon={CalendarCheck} 
                    label="Meetings Done" 
                    value={stats?.meetingsDone || 0}
                    color="#059669"
                    path="/category/meeting-done"
                />
                <StatCard 
                    icon={GitBranch} 
                    label="Team" 
                    value={stats?.teamMembers || 0}
                    color="#F59E0B"
                    path="/team"
                />
            </div>

            {/* Categories Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Categories Card */}
                <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(232,83,106,0.06)] border border-gray-100 p-4">
                    <h2 className="font-heading text-base font-medium text-gray-900 mb-3">Categories</h2>
                    <div className="space-y-2">
                        {stats?.categoryStats?.map((cat) => {
                            const colors = {
                                'Meeting Done': { bg: '#D1FAE5', text: '#065F46' },
                                'Interested': { bg: '#DBEAFE', text: '#1E40AF' },
                                'Call Back': { bg: '#FEF3C7', text: '#92400E' },
                                'Busy': { bg: '#FEE2E2', text: '#991B1B' },
                                'No Response': { bg: '#F3F4F6', text: '#374151' },
                                'Foreign': { bg: '#EDE9FE', text: '#5B21B6' },
                                'Future Projection': { bg: '#CCFBF1', text: '#115E59' },
                                'Needs Review': { bg: '#FFEDD5', text: '#9A3412' },
                                'Not Interested': { bg: '#E5E7EB', text: '#1F2937' }
                            };
                            const colorSet = colors[cat.category] || { bg: '#F3F4F6', text: '#374151' };
                            const pathSlug = cat.category.toLowerCase().replace(/\s+/g, '-');
                            
                            return (
                                <CategoryCard
                                    key={cat.category}
                                    label={cat.category}
                                    value={cat.count}
                                    bgColor={colorSet.bg}
                                    color={colorSet.text}
                                    path={`/category/${pathSlug}`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Pipeline Overview */}
                <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(232,83,106,0.06)] border border-gray-100 p-4">
                    <h2 className="font-heading text-base font-medium text-gray-900 mb-3">Pipeline Stages</h2>
                    <div className="space-y-2">
                        {stats?.pipelineStats?.slice(0, 8).map((stage) => (
                            <div 
                                key={stage.stage}
                                className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <span className="text-[12px] font-medium text-gray-700">{stage.stage}</span>
                                <span className="text-[12px] font-bold text-gray-900">{stage.count}</span>
                            </div>
                        ))}
                    </div>
                    <Link 
                        to="/pipeline"
                        className="flex items-center justify-center gap-2 mt-3 text-[13px] font-medium text-[#E8536A] hover:text-[#D43D54] transition-colors"
                        data-testid="view-pipeline-link"
                    >
                        View Full Pipeline
                        <TrendingUp size={14} />
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link 
                    to="/instagram"
                    data-testid="quick-instagram"
                    className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(232,83,106,0.06)] border border-gray-100 p-4 hover:shadow-[0_8px_24px_rgba(232,83,106,0.12)] transition-all flex items-center gap-3"
                >
                    <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Instagram size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-500">Instagram</p>
                        <p className="font-heading text-lg font-bold text-gray-900">{stats?.categoryStats?.find(c => c.category === 'Foreign')?.count || 0}</p>
                    </div>
                </Link>

                <Link 
                    to="/whatsapp"
                    data-testid="quick-whatsapp"
                    className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(232,83,106,0.06)] border border-gray-100 p-4 hover:shadow-[0_8px_24px_rgba(232,83,106,0.12)] transition-all flex items-center gap-3"
                >
                    <div className="w-10 h-10 rounded-[10px] bg-green-500 flex items-center justify-center">
                        <MessageCircle size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-500">WhatsApp</p>
                        <p className="font-heading text-lg font-bold text-gray-900">{stats?.categoryStats?.find(c => c.category === 'Call Back')?.count || 0}</p>
                    </div>
                </Link>

                <Link 
                    to="/this-week"
                    data-testid="quick-this-week"
                    className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(232,83,106,0.06)] border border-gray-100 p-4 hover:shadow-[0_8px_24px_rgba(232,83,106,0.12)] transition-all flex items-center gap-3"
                >
                    <div className="w-10 h-10 rounded-[10px] bg-blue-500 flex items-center justify-center">
                        <Clock size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-500">This Week</p>
                        <p className="font-heading text-lg font-bold text-gray-900">{stats?.weekFollowups || 0}</p>
                    </div>
                </Link>

                <Link 
                    to="/category/future-projection"
                    data-testid="quick-future"
                    className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(232,83,106,0.06)] border border-gray-100 p-4 hover:shadow-[0_8px_24px_rgba(232,83,106,0.12)] transition-all flex items-center gap-3"
                >
                    <div className="w-10 h-10 rounded-[10px] bg-teal-500 flex items-center justify-center">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-500">Future</p>
                        <p className="font-heading text-lg font-bold text-gray-900">{stats?.categoryStats?.find(c => c.category === 'Future Projection')?.count || 0}</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
