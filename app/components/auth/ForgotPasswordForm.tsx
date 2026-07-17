'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { translations } from '../../lib/translations';

interface ForgotPasswordFormProps {
  onLoginClick: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  t: (key: keyof typeof translations['en']) => string;
}

export default function ForgotPasswordForm({
  onLoginClick,
  showToast,
  t
}: ForgotPasswordFormProps) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const validate = () => {
    const tempErrors: typeof errors = {};
    if (!email) {
      tempErrors.email = t('emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = t('emailInvalid');
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await sendPasswordReset(email);
      showToast(t('resetLinkSent'), 'success');
      setEmail('');
    } catch (err: any) {
      console.error(err);
      let errMsg = t('errorOccurred');
      if (err.code === 'auth/user-not-found') {
        errMsg = "No user found with this email.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "Invalid email format.";
      }
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-1 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
          {t('forgotPasswordTitle')} <span className="text-[#5d51e8]">🔑</span>
        </h2>
        <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t('forgotPasswordSubtitle')}
        </p>
      </div>

      <form onSubmit={handleResetSubmit} className="space-y-3 pt-2">
        <div className="space-y-1 text-left">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="example@balajitextiles.com"
            className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
          />
          {errors.email && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.email}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-sm py-3 px-6 rounded-full shadow-md shadow-[#5d51e8]/20 transition-all active:scale-95 text-center mt-4 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          <span>{t('sendResetLinkBtn')}</span>
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          onClick={onLoginClick}
          className="text-xs font-bold text-slate-500 hover:text-[#5d51e8] transition-colors cursor-pointer"
        >
          {t('backToLogin')}
        </button>
      </div>
    </div>
  );
}
