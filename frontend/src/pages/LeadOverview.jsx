import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import api from '../lib/api';
import { 
    ArrowLeft, Phone, Mail, MapPin, Instagram, MessageCircle, 
    Calendar, Clock, Edit2, Trash2, Check, X, ExternalLink,
    Send, User, AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import CallLogPanel from '../components/CallLogPanel';

const API_URL = process.env.REACT_APP_API_URL;

const CATEGORIES = [
    'Meeting Done', 'Interested', 'Call Back', 'Busy', 'No Response',
    'Foreign', 'Future Projection', 'Needs Review', 'Not Interested'
];

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Review', 'Archive'];

const PIPELINE_STAGES = [
    "New Contact", "Interested", "Send Portfolio", "Time Given",
    "Meeting Scheduled", "Meeting Done", "Project Follow-up", "Onboarded",
    "Unknown", "Call Again 1", "Call Again 2", "Call Again 3",
    "Not Answering", "Not Interested"
];

const getCategoryStyle = (category) => {
    const styles = {
        'Meeting Done': 'bg-green-100 text-green-800 border-green-300',
        'Interested': 'bg-blue-100 text-blue-800 border-blue-300',
        'Call Back': 'bg-orange-100 text-orange-800 border-orange-300',
        'Busy': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'No Response': 'bg-gray-100 text-gray-700 border-gray-300',
        'Foreign': 'bg-purple-100 text-purple-800 border-purple-300',
        'Future Projection': 'bg-teal-100 text-teal-800 border-teal-300',
        'Needs Review': 'bg-gray-50 text-gray-600 border-gray-200',
        'Not Interested': 'bg-red-100 text-red-800 border-red-300'
    };
    return styles[category] || 'bg-gray-100 text-gray-600';
};

const getPriorityDot = (priority) => {
    const colors = {
        'Highest': 'bg-red-500',
        'High': 'bg-orange-500',
        'Medium': 'bg-yellow-500',
        'Low': 'bg-green-500',
        'Review': 'bg-blue-500',
        'Archive': 'bg-gray-400'
    };
    return colors[priority] || 'bg-gray-400';
};

export default function LeadOverview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = useOutletContext();
    
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState([]);
    const [showCallLog, setShowCallLog] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchLead = useCallback(async () => {
        try {
            const res = await api.get(`/api/leads/${id}`);
            setLead(res.data);
        } catch (err) {
            console.error('Error fetching lead:', err);
            if (err.response?.status === 404) {
                navigate('/leads');
            }
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchLead();
    }, [fetchLead]);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const res = await api.get(`/api/team`);
                setTeamMembers(res.data);
            } catch (err) {
                console.error('Error fetching team:', err);
            }
        };
        fetchTeam();
    }, []);

    const handleInlineEdit = async (field, value) => {
        setSaving(true);
        try {
            await api.patch(`/api/leads/${id}`, { [field]: value });
            await fetchLead();
            setEditingField(null);
        } catch (err) {
            console.error('Edit error:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/api/leads/${id}`);
            navigate('/leads');
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const startEdit = (field, currentValue) => {
        setEditingField(field);
        setEditValue(currentValue || '');
    };

    const cancelEdit = () => {
        setEditingField(null);
        setEditValue('');
    };

    const saveEdit = () => {
        handleInlineEdit(editingField, editValue);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[#E8536A] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Lead not found</p>
            </div>
        );
    }

    const assignedMember = teamMembers.find(m => m.id === lead.assignedTo);
    const lastContactDays = lead.lastContactDate 
        ? Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const InlineEditField = ({ field, value, label, type = 'text' }) => {
        if (editingField === field) {
            return (
                <div className="flex items-center gap-2">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        type={type}
                        className="h-8 text-[12px] w-full max-w-[200px]"
                        autoFocus
                    />
                    <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded" disabled={saving}>
                        <Check size={14} />
                    </button>
                    <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
                        <X size={14} />
                    </button>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2 group">
                <span className="text-[13px] text-gray-900">{value || '-'}</span>
                <button 
                    onClick={() => startEdit(field, value)}
                    className="p-1 text-gray-300 hover:text-[#E8536A] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Edit2 size={12} />
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in" data-testid="lead-overview-page">
            {/* Top Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 mb-2"
                        data-testid="back-btn"
                    >
                        <ArrowLeft size={14} />
                        Back
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="font-heading text-2xl font-semibold text-gray-900">{lead.companyName}</h1>
                        {lead.isDuplicate && !lead.duplicateDismissed && (
                            <Badge variant="outline" className="text-amber-700 bg-amber-100 border-amber-300">
                                <AlertTriangle size={12} className="mr-1" />
                                Duplicate
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-[11px] font-medium border ${getCategoryStyle(lead.category)}`}>
                            {lead.category}
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px]">
                            <span className={`w-2 h-2 rounded-full ${getPriorityDot(lead.priority)}`} />
                            {lead.priority}
                        </span>
                        <span className="text-[12px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {lead.pipelineStage}
                        </span>
                        {assignedMember && (
                            <span 
                                className="text-[11px] px-2 py-0.5 rounded text-white"
                                style={{ backgroundColor: assignedMember.color }}
                            >
                                {assignedMember.name}
                            </span>
                        )}
                        {lastContactDays !== null && (
                            <span className="text-[11px] text-gray-400">
                                Last contacted {lastContactDays === 0 ? 'today' : `${lastContactDays} days ago`}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setEditModalOpen(true)}
                        variant="outline"
                        className="h-9 text-[12px] rounded-[8px]"
                        data-testid="edit-lead-btn"
                    >
                        <Edit2 size={14} className="mr-1.5" />
                        Edit
                    </Button>
                    {isAdmin && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-9 text-[12px] text-red-600 border-red-200 hover:bg-red-50 rounded-[8px]"
                                    data-testid="delete-lead-btn"
                                >
                                    <Trash2 size={14} className="mr-1.5" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete "{lead.companyName}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Contact Details */}
                    <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-4">
                        <h2 className="font-heading text-sm font-medium text-gray-900 mb-4">Contact Details</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Phone</Label>
                                {lead.phone ? (
                                    <a href={`tel:${lead.phone}`} className="text-[13px] text-[#E8536A] hover:underline flex items-center gap-1">
                                        <Phone size={12} />
                                        {lead.phone}
                                    </a>
                                ) : (
                                    <span className="text-[13px] text-gray-400">-</span>
                                )}
                            </div>
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Phone 2</Label>
                                {lead.phone2 ? (
                                    <a href={`tel:${lead.phone2}`} className="text-[13px] text-[#E8536A] hover:underline flex items-center gap-1">
                                        <Phone size={12} />
                                        {lead.phone2}
                                    </a>
                                ) : (
                                    <span className="text-[13px] text-gray-400">-</span>
                                )}
                            </div>
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Email</Label>
                                {lead.email ? (
                                    <a href={`mailto:${lead.email}`} className="text-[13px] text-blue-600 hover:underline flex items-center gap-1">
                                        <Mail size={12} />
                                        {lead.email}
                                    </a>
                                ) : (
                                    <span className="text-[13px] text-gray-400">-</span>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-1">
                                    <Label className="text-[10px] text-gray-400 uppercase">WhatsApp 1</Label>
                                    {lead.primaryWhatsapp === 1 && (
                                        <Badge className="text-[8px] bg-green-100 text-green-700 px-1 py-0">Primary</Badge>
                                    )}
                                </div>
                                {lead.whatsapp ? (
                                    <span className="text-[13px] text-gray-900">{lead.whatsapp}</span>
                                ) : (
                                    <span className="text-[13px] text-gray-400">-</span>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-1">
                                    <Label className="text-[10px] text-gray-400 uppercase">WhatsApp 2</Label>
                                    {lead.primaryWhatsapp === 2 && (
                                        <Badge className="text-[8px] bg-green-100 text-green-700 px-1 py-0">Primary</Badge>
                                    )}
                                </div>
                                {lead.whatsapp2 ? (
                                    <span className="text-[13px] text-gray-900">{lead.whatsapp2}</span>
                                ) : (
                                    <span className="text-[13px] text-gray-400">-</span>
                                )}
                            </div>
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Instagram</Label>
                                {lead.instagram ? (
                                    <a 
                                        href={`https://instagram.com/${lead.instagram}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-[13px] text-purple-600 hover:underline flex items-center gap-1"
                                    >
                                        <Instagram size={12} />
                                        @{lead.instagram}
                                        <ExternalLink size={10} />
                                    </a>
                                ) : (
                                    <span className="text-[13px] text-gray-400">-</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-4">
                        <h2 className="font-heading text-sm font-medium text-gray-900 mb-4">Location</h2>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">City</Label>
                                <InlineEditField field="city" value={lead.city} />
                            </div>
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">State</Label>
                                <InlineEditField field="state" value={lead.state} />
                            </div>
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Address</Label>
                                <InlineEditField field="address" value={lead.address} />
                            </div>
                        </div>
                        {lead.city && (
                            <div className="rounded-[12px] overflow-hidden border border-gray-100">
                                <iframe
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(lead.city + (lead.state ? ', ' + lead.state : ''))}&output=embed`}
                                    width="100%"
                                    height="200"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Location Map"
                                />
                            </div>
                        )}
                    </div>

                    {/* Lead Details */}
                    <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-4">
                        <h2 className="font-heading text-sm font-medium text-gray-900 mb-4">Lead Details</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Source</Label>
                                <InlineEditField field="sourceSheet" value={lead.sourceSheet} />
                            </div>
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Date Added</Label>
                                <span className="text-[13px] text-gray-900">
                                    {lead.dateAdded ? new Date(lead.dateAdded).toLocaleDateString('en-IN') : '-'}
                                </span>
                            </div>
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Last Contact</Label>
                                <span className="text-[13px] text-gray-900">
                                    {lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString('en-IN') : '-'}
                                </span>
                            </div>
                            <div>
                                <Label className="text-[10px] text-gray-400 uppercase">Next Follow-up</Label>
                                <InlineEditField field="nextFollowupDate" value={lead.nextFollowupDate?.split('T')[0]} type="date" />
                            </div>
                        </div>
                        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                            <label className="flex items-center gap-2 text-[12px]">
                                <Checkbox 
                                    checked={lead.portfolioSent} 
                                    onCheckedChange={(v) => handleInlineEdit('portfolioSent', v)}
                                />
                                Portfolio Sent
                            </label>
                            <label className="flex items-center gap-2 text-[12px]">
                                <Checkbox 
                                    checked={lead.priceListSent} 
                                    onCheckedChange={(v) => handleInlineEdit('priceListSent', v)}
                                />
                                Price List Sent
                            </label>
                            <label className="flex items-center gap-2 text-[12px]">
                                <Checkbox 
                                    checked={lead.waSent} 
                                    onCheckedChange={(v) => handleInlineEdit('waSent', v)}
                                />
                                WA Sent
                            </label>
                        </div>
                    </div>

                    {/* Notes */}
                    {lead.notes && (
                        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-4">
                            <h2 className="font-heading text-sm font-medium text-gray-900 mb-2">Notes</h2>
                            <p className="text-[13px] text-gray-600 whitespace-pre-wrap">{lead.notes}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* WhatsApp Buttons */}
                    <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-4">
                        <h2 className="font-heading text-sm font-medium text-gray-900 mb-3">WhatsApp</h2>
                        <div className="space-y-2">
                            {lead.whatsapp ? (
                                <a
                                    href={`https://wa.me/${lead.whatsapp}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] font-medium text-[13px] transition-colors ${
                                        lead.primaryWhatsapp === 1 
                                            ? 'bg-green-500 text-white hover:bg-green-600' 
                                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                    }`}
                                    data-testid="whatsapp-1-btn"
                                >
                                    <MessageCircle size={16} />
                                    WhatsApp — {lead.whatsapp}
                                </a>
                            ) : (
                                <div className="text-center py-2.5 rounded-[10px] bg-gray-50 text-gray-400 text-[13px]">
                                    No WhatsApp 1
                                </div>
                            )}
                            {lead.whatsapp2 ? (
                                <a
                                    href={`https://wa.me/${lead.whatsapp2}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] font-medium text-[13px] transition-colors ${
                                        lead.primaryWhatsapp === 2 
                                            ? 'bg-green-500 text-white hover:bg-green-600' 
                                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                    }`}
                                    data-testid="whatsapp-2-btn"
                                >
                                    <MessageCircle size={16} />
                                    WhatsApp — {lead.whatsapp2}
                                </a>
                            ) : (
                                <div className="text-center py-2.5 rounded-[10px] bg-gray-50 text-gray-400 text-[13px]">
                                    No WhatsApp 2
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => handleInlineEdit('primaryWhatsapp', lead.primaryWhatsapp === 1 ? 2 : 1)}
                            className="text-[11px] text-gray-500 hover:text-[#E8536A] mt-2 flex items-center gap-1"
                        >
                            <Edit2 size={10} />
                            Switch primary
                        </button>
                    </div>

                    {/* Call Log */}
                    <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-heading text-sm font-medium text-gray-900">Call Log</h2>
                            <Badge variant="secondary" className="text-[10px]">
                                {lead.callCount || 0} Calls
                            </Badge>
                        </div>
                        <Button
                            onClick={() => setShowCallLog(true)}
                            className="w-full bg-[#E8536A] hover:bg-[#D43D54] text-white rounded-[10px]"
                            data-testid="open-call-log-btn"
                        >
                            <Phone size={14} className="mr-2" />
                            Log New Response
                        </Button>
                        
                        {/* Recent History */}
                        {lead.responseHistory?.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-[10px] text-gray-400 uppercase">Recent Activity</p>
                                {lead.responseHistory.slice(-3).reverse().map((entry, idx) => {
                                    const member = teamMembers.find(m => m.id === entry.teamMember);
                                    return (
                                        <div key={idx} className="text-[11px] border-l-2 border-gray-200 pl-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-700">{entry.response}</span>
                                                {member && (
                                                    <span 
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: member.color }}
                                                    />
                                                )}
                                            </div>
                                            <p className="text-gray-400">
                                                {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('en-IN') : ''}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Call Log Panel */}
            {showCallLog && (
                <CallLogPanel
                    lead={lead}
                    onClose={() => setShowCallLog(false)}
                    onUpdate={fetchLead}
                    teamMembers={teamMembers}
                />
            )}

            {/* Edit Modal */}
            <EditLeadModal
                open={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                lead={lead}
                onSuccess={() => { setEditModalOpen(false); fetchLead(); }}
                teamMembers={teamMembers}
            />
        </div>
    );
}

// Edit Lead Modal Component
function EditLeadModal({ open, onClose, lead, onSuccess, teamMembers }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (lead) {
            setFormData({
                companyName: lead.companyName || '',
                phone: lead.phone || '',
                phone2: lead.phone2 || '',
                whatsapp: lead.whatsapp || '',
                whatsapp2: lead.whatsapp2 || '',
                instagram: lead.instagram || '',
                email: lead.email || '',
                city: lead.city || '',
                address: lead.address || '',
                state: lead.state || '',
                category: lead.category || 'Needs Review',
                priority: lead.priority || 'Medium',
                pipelineStage: lead.pipelineStage || 'New Contact',
                assignedTo: lead.assignedTo || '',
                sourceSheet: lead.sourceSheet || '',
                nextFollowupDate: lead.nextFollowupDate?.split('T')[0] || '',
                notes: lead.notes || ''
            });
        }
    }, [lead]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.put(`/api/leads/${lead.id}`, formData);
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update lead');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-heading">Edit Lead</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(90vh-120px)]">
                    <form onSubmit={handleSubmit} className="space-y-4 p-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">Company Name *</Label>
                                <Input
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">Phone</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Phone 2</Label>
                                <Input
                                    value={formData.phone2}
                                    onChange={(e) => handleChange('phone2', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">WhatsApp</Label>
                                <Input
                                    value={formData.whatsapp}
                                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">WhatsApp 2</Label>
                                <Input
                                    value={formData.whatsapp2}
                                    onChange={(e) => handleChange('whatsapp2', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Instagram</Label>
                                <Input
                                    value={formData.instagram}
                                    onChange={(e) => handleChange('instagram', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">City</Label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">State</Label>
                                <Input
                                    value={formData.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Address</Label>
                                <Input
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">Category</Label>
                                <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                                    <SelectTrigger className="h-9 text-[12px] rounded-[8px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Priority</Label>
                                <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                                    <SelectTrigger className="h-9 text-[12px] rounded-[8px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORITIES.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Pipeline Stage</Label>
                                <Select value={formData.pipelineStage} onValueChange={(v) => handleChange('pipelineStage', v)}>
                                    <SelectTrigger className="h-9 text-[12px] rounded-[8px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PIPELINE_STAGES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">Assigned To</Label>
                                <Select value={formData.assignedTo} onValueChange={(v) => handleChange('assignedTo', v)}>
                                    <SelectTrigger className="h-9 text-[12px] rounded-[8px]">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teamMembers?.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Source</Label>
                                <Input
                                    value={formData.sourceSheet}
                                    onChange={(e) => handleChange('sourceSheet', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Next Follow-up</Label>
                                <Input
                                    type="date"
                                    value={formData.nextFollowupDate}
                                    onChange={(e) => handleChange('nextFollowupDate', e.target.value)}
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[11px]">Notes</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                className="text-[12px] rounded-[8px] min-h-[80px]"
                            />
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
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
