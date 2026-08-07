import React from 'react';
import { Loader2 } from 'lucide-react';
import { UserProfile, ProfileField, RolePermission, DEFAULT_SYSTEM_ROLES } from '../../lib/db';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  name: string;
  onNameChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  customDetails: Record<string, string>;
  onCustomDetailChange: (key: string, value: string) => void;
  fieldsList: ProfileField[];
  role: string;
  onRoleChange: (val: string) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  rolesList?: RolePermission[];
}

export default function UserEditModal({
  isOpen,
  onClose,
  user,
  name,
  onNameChange,
  email,
  onEmailChange,
  customDetails,
  onCustomDetailChange,
  fieldsList,
  role,
  onRoleChange,
  onSave,
  saving,
  rolesList = DEFAULT_SYSTEM_ROLES
}: UserEditModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-left cursor-default max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Edit User Profile</h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500">Update registration details & role permission.</p>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-405">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-405">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-405">User Role</label>
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 capitalize"
            >
              {rolesList.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
              ))}
            </select>
          </div>

          {/* Dynamic Registration Fields */}
          {fieldsList.length > 0 && (
            <div className="border-t border-slate-100 dark:border-zinc-800/85 pt-3 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dynamic Fields</h4>
              
              {fieldsList.map((field) => {
                const fieldId = field.id || '';
                return (
                  <div key={fieldId} className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-405">
                      {field.labelEn} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      value={customDetails[fieldId] || ''}
                      onChange={(e) => onCustomDetailChange(fieldId, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                    />
                    {field.labelEn.toLowerCase() === 'firm name' && user.requestedFirmName && (
                      <div className="mt-1.5 bg-amber-50/70 dark:bg-amber-955/15 border border-amber-200/50 dark:border-amber-900/35 rounded-xl p-2.5 flex items-center justify-between gap-2 animate-in fade-in duration-200">
                        <div className="text-left">
                          <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">User Requested Change</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-0.5">"{user.requestedFirmName}"</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onCustomDetailChange(fieldId, user.requestedFirmName || '')}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[9px] rounded-lg active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          Apply Change
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-850 dark:text-slate-200 font-extrabold text-xs py-3 px-4 rounded-full border border-slate-200 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-xs py-3 px-4 rounded-full shadow-md shadow-[#5d51e8]/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
