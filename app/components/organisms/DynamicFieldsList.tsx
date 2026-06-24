import React from 'react';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { ProfileField } from '../../lib/db';
import Loader from '../atoms/Loader';

interface DynamicFieldsListProps {
  fieldsList: ProfileField[];
  loading: boolean;
  onDeleteField: (id: string) => void;
  editingFieldId: string | null;
  onStartEdit: (field: ProfileField) => void;
  onCancelEdit: () => void;
  onUpdateField: (e: React.FormEvent) => void;
  editLabel: string;
  onEditLabelChange: (val: string) => void;
  editType: 'text' | 'number' | 'tel';
  onEditTypeChange: (val: 'text' | 'number' | 'tel') => void;
  editRequired: boolean;
  onEditRequiredChange: (val: boolean) => void;
  updatingField: boolean;
}

export default function DynamicFieldsList({
  fieldsList,
  loading,
  onDeleteField,
  editingFieldId,
  onStartEdit,
  onCancelEdit,
  onUpdateField,
  editLabel,
  onEditLabelChange,
  editType,
  onEditTypeChange,
  editRequired,
  onEditRequiredChange,
  updatingField
}: DynamicFieldsListProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-md p-6 space-y-4">
      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Active Registration Questions</h3>
      
      {loading ? (
        <Loader text="Loading custom fields..." />
      ) : fieldsList.length === 0 ? (
        <div className="py-20 text-center text-slate-400 font-bold text-sm">
          No profile fields defined. Default fields will seed on the next user register.
        </div>
      ) : (
        <div className="space-y-3">
          {fieldsList.map((field) => (
            <div 
              key={field.id}
              className="border border-slate-150 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-zinc-900 transition-all hover:shadow-sm"
            >
              {editingFieldId === field.id ? (
                <form onSubmit={onUpdateField} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-400">Label</label>
                    <input
                      type="text"
                      required
                      value={editLabel}
                      onChange={(e) => onEditLabelChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-zinc-800 pt-3">
                    <div className="flex items-center gap-4">
                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase font-black text-slate-400">Type</label>
                        <select
                          value={editType}
                          onChange={(e) => onEditTypeChange(e.target.value as any)}
                          className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800"
                        >
                          <option value="text">Text</option>
                          <option value="tel">Telephone</option>
                          <option value="number">Number</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer mt-4">
                        <input
                          type="checkbox"
                          checked={editRequired}
                          onChange={(e) => onEditRequiredChange(e.target.checked)}
                          className="w-4 h-4 text-[#5d51e8] border-slate-350 rounded focus:ring-[#5d51e8]"
                        />
                        <span className="text-xs font-bold text-slate-650 dark:text-slate-355">Required</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onCancelEdit}
                        className="px-3 py-1.5 border border-slate-200 dark:border-zinc-700 hover:bg-slate-55 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer text-slate-850 dark:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingField}
                        className="px-4.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {updatingField ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Save</span>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">{field.labelEn}</h4>
                      <span className="text-[10px] font-semibold text-slate-400">({field.type})</span>
                      {field.required && (
                        <span className="text-[9px] bg-rose-50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-450 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onStartEdit(field)}
                      className="p-2 text-slate-400 hover:text-[#5d51e8] hover:bg-[#5d51e8]/10 rounded-full transition-all cursor-pointer"
                      title="Edit Question"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteField(field.id || '')}
                      className="p-2 text-slate-400 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-955/25 rounded-full transition-all cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
