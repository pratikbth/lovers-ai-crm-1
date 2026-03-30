import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../lib/api';
import { Users, Plus, Trash2, Mail, Shield, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_API_URL;

export default function Team() {
    const { isAdmin } = useOutletContext();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const response = await api.get(`/api/team`, {
                withCredentials: true
            });
            setMembers(response.data);
        } catch (err) {
            console.error('Error fetching team:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            await api.post(`/api/team`, newMember, {
                withCredentials: true
            });
            setNewMember({ name: '', email: '', password: '' });
            setDialogOpen(false);
            fetchTeam();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add team member');
        }
    };

    const handleDeleteMember = async (id) => {
        if (!window.confirm('Are you sure you want to remove this team member?')) return;
        
        try {
            await api.delete(`/api/team/${id}`, {
                withCredentials: true
            });
            fetchTeam();
        } catch (err) {
            console.error('Error deleting member:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[#E8536A] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="team-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-semibold text-gray-900">Team Members</h1>
                    <p className="text-[13px] text-gray-500 mt-1">{members.length} members</p>
                </div>
                
                {isAdmin && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                className="bg-[#E8536A] hover:bg-[#D43D54] text-white rounded-[12px]"
                                data-testid="add-team-member-btn"
                            >
                                <Plus size={16} className="mr-2" />
                                Add Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="font-heading">Add Team Member</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddMember} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label className="text-[13px]">Name</Label>
                                    <Input
                                        value={newMember.name}
                                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                        placeholder="Enter name"
                                        required
                                        data-testid="new-member-name"
                                        className="rounded-[10px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[13px]">Email</Label>
                                    <Input
                                        type="email"
                                        value={newMember.email}
                                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                        placeholder="Enter email"
                                        required
                                        data-testid="new-member-email"
                                        className="rounded-[10px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[13px]">Password</Label>
                                    <Input
                                        type="password"
                                        value={newMember.password}
                                        onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                                        placeholder="Enter password"
                                        required
                                        data-testid="new-member-password"
                                        className="rounded-[10px]"
                                    />
                                </div>
                                {error && (
                                    <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                                )}
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                        className="rounded-[10px]"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-[#E8536A] hover:bg-[#D43D54] text-white rounded-[10px]"
                                        data-testid="submit-new-member"
                                    >
                                        Add Member
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                    <div
                        key={member.id}
                        data-testid={`team-member-${member.id}`}
                        className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(232,83,106,0.06)] border border-gray-100 p-4 hover:shadow-[0_8px_24px_rgba(232,83,106,0.12)] transition-all"
                    >
                        <div className="flex items-start gap-3">
                            <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg"
                                style={{ backgroundColor: member.color || '#E8536A' }}
                            >
                                {member.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-heading text-base font-medium text-gray-900 truncate">
                                    {member.name}
                                </h3>
                                <div className="flex items-center gap-1 mt-1">
                                    <Mail size={12} className="text-gray-400" />
                                    <span className="text-[12px] text-gray-500 truncate">{member.email}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    {member.role === 'admin' ? (
                                        <>
                                            <Shield size={12} className="text-[#E8536A]" />
                                            <span className="text-[11px] font-medium text-[#E8536A]">Admin</span>
                                        </>
                                    ) : (
                                        <>
                                            <User size={12} className="text-gray-400" />
                                            <span className="text-[11px] font-medium text-gray-500">Team Member</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            {isAdmin && member.role !== 'admin' && (
                                <button
                                    onClick={() => handleDeleteMember(member.id)}
                                    data-testid={`delete-member-${member.id}`}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {members.length === 0 && (
                <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No team members yet</p>
                </div>
            )}
        </div>
    );
}
