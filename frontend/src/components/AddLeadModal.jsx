import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';

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

export default function AddLeadModal({ open, onClose, onSuccess, teamMembers, defaultCategory = 'Needs Review' }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        companyName: '',
        phone: '',
        phone2: '',
        whatsapp: '',
        whatsapp2: '',
        instagram: '',
        email: '',
        city: '',
        address: '',
        state: '',
        category: defaultCategory,
        priority: 'Medium',
        pipelineStage: 'New Contact',
        assignedTo: '',
        sourceSheet: '',
        nextFollowupDate: '',
        portfolioSent: false,
        priceListSent: false,
        waSent: false,
        notes: ''
    });

    // Update category when defaultCategory changes
    useEffect(() => {
        setFormData(prev => ({ ...prev, category: defaultCategory }));
    }, [defaultCategory]);

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
            // Reset form
            setFormData({
                companyName: '',
                phone: '',
                phone2: '',
                whatsapp: '',
                whatsapp2: '',
                instagram: '',
                email: '',
                city: '',
                address: '',
                state: '',
                category: defaultCategory,
                priority: 'Medium',
                pipelineStage: 'New Contact',
                assignedTo: '',
                sourceSheet: '',
                nextFollowupDate: '',
                portfolioSent: false,
                priceListSent: false,
                waSent: false,
                notes: ''
            });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create lead');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-heading flex items-center gap-2">
                        <Plus size={20} className="text-[#E8536A]" />
                        Add New Lead
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-120px)]">
                    <form onSubmit={handleSubmit} className="space-y-4 p-1">
                        {/* Company Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">Company Name *</Label>
                                <Input
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    placeholder="Enter company name"
                                    className="h-9 text-[12px] rounded-[8px]"
                                    required
                                    data-testid="add-lead-company"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="email@example.com"
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        {/* Phone Numbers */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">Phone</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="9876543210"
                                    className="h-9 text-[12px] rounded-[8px]"
                                    data-testid="add-lead-phone"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Phone 2</Label>
                                <Input
                                    value={formData.phone2}
                                    onChange={(e) => handleChange('phone2', e.target.value)}
                                    placeholder="Secondary phone"
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        {/* WhatsApp & Instagram */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">WhatsApp</Label>
                                <Input
                                    value={formData.whatsapp}
                                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                                    placeholder="WhatsApp number"
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">WhatsApp 2</Label>
                                <Input
                                    value={formData.whatsapp2}
                                    onChange={(e) => handleChange('whatsapp2', e.target.value)}
                                    placeholder="Secondary WhatsApp"
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Instagram</Label>
                                <Input
                                    value={formData.instagram}
                                    onChange={(e) => handleChange('instagram', e.target.value)}
                                    placeholder="@handle"
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">City</Label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder="City"
                                    className="h-9 text-[12px] rounded-[8px]"
                                    data-testid="add-lead-city"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">State</Label>
                                <Input
                                    value={formData.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                    placeholder="State"
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px]">Address</Label>
                                <Input
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="Full address"
                                    className="h-9 text-[12px] rounded-[8px]"
                                />
                            </div>
                        </div>

                        {/* Status Fields */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">Category</Label>
                                <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                                    <SelectTrigger className="h-9 text-[12px] rounded-[8px]" data-testid="add-lead-category">
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

                        {/* Assignment & Source */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px]">Assigned To</Label>
                                <Select value={formData.assignedTo} onValueChange={(v) => handleChange('assignedTo', v)}>
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
                            <div className="space-y-2">
                                <Label className="text-[11px]">Source</Label>
                                <Input
                                    value={formData.sourceSheet}
                                    onChange={(e) => handleChange('sourceSheet', e.target.value)}
                                    placeholder="Lead source"
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

                        {/* Flags */}
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-[12px]">
                                <Checkbox 
                                    checked={formData.portfolioSent} 
                                    onCheckedChange={(v) => handleChange('portfolioSent', v)} 
                                    className="h-4 w-4"
                                />
                                Portfolio Sent
                            </label>
                            <label className="flex items-center gap-2 text-[12px]">
                                <Checkbox 
                                    checked={formData.priceListSent} 
                                    onCheckedChange={(v) => handleChange('priceListSent', v)} 
                                    className="h-4 w-4"
                                />
                                Price List Sent
                            </label>
                            <label className="flex items-center gap-2 text-[12px]">
                                <Checkbox 
                                    checked={formData.waSent} 
                                    onCheckedChange={(v) => handleChange('waSent', v)} 
                                    className="h-4 w-4"
                                />
                                WA Sent
                            </label>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-[11px]">Notes</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Add any notes..."
                                className="text-[12px] rounded-[8px] min-h-[80px]"
                            />
                        </div>

                        {error && (
                            <div className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="rounded-[8px]"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-[#E8536A] hover:bg-[#D43D54] text-white rounded-[8px]"
                                data-testid="submit-add-lead"
                            >
                                {loading ? 'Creating...' : 'Add Lead'}
                            </Button>
                        </div>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
