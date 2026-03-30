import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { 
    Phone, MapPin, MessageCircle, Instagram, Calendar, Clock, 
    Check, ChevronDown, ChevronUp, Send, Undo2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';

const API_URL = process.env.REACT_APP_API_URL;

const RESPONSES = [
    "Interested", "Not Interested", "Call Again 1", "Call Again 2", "Call Again 3",
    "Send Portfolio", "Portfolio Sent — Will Let Us Know", "Meeting Scheduled", "Meeting Done",
    "Time Given", "Not Answering / Voicemail", "Busy — Call Back Later", "Wrong Number",
    "Switch Off", "In Meeting — Send Details", "Low Budget", "Inhouse Team",
    "Project Follow-up", "Weekly Message Sent", "Will Let Us Know"
];

const CATEGORIES = [
    'Meeting Done', 'Interested', 'Call Back', 'Busy', 'No Response',
    'Foreign', 'Future Projection', 'Needs Review', 'Not Interested'
];

const PIPELINE_STAGES = [
    "New Contact", "Interested", "Send Portfolio", "Time Given",
    "Meeting Scheduled", "Meeting Done", "Project Follow-up", "Onboarded",
    "Unknown", "Call Again 1", "Call Again 2", "Call Again 3",
    "Not Answering", "Not Interested"
];

export default function LeadCard({ lead, teamMembers, onUpdate, showRevive = false }) {
    const [expanded, setExpanded] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [response, setResponse] = useState('');
    const [notes, setNotes] = useState('');
    const [nextFollowupDate, setNextFollowupDate] = useState('');
    const [nextFollowupTime, setNextFollowupTime] = useState('10:00');
    const [portfolioSent, setPortfolioSent] = useState(false);
    const [priceListSent, setPriceListSent] = useState(false);
    const [waSent, setWaSent] = useState(false);
    const [newPipelineStage, setNewPipelineStage] = useState('');
    const [newCategory, setNewCategory] = useState('');

    const assignedMember = teamMembers?.find(m => m.id === lead.assignedTo);
    const lastResponse = lead.responseHistory?.length > 0 
        ? lead.responseHistory[lead.responseHistory.length - 1]
        : null;
    const primaryWA = lead.primaryWhatsapp === 2 ? lead.whatsapp2 : lead.whatsapp;

    const handleSave = async () => {
        if (!response) return;
        
        setSaving(true);
        try {
            // Build followup datetime
            let followupDateTime = null;
            if (nextFollowupDate) {
                followupDateTime = `${nextFollowupDate}T${nextFollowupTime || '10:00'}:00`;
            }

            // Log response
            await api.post(`/api/leads/${lead.id}/response`, {
                response,
                notes,
                nextFollowupDate: followupDateTime,
                portfolioSent,
                priceListSent,
                waSent
            });

            // Update pipeline stage and category if changed
            const updates = {};
            if (newPipelineStage) updates.pipelineStage = newPipelineStage;
            if (newCategory) updates.category = newCategory;
            
            if (Object.keys(updates).length > 0) {
                await api.patch(`/api/leads/${lead.id}`, updates);
            }

            // Reset form
            setResponse('');
            setNotes('');
            setNextFollowupDate('');
            setNextFollowupTime('10:00');
            setPortfolioSent(false);
            setPriceListSent(false);
            setWaSent(false);
            setNewPipelineStage('');
            setNewCategory('');
            setExpanded(false);
            
            onUpdate?.();
        } catch (err) {
            console.error('Error saving response:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRevive = async () => {
        try {
            await api.patch(`/api/leads/${lead.id}`, {
                category: 'Needs Review'
            });
            onUpdate?.();
        } catch (err) {
            console.error('Error reviving lead:', err);
        }
    };

    return (
        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden" data-testid={`lead-card-${lead.id}`}>
            {/* Card Content */}
            <div className="p-4">
                {/* Company Name */}
                <Link 
                    to={`/leads/${lead.id}`}
                    className="font-heading text-lg font-semibold text-gray-900 hover:text-[#E8536A] hover:underline block mb-2"
                >
                    {lead.companyName}
                </Link>

                {/* Phone */}
                {lead.phone && (
                    <a 
                        href={`tel:${lead.phone}`}
                        className="text-[15px] text-[#E8536A] font-medium flex items-center gap-2 mb-3 hover:underline"
                    >
                        <Phone size={16} />
                        {lead.phone}
                    </a>
                )}

                {/* City & Assigned */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {lead.city && (
                        <span className="text-[13px] text-gray-600 flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" />
                            {lead.city}
                        </span>
                    )}
                    {lead.city && assignedMember && <span className="text-gray-300">|</span>}
                    {assignedMember && (
                        <span 
                            className="text-[11px] px-2 py-0.5 rounded text-white font-medium"
                            style={{ backgroundColor: assignedMember.color }}
                        >
                            {assignedMember.name}
                        </span>
                    )}
                </div>

                {/* Last Response */}
                {lastResponse && (
                    <div className="bg-gray-50 rounded-[8px] p-2 mb-3">
                        <p className="text-[12px] text-gray-600">
                            <span className="font-medium text-gray-700">{lastResponse.response}</span>
                            {lastResponse.notes && `: ${lastResponse.notes}`}
                        </p>
                        {lastResponse.timestamp && (
                            <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(lastResponse.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                )}

                {/* Stats Row */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Phone size={10} />
                        {lead.callCount || 0} calls
                    </span>
                    {lead.portfolioSent && (
                        <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 px-2 py-0">
                            <Check size={10} className="mr-1" />
                            Portfolio Sent
                        </Badge>
                    )}
                    {lead.nextFollowupDate && (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(lead.nextFollowupDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {primaryWA && (
                        <a
                            href={`https://wa.me/${primaryWA}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-[12px] font-medium rounded-[8px] hover:bg-green-600 transition-colors"
                        >
                            <MessageCircle size={14} />
                            WhatsApp
                        </a>
                    )}
                    {lead.instagram && (
                        <a
                            href={`https://instagram.com/${lead.instagram}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[12px] font-medium rounded-[8px] hover:opacity-90 transition-opacity"
                        >
                            <Instagram size={14} />
                            @{lead.instagram}
                        </a>
                    )}
                    <Button
                        onClick={() => setExpanded(!expanded)}
                        className="flex-1 min-w-[120px] bg-[#E8536A] hover:bg-[#D43D54] text-white text-[12px] font-medium rounded-[8px]"
                        data-testid={`log-response-btn-${lead.id}`}
                    >
                        {expanded ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
                        Log Response
                    </Button>
                    {showRevive && (
                        <Button
                            onClick={handleRevive}
                            variant="outline"
                            className="text-[12px] font-medium rounded-[8px] border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                            <Undo2 size={14} className="mr-1" />
                            Revive
                        </Button>
                    )}
                </div>
            </div>

            {/* Inline Log Response Panel */}
            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-[11px]">Response *</Label>
                            <Select value={response} onValueChange={setResponse}>
                                <SelectTrigger className="h-9 text-[12px] rounded-[8px] bg-white" data-testid={`response-select-${lead.id}`}>
                                    <SelectValue placeholder="Select response" />
                                </SelectTrigger>
                                <SelectContent>
                                    {RESPONSES.map(r => (
                                        <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px]">Notes</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes..."
                                className="text-[12px] rounded-[8px] min-h-[60px] bg-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-2">
                            <Label className="text-[11px]">Next Follow-up Date</Label>
                            <Input
                                type="date"
                                value={nextFollowupDate}
                                onChange={(e) => setNextFollowupDate(e.target.value)}
                                className="h-9 text-[12px] rounded-[8px] bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px]">Time</Label>
                            <Input
                                type="time"
                                value={nextFollowupTime}
                                onChange={(e) => setNextFollowupTime(e.target.value)}
                                className="h-9 text-[12px] rounded-[8px] bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px]">Move to Pipeline</Label>
                            <Select value={newPipelineStage || undefined} onValueChange={setNewPipelineStage}>
                                <SelectTrigger className="h-9 text-[12px] rounded-[8px] bg-white">
                                    <SelectValue placeholder="Keep current" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PIPELINE_STAGES.map(s => (
                                        <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px]">Move to Category</Label>
                            <Select value={newCategory || undefined} onValueChange={setNewCategory}>
                                <SelectTrigger className="h-9 text-[12px] rounded-[8px] bg-white">
                                    <SelectValue placeholder="Keep current" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-2 text-[12px]">
                            <Checkbox checked={portfolioSent} onCheckedChange={setPortfolioSent} className="h-4 w-4" />
                            Portfolio Sent
                        </label>
                        <label className="flex items-center gap-2 text-[12px]">
                            <Checkbox checked={priceListSent} onCheckedChange={setPriceListSent} className="h-4 w-4" />
                            Price List Sent
                        </label>
                        <label className="flex items-center gap-2 text-[12px]">
                            <Checkbox checked={waSent} onCheckedChange={setWaSent} className="h-4 w-4" />
                            WA Message Sent
                        </label>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={!response || saving}
                            className="bg-[#E8536A] hover:bg-[#D43D54] text-white rounded-[8px] px-6"
                            data-testid={`save-response-btn-${lead.id}`}
                        >
                            {saving ? 'Saving...' : 'Save Response'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
