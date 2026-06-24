'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfileFields, completeUserProfileRegistration, ProfileField } from '../../lib/db';
import { getTranslation, LangType } from '../../lib/translations';
import { Loader2, AlertCircle } from 'lucide-react';

interface RegistrationFormProps {
  onComplete: () => void;
}

export default function RegistrationForm({ onComplete }: RegistrationFormProps) {
  const { user, refreshProfile } = useAuth();
  const [lang, setLang] = useState<LangType>('en');
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [loadingFields, setLoadingFields] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (key: any) => getTranslation(lang, key);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const activeFields = await getProfileFields();
        setFields(activeFields);
        // Initialize values
        const initialValues: Record<string, string> = {};
        activeFields.forEach(f => {
          initialValues[f.id || ''] = '';
        });
        setFormValues(initialValues);
      } catch (err) {
        console.error("Failed to load onboarding fields:", err);
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, []);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    // Validate full name
    if (!fullName.trim()) {
      setError(t('nameRequired'));
      return;
    }

    // Validate dynamic fields
    for (const field of fields) {
      if (field.required && !formValues[field.id || '']?.trim()) {
        setError(t('fillRequiredWarning'));
        return;
      }
    }

    setSubmitting(true);
    try {
      await completeUserProfileRegistration(user.uid, formValues, fullName);
      onComplete();
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || t('errorOccurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 relative font-sans transition-colors duration-300">
      


      {/* Centered Registration Card */}
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200/85 dark:border-zinc-800 rounded-[2.2rem] p-6 sm:p-10 shadow-xl space-y-6 animate-in fade-in duration-300">
        
        {/* Brand & Heading */}
        <div className="text-center space-y-3">
          <div className="inline-flex bg-[#5d51e8]/10 text-[#5d51e8] p-3 rounded-2xl mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-base text-slate-800 dark:text-slate-200 tracking-tight leading-none">
              {t('brandName')}
            </h1>
          </div>
          
          <div className="space-y-1.5 pt-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {t('completeRegistrationTitle')}
            </h2>
            <p className="text-xs font-semibold text-slate-400 dark:text-zinc-505 leading-relaxed">
              {t('completeRegistrationSub')}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-450 p-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loadingFields ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin h-8 w-8 text-[#5d51e8]" />
            <p className="text-xs font-bold text-slate-400">Fetching required form fields...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Full Name field (always required) */}
            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('nameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
              />
            </div>

            {/* Dynamic fields configured from Admin Panel */}
            {fields.map((field) => {
              const label = lang === 'en' ? field.labelEn : field.labelHi;
              const value = formValues[field.id || ''] || '';
              
              return (
                <div key={field.id} className="space-y-1 text-left">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type}
                    required={field.required}
                    value={value}
                    onChange={(e) => handleInputChange(field.id || '', e.target.value)}
                    placeholder={label}
                    className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
                  />
                </div>
              );
            })}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-sm py-3 px-6 rounded-full shadow-md shadow-[#5d51e8]/20 transition-all active:scale-95 text-center mt-5 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && (
                <Loader2 className="animate-spin h-4 w-4 text-white" />
              )}
              <span>{t('submitRegistrationBtn')}</span>
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-[10px] text-slate-400 font-bold">
        {t('copyrightText')}
      </footer>
    </div>
  );
}
