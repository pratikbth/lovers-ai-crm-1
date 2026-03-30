import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { 
    Search, Filter, ChevronDown, ChevronUp, Phone, Mail, MapPin, 
    Download, Upload, Plus, Trash2, Users, X, Check, Edit2,
    ArrowUpDown, AlertTriangle, PhoneCall, ExternalLink
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import CallLogPanel from '../components/CallLogPanel';
import ImportModal from '../components/ImportModal';
import AddLeadModal from '../components/AddLeadModal';

const API_URL = process.env.REACT_APP_API_URL;

const CATEGORIES = [
    'Meeting Done', 'Interested', 'Call Back', 'Busy', 'No Response',
    'Foreign', 'Future Projection', 'Needs Review', 'Not Interested'
];

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Review', 'Archive'];

const getCategoryStyle = (category) => {
    const styles = {
        'Meeting Done': 'bg-green-100 text-green-800 border-green-200',
        'Interested': 'bg-blue-100 text-blue-800 border-blue-200',
        'Call Back': 'bg-orange-100 text-orange-800 border-orange-200',
        'Busy': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'No Response': 'bg-gray-100 text-gray-700 border-gray-200',
        'Foreign': 'bg-purple-100 text-purple-800 border-purple-200',
        'Future Projection': 'bg-teal-100 text-teal-800 border-teal-200',
        'Needs Review': 'bg-gray-50 text-gray-600 border-gray-200',
        'Not Interested': 'bg-red-100 text-red-800 border-red-200'
    };
    return styles[category] || 'bg-gray-100 text-gray-600';
};

const getRowBgColor = (category) => {
    const colors = {
        'Meeting Done': 'bg-green-50/50',
        'Interested': 'bg-blue-50/50',
        'Call Back': 'bg-orange-50/50',
        'Busy': 'bg-yellow-50/50',
        'No Response': 'bg-gray-50/50',
        'Foreign': 'bg-purple-50/50',
        'Future Projection': 'bg-teal-50/50',
        'Needs Review': 'bg-gray-50/30',
        'Not Interested': 'bg-red-50/50'
    };
    return colors[category] || '';
};

const getPriorityColor = (priority) => {
    const colors = {
        'Highest': 'text-red-600',
        'High': 'text-orange-600',
        'Medium': 'text-yellow-600',
        'Low': 'text-green-600',
        'Review': 'text-blue-600',
        'Archive': 'text-gray-400'
    };
    return colors[priority] || 'text-gray-600';
};

export default function AllLeads() {
    const { counts, isAdmin } = useOutletContext();
    const navigate = useNavigate();
    
    // Data states
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [teamMembers, setTeamMembers] = useState([]);
    const [cities, setCities] = useState([]);
    const [sources, setSources] = useState([]);
    
    // Filter states
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [assignedToFilter, setAssignedToFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [portfolioSentFilter, setPortfolioSentFilter] = useState('');
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    
    // Sort states
    const [sortField, setSortField] = useState('categoryRank');
    const [sortDirection, setSortDirection] = useState(1);
    const [sortField2, setSortField2] = useState('');
    const [sortDirection2, setSortDirection2] = useState(1);
    
    // Pagination
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    
    // Modals
    const [callLogLead, setCallLogLead] = useState(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
    
    // Inline editing
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    
    const searchTimeout = useRef(null);

    // Fetch team members, cities, sources
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [teamRes, citiesRes, sourcesRes] = await Promise.all([
                    api.get(`/api/team`),
                    api.get(`/api/leads/cities`),
                    api.get(`/api/leads/sources`)
                ]);
                setTeamMembers(teamRes.data);
                setCities(citiesRes.data);
                setSources(sourcesRes.data);
            } catch (err) {
                console.error('Error fetching filters:', err);
            }
        };
        fetchFilters();
    }, []);

    // Fetch leads
    const fetchLeads = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (categoryFilter) params.append('category', categoryFilter);
            if (priorityFilter) params.append('priority', priorityFilter);
            if (assignedToFilter) params.append('assignedTo', assignedToFilter);
            if (cityFilter) params.append('city', cityFilter);
            if (sourceFilter) params.append('source', sourceFilter);
            if (portfolioSentFilter) params.append('portfolioSent', portfolioSentFilter === 'yes');
            if (showDuplicatesOnly) params.append('showDuplicatesOnly', 'true');
            if (search) params.append('search', search);
            params.append('sortField', sortField);
            params.append('sortDirection', sortDirection);
            if (sortField2) {
                params.append('sortField2', sortField2);
                params.append('sortDirection2', sortDirection2);
            }
            params.append('limit', pageSize);
            params.append('skip', page * pageSize);

            const response = await api.get(`/api/leads?${params.toString()}`, {
                withCredentials: true
            });
            setLeads(response.data.leads);
            setTotal(response.data.total);
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    }, [categoryFilter, priorityFilter, assignedToFilter, cityFilter, sourceFilter, portfolioSentFilter, showDuplicatesOnly, search, sortField, sortDirection, sortField2, sortDirection2, page, pageSize]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Debounced search
    const handleSearchChange = (value) => {
        setSearch(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setPage(0);
        }, 300);
    };

    // Sort handler
    const handleSort = (field, e) => {
        if (e?.shiftKey && sortField) {
            // Multi-column sort
            if (sortField2 === field) {
                setSortDirection2(sortDirection2 === 1 ? -1 : 1);
            } else {
                setSortField2(field);
                setSortDirection2(1);
            }
        } else {
            if (sortField === field) {
                setSortDirection(sortDirection === 1 ? -1 : 1);
            } else {
                setSortField(field);
                setSortDirection(1);
            }
            setSortField2('');
        }
        setPage(0);
    };

    // Selection handlers
    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedIds(new Set(leads.map(l => l.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id, checked) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
        setSelectAll(newSelected.size === leads.length);
    };

    // Bulk actions
    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} leads?`)) return;
        try {
            await api.post(`/api/leads/bulk`, {
                leadIds: Array.from(selectedIds),
                action: 'delete'
            });
            setSelectedIds(new Set());
            fetchLeads();
        } catch (err) {
            console.error('Bulk delete error:', err);
        }
    };

    const handleBulkReassign = async (userId) => {
        try {
            await api.post(`/api/leads/bulk`, {
                leadIds: Array.from(selectedIds),
                action: 'reassign',
                value: userId
            });
            setSelectedIds(new Set());
            fetchLeads();
        } catch (err) {
            console.error('Bulk reassign error:', err);
        }
    };

    // Inline edit
    const startEdit = (leadId, field, currentValue) => {
        setEditingCell({ leadId, field });
        setEditValue(currentValue || '');
    };

    const saveEdit = async () => {
        if (!editingCell) return;
        try {
            await api.patch(`/api/leads/${editingCell.leadId}`, {
                [editingCell.field]: editValue
            });
            fetchLeads();
        } catch (err) {
            console.error('Edit error:', err);
        }
        setEditingCell(null);
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    // Export
    const handleExport = async () => {
        const params = new URLSearchParams();
        if (categoryFilter) params.append('category', categoryFilter);
        if (priorityFilter) params.append('priority', priorityFilter);
        if (assignedToFilter) params.append('assignedTo', assignedToFilter);
        if (cityFilter) params.append('city', cityFilter);
        if (search) params.append('search', search);
        
        window.open(`/api/leads/export?${params.toString()}`, '_blank');
    };

    // Clear filters
    const clearFilters = () => {
        setCategoryFilter('');
        setPriorityFilter('');
        setAssignedToFilter('');
        setCityFilter('');
        setSourceFilter('');
        setPortfolioSentFilter('');
        setShowDuplicatesOnly(false);
        setSearch('');
        setPage(0);
    };

    const hasFilters = categoryFilter || priorityFilter || assignedToFilter || cityFilter || sourceFilter || portfolioSentFilter || showDuplicatesOnly || search;

    const SortIcon = ({ field }) => {
        const isActive = sortField === field;
        const isSecondary = sortField2 === field;
        const dir = isActive ? sortDirection : (isSecondary ? sortDirection2 : 0);
        
        if (!isActive && !isSecondary) {
            return <ArrowUpDown size={12} className="text-gray-300 ml-1" />;
        }
        return dir === 1 
            ? <ChevronUp size={12} className={`ml-1 ${isSecondary ? 'text-blue-400' : 'text-[#E8536A]'}`} />
            : <ChevronDown size={12} className={`ml-1 ${isSecondary ? 'text-blue-400' : 'text-[#E8536A]'}`} />;
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-3 animate-fade-in" data-testid="all-leads-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="font-heading text-xl font-semibold text-gray-900">All Leads</h1>
                    <p className="text-[11px] text-gray-500">
                        Showing {leads.length} of {total} leads
                        {hasFilters && <span className="text-[#E8536A]"> (filtered)</span>}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        onClick={() => setImportModalOpen(true)}
                        variant="outline"
                        className="h-8 text-[11px] rounded-[8px]"
                        data-testid="import-btn"
                    >
                        <Upload size={12} className="mr-1.5" />
                        Import
                    </Button>
                    <Button
                        onClick={handleExport}
                        variant="outline"
                        className="h-8 text-[11px] rounded-[8px]"
                        data-testid="export-btn"
                    >
                        <Download size={12} className="mr-1.5" />
                        Export
                    </Button>
                    <Button
                        onClick={() => setAddLeadModalOpen(true)}
                        className="h-8 text-[11px] rounded-[8px] bg-[#E8536A] hover:bg-[#D43D54] text-white"
                        data-testid="add-lead-btn"
                    >
                        <Plus size={12} className="mr-1.5" />
                        Add Lead
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[180px] max-w-[240px]">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search company, phone, city..."
                            className="pl-8 h-8 text-[11px] rounded-[8px]"
                            data-testid="search-leads-input"
                        />
                    </div>

                    <Select value={categoryFilter || undefined} onValueChange={(v) => setCategoryFilter(v === '_all_' ? '' : v)}>
                        <SelectTrigger className="w-[130px] h-8 text-[11px] rounded-[8px]" data-testid="category-filter">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all_">All Categories</SelectItem>
                            {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={priorityFilter || undefined} onValueChange={(v) => setPriorityFilter(v === '_all_' ? '' : v)}>
                        <SelectTrigger className="w-[100px] h-8 text-[11px] rounded-[8px]" data-testid="priority-filter">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all_">All</SelectItem>
                            {PRIORITIES.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={assignedToFilter || undefined} onValueChange={(v) => setAssignedToFilter(v === '_all_' ? '' : v)}>
                        <SelectTrigger className="w-[120px] h-8 text-[11px] rounded-[8px]" data-testid="assigned-filter">
                            <SelectValue placeholder="Assigned To" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all_">All</SelectItem>
                            {teamMembers.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={cityFilter || undefined} onValueChange={(v) => setCityFilter(v === '_all_' ? '' : v)}>
                        <SelectTrigger className="w-[100px] h-8 text-[11px] rounded-[8px]">
                            <SelectValue placeholder="City" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all_">All Cities</SelectItem>
                            {cities.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={portfolioSentFilter || undefined} onValueChange={(v) => setPortfolioSentFilter(v === '_all_' ? '' : v)}>
                        <SelectTrigger className="w-[110px] h-8 text-[11px] rounded-[8px]">
                            <SelectValue placeholder="Portfolio" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all_">All</SelectItem>
                            <SelectItem value="yes">Sent</SelectItem>
                            <SelectItem value="no">Not Sent</SelectItem>
                        </SelectContent>
                    </Select>

                    <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                        <Checkbox
                            checked={showDuplicatesOnly}
                            onCheckedChange={setShowDuplicatesOnly}
                            className="h-4 w-4"
                        />
                        Duplicates
                    </label>

                    {hasFilters && (
                        <Button
                            onClick={clearFilters}
                            variant="ghost"
                            className="h-8 text-[11px] text-[#E8536A] hover:text-[#D43D54]"
                        >
                            <X size={12} className="mr-1" />
                            Clear
                        </Button>
                    )}
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        <span className="text-[11px] text-gray-500">{selectedIds.size} selected</span>
                        {isAdmin && (
                            <>
                                <Button
                                    onClick={handleBulkDelete}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    <Trash2 size={10} className="mr-1" />
                                    Delete
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 text-[10px]">
                                            <Users size={10} className="mr-1" />
                                            Reassign
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {teamMembers.map(m => (
                                            <DropdownMenuItem key={m.id} onClick={() => handleBulkReassign(m.id)}>
                                                {m.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px]" data-testid="leads-table">
                        <thead className="bg-gray-50/80 sticky top-0 z-10">
                            <tr className="border-b border-gray-100">
                                <th className="w-8 px-2 py-2">
                                    <Checkbox
                                        checked={selectAll}
                                        onCheckedChange={handleSelectAll}
                                        className="h-3.5 w-3.5"
                                    />
                                </th>
                                <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                                <th 
                                    className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[140px]"
                                    onClick={(e) => handleSort('companyName', e)}
                                >
                                    <span className="flex items-center">Company <SortIcon field="companyName" /></span>
                                </th>
                                <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[90px]">Phone</th>
                                <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[90px]">Phone 2</th>
                                <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[90px]">WhatsApp</th>
                                <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]">Instagram</th>
                                <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">Email</th>
                                <th 
                                    className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[70px]"
                                    onClick={(e) => handleSort('city', e)}
                                >
                                    <span className="flex items-center">City <SortIcon field="city" /></span>
                                </th>
                                <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]">Response</th>
                                <th 
                                    className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[90px]"
                                    onClick={(e) => handleSort('categoryRank', e)}
                                >
                                    <span className="flex items-center">Category <SortIcon field="categoryRank" /></span>
                                </th>
                                <th 
                                    className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[80px]"
                                    onClick={(e) => handleSort('assignedTo', e)}
                                >
                                    <span className="flex items-center">Assigned <SortIcon field="assignedTo" /></span>
                                </th>
                                <th 
                                    className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[80px]"
                                    onClick={(e) => handleSort('nextFollowupDate', e)}
                                >
                                    <span className="flex items-center">Follow-up <SortIcon field="nextFollowupDate" /></span>
                                </th>
                                <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-12">Port.</th>
                                <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-12">Price</th>
                                <th 
                                    className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[60px]"
                                    onClick={(e) => handleSort('priorityRank', e)}
                                >
                                    <span className="flex items-center">Priority <SortIcon field="priorityRank" /></span>
                                </th>
                                <th 
                                    className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-12"
                                    onClick={(e) => handleSort('callCount', e)}
                                >
                                    <span className="flex items-center justify-center">Calls <SortIcon field="callCount" /></span>
                                </th>
                                <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[60px]">Source</th>
                                <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={19} className="text-center py-8">
                                        <div className="w-6 h-6 border-2 border-[#E8536A] border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={19} className="text-center py-8 text-gray-500">
                                        No leads found. Import or add leads to get started.
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead, idx) => {
                                    const assignedMember = teamMembers.find(m => m.id === lead.assignedTo);
                                    const isDuplicate = lead.isDuplicate && !lead.duplicateDismissed;
                                    
                                    return (
                                        <tr 
                                            key={lead.id}
                                            className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${getRowBgColor(lead.category)} ${isDuplicate ? 'border-l-4 border-l-amber-400' : ''}`}
                                            data-testid={`lead-row-${lead.id}`}
                                        >
                                            <td className="px-2 py-1">
                                                <Checkbox
                                                    checked={selectedIds.has(lead.id)}
                                                    onCheckedChange={(checked) => handleSelectRow(lead.id, checked)}
                                                    className="h-3.5 w-3.5"
                                                />
                                            </td>
                                            <td className="px-2 py-1 text-gray-400">{page * pageSize + idx + 1}</td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center gap-1">
                                                    {isDuplicate && (
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 border-amber-300">
                                                            DUP
                                                        </Badge>
                                                    )}
                                                    <Link 
                                                        to={`/leads/${lead.id}`}
                                                        className="font-medium text-gray-900 hover:text-[#E8536A] hover:underline truncate max-w-[120px]"
                                                    >
                                                        {lead.companyName}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                {lead.phone && (
                                                    <a href={`tel:${lead.phone}`} className="text-gray-600 hover:text-[#E8536A]">
                                                        {lead.phone}
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-2 py-1 text-gray-600">{lead.phone2 || '-'}</td>
                                            <td className="px-2 py-1">
                                                {lead.whatsapp && (
                                                    <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
                                                        {lead.whatsapp}
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-2 py-1">
                                                {lead.instagram && (
                                                    <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">
                                                        @{lead.instagram}
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-2 py-1 text-gray-600 truncate max-w-[100px]">{lead.email || '-'}</td>
                                            <td className="px-2 py-1 text-gray-600">{lead.city || '-'}</td>
                                            <td className="px-2 py-1">
                                                {lead.mostCommonResponse && (
                                                    <span className="text-[10px] text-gray-600">{lead.mostCommonResponse}</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getCategoryStyle(lead.category)}`}>
                                                    {lead.category}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1">
                                                {assignedMember && (
                                                    <span 
                                                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                                        style={{ backgroundColor: assignedMember.color }}
                                                    >
                                                        {assignedMember.name.split(' ')[0]}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1 text-gray-600">
                                                {lead.nextFollowupDate ? new Date(lead.nextFollowupDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                {lead.portfolioSent ? <Check size={12} className="mx-auto text-green-600" /> : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                {lead.priceListSent ? <Check size={12} className="mx-auto text-green-600" /> : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-2 py-1">
                                                <span className={`font-medium ${getPriorityColor(lead.priority)}`}>
                                                    {lead.priority}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                <button
                                                    onClick={() => setCallLogLead(lead)}
                                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold hover:bg-blue-200 transition-colors"
                                                    data-testid={`call-log-btn-${lead.id}`}
                                                >
                                                    {lead.callCount || 0}
                                                </button>
                                            </td>
                                            <td className="px-2 py-1 text-gray-500 truncate max-w-[60px]">{lead.sourceSheet || '-'}</td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => navigate(`/leads/${lead.id}`)}
                                                        className="p-1 text-gray-400 hover:text-[#E8536A] hover:bg-[#FFF5F5] rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setCallLogLead(lead)}
                                                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                        title="Call Log"
                                                    >
                                                        <PhoneCall size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500">Rows per page:</span>
                        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                            <SelectTrigger className="w-[70px] h-7 text-[11px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="200">200</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500">
                            Page {page + 1} of {totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="h-7 px-2"
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="h-7 px-2"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Call Log Panel */}
            {callLogLead && (
                <CallLogPanel
                    lead={callLogLead}
                    onClose={() => setCallLogLead(null)}
                    onUpdate={fetchLeads}
                    teamMembers={teamMembers}
                />
            )}

            {/* Import Modal */}
            <ImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={() => { setImportModalOpen(false); fetchLeads(); }}
            />

            {/* Add Lead Modal */}
            <AddLeadModal
                open={addLeadModalOpen}
                onClose={() => setAddLeadModalOpen(false)}
                onSuccess={() => { setAddLeadModalOpen(false); fetchLeads(); }}
                teamMembers={teamMembers}
            />
        </div>
    );
}
