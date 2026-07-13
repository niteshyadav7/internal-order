'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { ProfileField } from '../../lib/db';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldsList: ProfileField[];
  onSave: (
    name: string,
    email: string,
    role: 'client' | 'salesman' | 'admin',
    status: 'pending' | 'approved' | 'rejected',
    customDetails: Record<string, string>
  ) => Promise<void>;
  saving: boolean;
}

export default function UserCreateModal({
  isOpen,
  onClose,
  fieldsList,
  onSave,
  saving
}: UserCreateModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'client' | 'salesman' | 'admin'>('client');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [customDetails, setCustomDetails] = useState<Record<string, string>>({});

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setRole('client');
      setStatus('approved');
      setCustomDetails({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCustomDetailChange = (key: string, value: string) => {
    setCustomDetails((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Full Name and Email are required.');
      return;
    }
    await onSave(name, email, role, status, customDetails);
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 max-w-md w-full rounded-3xl sm:rounded-[2.2rem] p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="text-left">
            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">
              Pre-Register User / Salesman
            </h3>
            <p className="text-xs font-semibold text-slate-450 dark:text-zinc-550 mt-1">
              Add account details to approve them in advance
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-full text-slate-400 dark:text-zinc-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-[10px] uppercase font-black text-slate-400">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Singh"
              className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] uppercase font-black text-slate-400">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramesh@example.com"
              className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400">Assign Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
              >
                <option value="client">Client</option>
                <option value="salesman">Salesman</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending Approval</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Dynamic Registration Fields */}
          {fieldsList.length > 0 && (
            <div className="border-t border-slate-100 dark:border-zinc-800/85 pt-3 space-y-4 text-left">
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
                      onChange={(e) => handleCustomDetailChange(fieldId, e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                    />
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
                <span>Add Account</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
