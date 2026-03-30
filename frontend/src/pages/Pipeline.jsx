import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
    GripVertical, Plus, Edit2, Trash2, Phone, MapPin, Calendar,
    ChevronDown, ArrowUpDown, User, Clock, Briefcase, Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import AddLeadModal from '../components/AddLeadModal';

const API_URL = process.env.REACT_APP_API_URL;

// Track 1: Lead Workflow
const TRACK_1_STAGES = [
    'New Contact', 'Interested', 'Send Portfolio', 'Time Given',
    'Meeting Scheduled', 'Meeting Done', 'Project Follow-up', 'Onboarded'
];

// Track 2: Follow-up Track
const TRACK_2_STAGES = [
    'Unknown', 'Call Again 1', 'Call Again 2', 'Call Again 3',
    'Not Answering', 'Not Interested'
];

const ALL_STAGES = [...TRACK_1_STAGES, ...TRACK_2_STAGES];

const SORT_OPTIONS = [
    { value: 'nextFollowupDate_asc', label: 'Follow-up (Earliest)' },
    { value: 'nextFollowupDate_desc', label: 'Follow-up (Latest)' },
    { value: 'companyName_asc', label: 'Company A-Z' },
    { value: 'companyName_desc', label: 'Company Z-A' },
    { value: 'city_asc', label: 'City Grouped' },
    { value: 'assignedTo_asc', label: 'Assigned To Grouped' },
    { value: 'priorityRank_asc', label: 'Priority (Highest)' },
    { value: 'daysSinceContact_desc', label: 'Most Overdue' },
    { value: 'mostCommonResponseRank_asc', label: 'Response Grouped' },
    { value: 'dateAdded_desc', label: 'Date Added (Newest)' },
    { value: 'dateAdded_asc', label: 'Date Added (Oldest)' },
];

const getStageColor = (stage) => {
    const colors = {
        'New Contact': 'bg-gray-100 border-gray-300',
        'Interested': 'bg-blue-50 border-blue-300',
        'Send Portfolio': 'bg-teal-50 border-teal-300',
        'Time Given': 'bg-yellow-50 border-yellow-300',
        'Meeting Scheduled': 'bg-purple-50 border-purple-300',
        'Meeting Done': 'bg-green-50 border-green-300',
        'Project Follow-up': 'bg-indigo-50 border-indigo-300',
        'Onboarded': 'bg-emerald-50 border-emerald-400',
        'Unknown': 'bg-gray-50 border-gray-200',
        'Call Again 1': 'bg-orange-50 border-orange-300',
        'Call Again 2': 'bg-orange-100 border-orange-400',
        'Call Again 3': 'bg-red-50 border-red-300',
        'Not Answering': 'bg-gray-100 border-gray-400',
        'Not Interested': 'bg-red-100 border-red-400',
    };
    return colors[stage] || 'bg-gray-50 border-gray-200';
};

const getHeaderColor = (stage) => {
    const colors = {
        'New Contact': 'bg-gray-200',
        'Interested': 'bg-blue-200',
        'Send Portfolio': 'bg-teal-200',
        'Time Given': 'bg-yellow-200',
        'Meeting Scheduled': 'bg-purple-200',
        'Meeting Done': 'bg-green-200',
        'Project Follow-up': 'bg-indigo-200',
        'Onboarded': 'bg-emerald-300',
        'Unknown': 'bg-gray-200',
        'Call Again 1': 'bg-orange-200',
        'Call Again 2': 'bg-orange-300',
        'Call Again 3': 'bg-red-200',
        'Not Answering': 'bg-gray-300',
        'Not Interested': 'bg-red-300',
    };
    return colors[stage] || 'bg-gray-200';
};

// Sort function
const sortLeads = (leads, sortKey, teamMembers) => {
    const [field, direction] = sortKey.split('_');
    const dir = direction === 'asc' ? 1 : -1;
    
    return [...leads].sort((a, b) => {
        let valA, valB;
        
        switch (field) {
            case 'nextFollowupDate':
                valA = a.nextFollowupDate ? new Date(a.nextFollowupDate).getTime() : Infinity;
                valB = b.nextFollowupDate ? new Date(b.nextFollowupDate).getTime() : Infinity;
                break;
            case 'companyName':
                valA = (a.companyName || '').toLowerCase();
                valB = (b.companyName || '').toLowerCase();
                break;
            case 'city':
                valA = (a.city || 'zzz').toLowerCase();
                valB = (b.city || 'zzz').toLowerCase();
                break;
            case 'assignedTo':
                const memberA = teamMembers.find(m => m.id === a.assignedTo);
                const memberB = teamMembers.find(m => m.id === b.assignedTo);
                valA = memberA?.name?.toLowerCase() || 'zzz';
                valB = memberB?.name?.toLowerCase() || 'zzz';
                break;
            case 'priorityRank':
                valA = a.priorityRank || 99;
                valB = b.priorityRank || 99;
                break;
            case 'daysSinceContact':
                const now = Date.now();
                valA = a.lastContactDate ? (now - new Date(a.lastContactDate).getTime()) : Infinity;
                valB = b.lastContactDate ? (now - new Date(b.lastContactDate).getTime()) : Infinity;
                break;
            case 'mostCommonResponseRank':
                valA = a.mostCommonResponseRank || 99;
                valB = b.mostCommonResponseRank || 99;
                break;
            case 'dateAdded':
                valA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
                valB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
                break;
            default:
                valA = a[field] || '';
                valB = b[field] || '';
        }
        
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });
};

// Lead Card Component
const LeadCard = ({ lead, teamMembers, onDragStart, onEdit, onDelete, isDragging }) => {
    const assignedMember = teamMembers.find(m => m.id === lead.assignedTo);
    const daysSinceContact = lead.lastContactDate 
        ? Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
    const lastResponse = lead.responseHistory?.length > 0 
        ? lead.responseHistory[lead.responseHistory.length - 1]
        : null;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead)}
            className={`bg-white rounded-[10px] border border-gray-200 p-3 mb-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all ${isDragging ? 'opacity-50' : ''}`}
            data-testid={`pipeline-card-${lead.id}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <Link 
                    to={`/leads/${lead.id}`}
                    className="font-medium text-[13px] text-gray-900 hover:text-[#E8536A] hover:underline line-clamp-1 flex-1"
                >
                    {lead.companyName}
                </Link>
                <GripVertical size={14} className="text-gray-300 flex-shrink-0 ml-1" />
            </div>

            {/* Contact Info */}
            <div className="space-y-1 mb-2">
                {lead.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <Phone size={10} className="text-gray-400" />
                        <span>{lead.phone}</span>
                    </div>
                )}
                {lead.city && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <MapPin size={10} className="text-gray-400" />
                        <span>{lead.city}</span>
                    </div>
                )}
            </div>

            {/* Assigned & Follow-up */}
            <div className="flex items-center justify-between mb-2">
                {assignedMember ? (
                    <span 
                        className="text-[9px] px-1.5 py-0.5 rounded text-white font-medium"
                        style={{ backgroundColor: assignedMember.color }}
                    >
                        {assignedMember.name.split(' ')[0]}
                    </span>
                ) : (
                    <span className="text-[9px] text-gray-400">Unassigned</span>
                )}
                {lead.nextFollowupDate && (
                    <span className="text-[9px] text-gray-500 flex items-center gap-1">
                        <Calendar size={9} />
                        {new Date(lead.nextFollowupDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                )}
            </div>

            {/* Last Response */}
            {lastResponse && (
                <div className="text-[10px] text-gray-500 bg-gray-50 rounded px-2 py-1 mb-2 line-clamp-1">
                    {lastResponse.response}: {lastResponse.notes || 'No notes'}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {lead.portfolioSent && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-teal-50 text-teal-700 border-teal-200">
                            Portfolio
                        </Badge>
                    )}
                    {daysSinceContact !== null && (
                        <span className={`text-[9px] ${daysSinceContact > 7 ? 'text-red-500' : 'text-gray-400'}`}>
                            {daysSinceContact}d ago
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                        className="p-1 text-gray-400 hover:text-[#E8536A] hover:bg-[#FFF5F5] rounded transition-colors"
                    >
                        <Edit2 size={10} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Pipeline Column Component
const PipelineColumn = ({ 
    stage, 
    leads, 
    teamMembers, 
    sortKey, 
    onSortChange, 
    onDragStart, 
    onDragOver, 
    onDrop, 
    onAddLead, 
    onEditLead, 
    onDeleteLead,
    dragOverStage 
}) => {
    const sortedLeads = sortLeads(leads, sortKey, teamMembers);
    const isDropTarget = dragOverStage === stage;

    return (
        <div 
            className={`flex-shrink-0 w-[260px] flex flex-col rounded-[12px] border-2 ${getStageColor(stage)} ${isDropTarget ? 'ring-2 ring-[#E8536A] ring-opacity-50' : ''}`}
            onDragOver={(e) => onDragOver(e, stage)}
            onDrop={(e) => onDrop(e, stage)}
            data-testid={`pipeline-column-${stage.toLowerCase().replace(/\s+/g, '-')}`}
        >
            {/* Column Header */}
            <div className={`p-3 rounded-t-[10px] ${getHeaderColor(stage)}`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[12px] text-gray-800">{stage}</h3>
                    <Badge className="text-[10px] bg-white/80 text-gray-700 px-1.5 py-0">
                        {leads.length}
                    </Badge>
                </div>
                
                {/* Sort Dropdown - Always Visible */}
                <Select value={sortKey} onValueChange={onSortChange}>
                    <SelectTrigger className="h-7 text-[10px] bg-white/90 border-0 rounded-[6px]">
                        <ArrowUpDown size={10} className="mr-1" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {SORT_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-[11px]">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1 p-2" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {sortedLeads.map(lead => (
                    <LeadCard
                        key={lead.id}
                        lead={lead}
                        teamMembers={teamMembers}
                        onDragStart={onDragStart}
                        onEdit={onEditLead}
                        onDelete={onDeleteLead}
                    />
                ))}
                {sortedLeads.length === 0 && (
                    <div className="text-center py-6 text-[11px] text-gray-400">
                        No leads
                    </div>
                )}
            </ScrollArea>

            {/* Add Lead Button */}
            <div className="p-2 border-t border-gray-100">
                <Button
                    onClick={() => onAddLead(stage)}
                    variant="ghost"
                    className="w-full h-8 text-[11px] text-gray-500 hover:text-[#E8536A] hover:bg-[#FFF5F5]"
                    data-testid={`add-lead-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                >
                    <Plus size={12} className="mr-1" />
                    Add Lead
                </Button>
            </div>
        </div>
    );
};

export default function Pipeline() {
    const { isAdmin } = useOutletContext();
    const navigate = useNavigate();
    
    const [leads, setLeads] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
    const [addLeadDefaultStage, setAddLeadDefaultStage] = useState('New Contact');
    
    // Sort preferences per column (stored in localStorage)
    const [columnSorts, setColumnSorts] = useState(() => {
        const saved = localStorage.getItem('pipeline_column_sorts');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return {};
            }
        }
        return {};
    });
    
    const [globalSort, setGlobalSort] = useState('nextFollowupDate_asc');
    const [draggedLead, setDraggedLead] = useState(null);
    const [dragOverStage, setDragOverStage] = useState(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leadsRes, teamRes] = await Promise.all([
                    api.get(`/api/leads?limit=500`),
                    api.get(`/api/team`)
                ]);
                setLeads(leadsRes.data.leads || []);
                setTeamMembers(teamRes.data);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Save column sorts to localStorage
    useEffect(() => {
        localStorage.setItem('pipeline_column_sorts', JSON.stringify(columnSorts));
    }, [columnSorts]);

    const getColumnSort = (stage) => {
        return columnSorts[stage] || globalSort;
    };

    const handleColumnSortChange = (stage, sortKey) => {
        setColumnSorts(prev => ({ ...prev, [stage]: sortKey }));
    };

    const handleGlobalSort = (sortKey) => {
        setGlobalSort(sortKey);
        // Apply to all columns
        const newSorts = {};
        ALL_STAGES.forEach(stage => {
            newSorts[stage] = sortKey;
        });
        setColumnSorts(newSorts);
    };

    // Drag and drop handlers
    const handleDragStart = (e, lead) => {
        setDraggedLead(lead);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, stage) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStage(stage);
    };

    const handleDrop = async (e, newStage) => {
        e.preventDefault();
        setDragOverStage(null);
        
        if (!draggedLead || draggedLead.pipelineStage === newStage) {
            setDraggedLead(null);
            return;
        }

        const leadId = draggedLead.id;
        const oldStage = draggedLead.pipelineStage;

        // Optimistic update
        setLeads(prev => prev.map(l => 
            l.id === leadId ? { ...l, pipelineStage: newStage } : l
        ));
        setDraggedLead(null);

        // Update in backend
        try {
            await api.patch(`/api/leads/${leadId}`, {
                pipelineStage: newStage
            });
        } catch (err) {
            console.error('Error updating pipeline stage:', err);
            // Revert on error
            setLeads(prev => prev.map(l => 
                l.id === leadId ? { ...l, pipelineStage: oldStage } : l
            ));
        }
    };

    const handleDragEnd = () => {
        setDraggedLead(null);
        setDragOverStage(null);
    };

    // Add lead with default stage
    const handleAddLead = (stage) => {
        setAddLeadDefaultStage(stage);
        setAddLeadModalOpen(true);
    };

    const handleEditLead = (lead) => {
        navigate(`/leads/${lead.id}`);
    };

    const handleDeleteLead = async (lead) => {
        if (!isAdmin) return;
        if (!window.confirm(`Delete "${lead.companyName}"?`)) return;
        
        try {
            await api.delete(`/api/leads/${lead.id}`);
            setLeads(prev => prev.filter(l => l.id !== lead.id));
        } catch (err) {
            console.error('Error deleting lead:', err);
        }
    };

    const handleLeadAdded = async () => {
        setAddLeadModalOpen(false);
        // Refresh leads
        try {
            const res = await api.get(`/api/leads?limit=500`);
            setLeads(res.data.leads || []);
        } catch (err) {
            console.error('Error refreshing leads:', err);
        }
    };

    // Group leads by pipeline stage
    const leadsByStage = {};
    ALL_STAGES.forEach(stage => {
        leadsByStage[stage] = leads.filter(l => l.pipelineStage === stage);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[#E8536A] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in" data-testid="pipeline-page" onDragEnd={handleDragEnd}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-xl font-semibold text-gray-900">Pipeline</h1>
                    <p className="text-[11px] text-gray-500">{leads.length} total leads</p>
                </div>
                
                {/* Global Sort */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Sort All:</span>
                    <Select value={globalSort} onValueChange={handleGlobalSort}>
                        <SelectTrigger className="w-[160px] h-8 text-[11px] rounded-[8px]" data-testid="global-sort">
                            <ArrowUpDown size={12} className="mr-1.5" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-[11px]">
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Track 1: Lead Workflow */}
            <div>
                <h2 className="font-heading text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Briefcase size={14} className="text-[#E8536A]" />
                    Lead Workflow
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-4">
                    {TRACK_1_STAGES.map(stage => (
                        <PipelineColumn
                            key={stage}
                            stage={stage}
                            leads={leadsByStage[stage]}
                            teamMembers={teamMembers}
                            sortKey={getColumnSort(stage)}
                            onSortChange={(sort) => handleColumnSortChange(stage, sort)}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onAddLead={handleAddLead}
                            onEditLead={handleEditLead}
                            onDeleteLead={handleDeleteLead}
                            dragOverStage={dragOverStage}
                        />
                    ))}
                </div>
            </div>

            {/* Track 2: Follow-up Track */}
            <div>
                <h2 className="font-heading text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock size={14} className="text-orange-500" />
                    Follow-up Track
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-4">
                    {TRACK_2_STAGES.map(stage => (
                        <PipelineColumn
                            key={stage}
                            stage={stage}
                            leads={leadsByStage[stage]}
                            teamMembers={teamMembers}
                            sortKey={getColumnSort(stage)}
                            onSortChange={(sort) => handleColumnSortChange(stage, sort)}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onAddLead={handleAddLead}
                            onEditLead={handleEditLead}
                            onDeleteLead={handleDeleteLead}
                            dragOverStage={dragOverStage}
                        />
                    ))}
                </div>
            </div>

            {/* Add Lead Modal */}
            <AddLeadModalWithStage
                open={addLeadModalOpen}
                onClose={() => setAddLeadModalOpen(false)}
                onSuccess={handleLeadAdded}
                teamMembers={teamMembers}
                defaultStage={addLeadDefaultStage}
            />
        </div>
    );
}

// Modified Add Lead Modal with default stage
function AddLeadModalWithStage({ open, onClose, onSuccess, teamMembers, defaultStage }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        companyName: '',
        phone: '',
        city: '',
        category: 'Needs Review',
        priority: 'Medium',
        pipelineStage: defaultStage,
        assignedTo: ''
    });

    useEffect(() => {
        setFormData(prev => ({ ...prev, pipelineStage: defaultStage }));
    }, [defaultStage]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.companyName.trim()) {
            setError('Company name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post(`/api/leads`, formData);
            onSuccess();
            setFormData({
                companyName: '',
                phone: '',
                city: '',
                category: 'Needs Review',
                priority: 'Medium',
                pipelineStage: defaultStage,
                assignedTo: ''
            });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create lead');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-[16px] shadow-xl w-full max-w-md p-6 m-4">
                <h2 className="font-heading text-lg font-semibold mb-4">
                    Add Lead to {defaultStage}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[11px] text-gray-500 font-medium">Company Name *</label>
                        <input
                            value={formData.companyName}
                            onChange={(e) => handleChange('companyName', e.target.value)}
                            className="w-full h-9 px-3 text-[12px] border border-gray-200 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#E8536A]/20 focus:border-[#E8536A]"
                            placeholder="Enter company name"
                            data-testid="quick-add-company"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] text-gray-500 font-medium">Phone</label>
                            <input
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full h-9 px-3 text-[12px] border border-gray-200 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#E8536A]/20 focus:border-[#E8536A]"
                                placeholder="Phone number"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-gray-500 font-medium">City</label>
                            <input
                                value={formData.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                className="w-full h-9 px-3 text-[12px] border border-gray-200 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#E8536A]/20 focus:border-[#E8536A]"
                                placeholder="City"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] text-gray-500 font-medium">Assigned To</label>
                        <Select value={formData.assignedTo || undefined} onValueChange={(v) => handleChange('assignedTo', v)}>
                            <SelectTrigger className="h-9 text-[12px] rounded-[8px]">
                                <SelectValue placeholder="Select team member" />
                            </SelectTrigger>
                            <SelectContent>
                                {teamMembers?.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <div className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-[8px]">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#E8536A] hover:bg-[#D43D54] text-white rounded-[8px]"
                            data-testid="quick-add-submit"
                        >
                            {loading ? 'Adding...' : 'Add Lead'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
