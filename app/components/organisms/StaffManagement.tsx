'use client';

import React, { useState, useMemo } from 'react';
import { UserProfile } from '../../lib/db';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  UserCog,
  Shield,
  Search,
  X,
  Copy,
  Check,
  UserPlus,
  Globe
} from 'lucide-react';

interface StaffManagementProps {
  staffList: UserProfile[];
  usersList: UserProfile[];
  loading: boolean;
  onRefresh: () => void;
}

// Generate a random secure password
function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function StaffManagement({ staffList, usersList, loading, onRefresh }: StaffManagementProps) {
  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'salesman' | 'admin'>('salesman');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit modal state
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'salesman' | 'admin' | 'client'>('salesman');
  const isEditGoogleUser = editUser ? !editUser.plainPassword : false;
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete state
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'salesman' | 'admin'>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Promote modal state
  const [showPromote, setShowPromote] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState('');
  const [promoteSelectedUid, setPromoteSelectedUid] = useState<string | null>(null);
  const [promoteRole, setPromoteRole] = useState<'salesman' | 'admin'>('salesman');
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState('');

  // Client list for promotion (excludes existing staff)
  const clientsForPromotion = useMemo(() => {
    const staffUids = new Set(staffList.map(s => s.uid));
    return usersList.filter(u => {
      if (staffUids.has(u.uid)) return false;
      const role = u.role || 'client';
      return role === 'client';
    });
  }, [usersList, staffList]);

  const filteredClientsForPromotion = useMemo(() => {
    if (!promoteSearch.trim()) return clientsForPromotion;
    const q = promoteSearch.toLowerCase();
    return clientsForPromotion.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [clientsForPromotion, promoteSearch]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filter staff
  const filteredStaff = staffList.filter(user => {
    const role = user.role || 'client';
    if (role === 'client') return false;
    if (roleFilter !== 'all' && role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const togglePasswordVisibility = (uid: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const copyPassword = (uid: string, password: string) => {
    navigator.clipboard.writeText(password);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // ── CREATE ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError('All fields are required');
      return;
    }
    if (createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          role: createRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');

      showToast(`${createRole === 'admin' ? 'Admin' : 'Salesman'} "${createName}" created successfully!`, 'success');
      setShowCreate(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('salesman');
      onRefresh();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── EDIT ──
  const openEdit = (user: UserProfile) => {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.plainPassword || '');
    setEditRole((user.role as 'salesman' | 'admin' | 'client') || 'salesman');
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError('');

    if (!editName.trim()) {
      setEditError('Name is required');
      return;
    }
    if (!isEditGoogleUser && !editEmail.trim()) {
      setEditError('Email is required');
      return;
    }

    setEditing(true);
    try {
      const body: any = {
        uid: editUser.uid,
        name: editName.trim(),
        role: editRole,
      };
      // Only include email if not a Google user
      if (!isEditGoogleUser) {
        body.email = editEmail.trim();
      }
      // Only include password if changed and not a Google user
      if (!isEditGoogleUser && editPassword && editPassword !== editUser.plainPassword) {
        if (editPassword.length < 6) {
          setEditError('Password must be at least 6 characters');
          setEditing(false);
          return;
        }
        body.password = editPassword;
      }

      const res = await fetch('/api/admin/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      showToast(`Staff member "${editName}" updated successfully!`, 'success');
      setEditUser(null);
      onRefresh();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditing(false);
    }
  };

  // ── DELETE ──
  const handleDelete = async (uid: string) => {
    setDeletingUid(uid);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      showToast('Staff member deleted successfully!', 'success');
      setConfirmDelete(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeletingUid(null);
    }
  };

  const salesmanCount = staffList.filter(u => u.role === 'salesman').length;
  const adminCount = staffList.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold text-white animate-in slide-in-from-right-5 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div
          onClick={() => setRoleFilter('all')}
          className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 cursor-pointer transition-all ${
            roleFilter === 'all'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-zinc-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
              <UserCog className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{salesmanCount + adminCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setRoleFilter('salesman')}
          className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 cursor-pointer transition-all ${
            roleFilter === 'salesman'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-zinc-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <UserCog className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{salesmanCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salesman</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setRoleFilter('admin')}
          className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 cursor-pointer transition-all ${
            roleFilter === 'admin'
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-slate-200 dark:border-zinc-800 hover:border-red-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{adminCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header + Search + Create */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-black text-slate-900 dark:text-white">Staff Members</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white w-56"
              />
            </div>
            <button
              onClick={() => {
                setShowPromote(true);
                setPromoteSearch('');
                setPromoteSelectedUid(null);
                setPromoteRole('salesman');
                setPromoteError('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Promote Client
            </button>
            <button
              onClick={() => {
                setShowCreate(true);
                setCreatePassword(generatePassword());
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center">
            <UserCog className="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-bold text-slate-400 dark:text-zinc-500">No staff members found</p>
            <p className="text-xs text-slate-300 dark:text-zinc-600 mt-1">Click &quot;Add Staff&quot; to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Name</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Email</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Role</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Password</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Created</th>
                  <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(user => (
                  <tr key={user.uid} className="border-b border-slate-50 dark:border-zinc-800/50 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white ${
                          user.role === 'admin' ? 'bg-red-600' : 'bg-amber-600'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                        user.role === 'admin'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {user.plainPassword ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                            {visiblePasswords.has(user.uid)
                              ? user.plainPassword
                              : '••••••••'}
                          </code>
                          <button
                            onClick={() => togglePasswordVisibility(user.uid)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                            title={visiblePasswords.has(user.uid) ? 'Hide' : 'Show'}
                          >
                            {visiblePasswords.has(user.uid) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyPassword(user.uid, user.plainPassword!)}
                            className="p-1 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                            title="Copy password"
                          >
                            {copiedUid === user.uid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          <Globe className="w-3 h-3" />
                          Google Account
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(user.uid)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Create Staff Member</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={e => setCreateEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-sm font-mono font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generatePassword())}
                    className="px-3 py-2.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Role</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateRole('salesman')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      createRole === 'salesman'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-amber-300'
                    }`}
                  >
                    Salesman
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateRole('admin')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      createRole === 'admin'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-red-300'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create {createRole === 'admin' ? 'Admin' : 'Salesman'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Staff Member</h3>
              <button onClick={() => setEditUser(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {!isEditGoogleUser ? (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
                  <div className="w-full px-4 py-2.5 text-sm font-bold bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    {editEmail}
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">Google account — email managed by Google</p>
                </div>
              )}

              {!isEditGoogleUser ? (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Password (leave blank to keep current)</label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm font-mono font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                    placeholder="Enter new password or leave as-is"
                  />
                </div>
              ) : (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Google Account
                  </p>
                  <p className="text-[10px] font-bold text-blue-500/70 dark:text-blue-400/60 mt-0.5">Password is managed via Google Sign-In and cannot be changed here.</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Role</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditRole('salesman')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      editRole === 'salesman'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-amber-300'
                    }`}
                  >
                    Salesman
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      editRole === 'admin'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-red-300'
                    }`}
                  >
                    Admin
                  </button>
                  {isEditGoogleUser && (
                    <button
                      type="button"
                      onClick={() => setEditRole('client')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                        editRole === 'client'
                          ? 'border-slate-500 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                          : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      Client
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={editing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {editing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">Delete Staff Member?</h3>
            <p className="text-xs font-bold text-slate-400 mb-6">
              This will permanently delete the account from Firebase Auth and Firestore. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-black rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingUid === confirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {deletingUid === confirmDelete ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROMOTE CLIENT MODAL ── */}
      {showPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPromote(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Promote Client to Staff
              </h3>
              <button onClick={() => setShowPromote(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {promoteError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                  {promoteError}
                </div>
              )}

              {/* Search clients */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={promoteSearch}
                  onChange={e => setPromoteSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-white"
                />
              </div>

              {/* Client list */}
              <div className="max-h-52 overflow-y-auto space-y-1 border border-slate-100 dark:border-zinc-800 rounded-xl p-1">
                {filteredClientsForPromotion.length === 0 ? (
                  <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 text-center py-6">No clients found</p>
                ) : (
                  filteredClientsForPromotion.map(client => (
                    <button
                      key={client.uid}
                      type="button"
                      onClick={() => setPromoteSelectedUid(client.uid)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        promoteSelectedUid === client.uid
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800'
                          : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50 border border-transparent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-zinc-300">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{client.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 truncate">{client.email}</p>
                      </div>
                      {promoteSelectedUid === client.uid && (
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Role selection */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Assign Role</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPromoteRole('salesman')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      promoteRole === 'salesman'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-amber-300'
                    }`}
                  >
                    Salesman
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoteRole('admin')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                      promoteRole === 'admin'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-red-300'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Promote button */}
              <button
                type="button"
                disabled={!promoteSelectedUid || promoting}
                onClick={async () => {
                  if (!promoteSelectedUid) return;
                  setPromoting(true);
                  setPromoteError('');
                  try {
                    const client = clientsForPromotion.find(c => c.uid === promoteSelectedUid);
                    if (!client) throw new Error('Client not found');
                    const res = await fetch('/api/admin/staff', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        uid: client.uid,
                        name: client.name,
                        role: promoteRole,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to promote');
                    showToast(`"${client.name}" promoted to ${promoteRole} successfully!`, 'success');
                    setShowPromote(false);
                    onRefresh();
                  } catch (err: any) {
                    setPromoteError(err.message);
                  } finally {
                    setPromoting(false);
                  }
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {promoting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Promoting...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Promote to {promoteRole === 'admin' ? 'Admin' : 'Salesman'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
