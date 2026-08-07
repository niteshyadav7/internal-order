'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Users, 
  UserCog, 
  ShoppingBag, 
  Database, 
  History, 
  Settings, 
  KeyRound, 
  Lock, 
  Loader2
} from 'lucide-react';
import { RolePermission, AdminTabKey, saveRole, deleteRole } from '../../lib/db';
import Button from '../atoms/Button';
import ConfirmModal from '../ui/ConfirmModal';

interface RoleManagementProps {
  rolesList: RolePermission[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const ALL_ADMIN_TABS: { key: AdminTabKey; label: string; description: string; icon: any }[] = [
  { key: 'users', label: 'User Approvals', description: 'Review and approve/reject customer registrations', icon: Users },
  { key: 'staff', label: 'Staff Management', description: 'Create and manage internal staff & salesman accounts', icon: UserCog },
  { key: 'orders', label: 'Order Requests', description: 'Manage wholesale orders, status updates & packing', icon: ShoppingBag },
  { key: 'products', label: 'Manage Catalog', description: 'Create, update, pricing & inventory catalog management', icon: Database },
  { key: 'logs', label: 'Activity Logs', description: 'View real-time system audit logs & administrative actions', icon: History },
  { key: 'fields', label: 'Profile Settings', description: 'Configure dynamic profile fields & global B2B settings', icon: Settings },
  { key: 'roles', label: 'Role Management', description: 'Create dynamic roles and configure tab permissions', icon: ShieldCheck },
];

export default function RoleManagement({ rolesList, loading = false, onRefresh }: RoleManagementProps) {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createSelectedTabs, setCreateSelectedTabs] = useState<AdminTabKey[]>(['users', 'orders', 'products']);
  const [savingRole, setSavingRole] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit states
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSelectedTabs, setEditSelectedTabs] = useState<AdminTabKey[]>([]);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Delete state
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [deletingRoleName, setDeletingRoleName] = useState<string>('');

  const toggleCreateTab = (tabKey: AdminTabKey) => {
    setCreateSelectedTabs(prev => 
      prev.includes(tabKey) ? prev.filter(t => t !== tabKey) : [...prev, tabKey]
    );
  };

  const toggleEditTab = (tabKey: AdminTabKey) => {
    setEditSelectedTabs(prev => 
      prev.includes(tabKey) ? prev.filter(t => t !== tabKey) : [...prev, tabKey]
    );
  };

  // Create handler
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    const name = createName.trim();
    if (!name) {
      setCreateError('Role name is required.');
      return;
    }

    const idSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!idSlug) {
      setCreateError('Invalid role name.');
      return;
    }

    if (rolesList.some(r => r.id === idSlug)) {
      setCreateError('A role with this name already exists.');
      return;
    }

    setSavingRole(true);
    try {
      const newRole: RolePermission = {
        id: idSlug,
        name,
        description: createDesc.trim() || `Custom ${name} administrative role`,
        allowedTabs: createSelectedTabs,
        createdAt: new Date().toISOString(),
        isSystem: false
      };

      const ok = await saveRole(newRole);
      if (ok) {
        setShowCreateModal(false);
        setCreateName('');
        setCreateDesc('');
        setCreateSelectedTabs(['users', 'orders', 'products']);
        onRefresh?.();
      } else {
        setCreateError('Failed to save role in database.');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Error saving role.');
    } finally {
      setSavingRole(false);
    }
  };

  // Edit handler
  const startEditRole = (role: RolePermission) => {
    setEditingRole(role);
    setEditName(role.name);
    setEditDesc(role.description || '');
    setEditSelectedTabs([...(role.allowedTabs || [])]);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    setUpdatingRole(true);
    try {
      const updated: RolePermission = {
        ...editingRole,
        name: editName.trim() || editingRole.name,
        description: editDesc.trim(),
        allowedTabs: editSelectedTabs
      };

      const ok = await saveRole(updated);
      if (ok) {
        setEditingRole(null);
        onRefresh?.();
      } else {
        alert('Failed to update role.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating role.');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!deletingRoleId) return;
    try {
      await deleteRole(deletingRoleId);
      setDeletingRoleId(null);
      setDeletingRoleName('');
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert('Failed to delete role.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#5d51e8]/10 text-[#5d51e8] rounded-xl">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Role & Permission Management</h2>
          </div>
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-400 max-w-xl">
            Configure dynamic administrative roles (e.g., Sub Admin) and set granular tab access powers for staff members.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create New Role</span>
        </button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rolesList.map((role) => {
          const isSuperAdmin = role.id === 'admin';

          return (
            <div 
              key={role.id}
              className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 flex flex-col justify-between shadow-md hover:shadow-lg transition-all space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Title + Badge + Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{role.name}</h3>
                      {role.isSystem && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700">
                          System Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-zinc-550 line-clamp-2">
                      {role.description || 'Custom administrative role'}
                    </p>
                  </div>

                  {!isSuperAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditRole(role)}
                        className="p-1.5 text-slate-400 hover:text-[#5d51e8] hover:bg-[#5d51e8]/10 rounded-lg cursor-pointer transition-colors"
                        title="Edit Role Permissions"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingRoleId(role.id);
                            setDeletingRoleName(role.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg cursor-pointer transition-colors"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tab Permissions Badges List */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Permitted Admin Powers ({isSuperAdmin ? 'Full Access' : `${role.allowedTabs?.length || 0} Tabs`})
                  </span>

                  {isSuperAdmin ? (
                    <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-955/15 border border-emerald-200/50 dark:border-emerald-900/40 rounded-xl flex items-center gap-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Full Access to All Admin Tabs & Settings</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_ADMIN_TABS.map((tab) => {
                        const hasAccess = role.allowedTabs?.includes(tab.key);
                        const IconComponent = tab.icon;

                        return (
                          <div
                            key={tab.key}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                              hasAccess
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/30 text-[#5d51e8] dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-900/40'
                                : 'bg-slate-50/50 dark:bg-zinc-850/40 text-slate-350 dark:text-zinc-650 border-slate-100 dark:border-zinc-850 opacity-40 line-through'
                            }`}
                          >
                            <IconComponent className="w-3 h-3 flex-shrink-0" />
                            <span>{tab.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE ROLE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#5d51e8]/10 text-[#5d51e8] rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Create Custom Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 text-left">
              {createError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl">
                  {createError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sub Admin, Catalog Manager"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Access to User Approvals, Orders, and Catalog"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] block">
                  Select Permitted Admin Tabs ({createSelectedTabs.length} selected)
                </label>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {ALL_ADMIN_TABS.map((tab) => {
                    const isChecked = createSelectedTabs.includes(tab.key);
                    const IconComp = tab.icon;

                    return (
                      <div
                        key={tab.key}
                        onClick={() => toggleCreateTab(tab.key)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-[#5d51e8] text-[#5d51e8] dark:text-indigo-300'
                            : 'bg-slate-50/40 dark:bg-zinc-850/30 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComp className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{tab.label}</p>
                            <p className="text-[10px] font-semibold text-slate-400">{tab.description}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-300 rounded cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={savingRole}>
                  {savingRole ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Save Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#5d51e8]/10 text-[#5d51e8] rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Role: {editingRole.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Role Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] block">
                  Configured Permitted Admin Tabs ({editSelectedTabs.length} selected)
                </label>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {ALL_ADMIN_TABS.map((tab) => {
                    const isChecked = editSelectedTabs.includes(tab.key);
                    const IconComp = tab.icon;

                    return (
                      <div
                        key={tab.key}
                        onClick={() => toggleEditTab(tab.key)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-[#5d51e8] text-[#5d51e8] dark:text-indigo-300'
                            : 'bg-slate-50/40 dark:bg-zinc-850/30 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComp className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{tab.label}</p>
                            <p className="text-[10px] font-semibold text-slate-400">{tab.description}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-300 rounded cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <Button type="button" variant="secondary" onClick={() => setEditingRole(null)}>Cancel</Button>
                <Button type="submit" disabled={updatingRole}>
                  {updatingRole ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Update Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingRoleId)}
        title="Delete Custom Role"
        message={`Are you sure you want to delete the role "${deletingRoleName}"? Users assigned to this role may lose their custom administrative tab powers.`}
        confirmText="Delete Role"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeletingRoleId(null);
          setDeletingRoleName('');
        }}
      />
    </div>
  );
}
