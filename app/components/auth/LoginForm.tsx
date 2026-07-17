'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { translations } from '../../lib/translations';

interface LoginFormProps {
  onRegisterClick: () => void;
  onForgotPasswordClick: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  t: (key: keyof typeof translations['en']) => string;
}

export default function LoginForm({
  onRegisterClick,
  onForgotPasswordClick,
  showToast,
  t
}: LoginFormProps) {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showEmailForm, setShowEmailForm] = useState(false);

  const validate = () => {
    const tempErrors: { email?: string; password?: string } = {};
    if (!email) {
      tempErrors.email = t('emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = t('emailInvalid');
    }
    if (!password) {
      tempErrors.password = t('passwordRequired');
    } else if (password.length < 6) {
      tempErrors.password = t('passwordMinLength');
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      showToast(t('emailLoginSuccess'), 'success');
    } catch (err: any) {
      console.error(err);
      let errMsg = t('errorOccurred');
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errMsg = "Invalid email or password.";
      }
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      showToast(t('googleLoginSuccess'), 'success');
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast(err.message || t('errorOccurred'), 'error');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-1 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
          {t('loginTitle')} <span className="text-amber-500">✌</span>
        </h2>
        <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t('loginSubtitle')}
        </p>
      </div>

      {/* Google Login Button */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={handleGoogleSubmit}
          disabled={loading || googleLoading}
          className="w-full bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-full border border-slate-200 dark:border-zinc-800 shadow-sm transition-all duration-200 active:scale-98 flex items-center justify-center gap-3 hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
          )}
          <span>{t('signInWithGoogle')}</span>
        </button>
      </div>

      {/* Divider / Toggle Email Login */}
      <div className="relative flex items-center justify-center my-3">
        <div className="border-t border-slate-200 dark:border-zinc-800 w-full"></div>
        <button
          type="button"
          onClick={() => setShowEmailForm(!showEmailForm)}
          className="absolute bg-white dark:bg-zinc-950 px-4 text-xs font-extrabold text-slate-500 hover:text-[#5d51e8] dark:hover:text-indigo-400 cursor-pointer select-none transition-colors duration-200 flex items-center gap-1.5"
        >
          {showEmailForm ? 'Hide Email Options' : t('signInWithEmail')}
          <span className="text-[10px] transform transition-transform duration-200">
            {showEmailForm ? '▲' : '▼'}
          </span>
        </button>
      </div>

      {/* Credentials Form (Collapsible) */}
      {showEmailForm && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || googleLoading}
                placeholder="example@balajitextiles.com"
                className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
              />
              {errors.email && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.email}</p>}
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('passwordLabel')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || googleLoading}
                placeholder={t('passwordLabel')}
                className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
              />
              {errors.password && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.password}</p>}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-xs font-extrabold text-[#5d51e8] hover:underline cursor-pointer"
              >
                {t('forgotPasswordBtn')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-sm py-3 px-6 rounded-full shadow-md shadow-[#5d51e8]/20 transition-all active:scale-95 text-center mt-1 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{t('loginBtn')}</span>
            </button>
          </form>
        </div>
      )}

      <div className="text-center pt-2">
        <button
          onClick={onRegisterClick}
          className="text-xs font-bold text-slate-500 hover:text-[#5d51e8] transition-colors cursor-pointer"
        >
          {t('noAccount')}
        </button>
      </div>
    </div>
  );
}
