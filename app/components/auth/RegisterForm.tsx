'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { translations } from '../../lib/translations';

interface RegisterFormProps {
  onLoginClick: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  t: (key: keyof typeof translations['en']) => string;
}

export default function RegisterForm({
  onLoginClick,
  showToast,
  t
}: RegisterFormProps) {
  const { signUpWithEmail } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});

  const validate = () => {
    const tempErrors: typeof errors = {};
    if (!name.trim()) {
      tempErrors.name = t('nameRequired');
    }
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
    if (password !== confirmPassword) {
      tempErrors.confirmPassword = t('passwordsDoNotMatch');
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      showToast(t('registrationSuccess'), 'success');
    } catch (err: any) {
      console.error(err);
      let errMsg = t('errorOccurred');
      if (err.code === 'auth/email-already-in-use') {
        errMsg = "Email is already in use.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "Invalid email format.";
      } else if (err.code === 'auth/weak-password') {
        errMsg = "Password is too weak.";
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
          {t('registerTitle')} <span className="text-indigo-500">✨</span>
        </h2>
        <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t('registerSubtitle')}
        </p>
      </div>

      <form onSubmit={handleRegisterSubmit} className="space-y-3 pt-2">
        <div className="space-y-1 text-left">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('nameLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            placeholder="John Doe"
            className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
          />
          {errors.name && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.name}</p>}
        </div>

        <div className="space-y-1 text-left">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="example@logistics.com"
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
            disabled={loading}
            placeholder="Password"
            className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
          />
          {errors.password && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.password}</p>}
        </div>

        <div className="space-y-1 text-left">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('confirmPasswordLabel')}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder="Confirm Password"
            className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-2.5 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
          />
          {errors.confirmPassword && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.confirmPassword}</p>}
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
          <span>{t('registerBtn')}</span>
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          onClick={onLoginClick}
          className="text-xs font-bold text-slate-500 hover:text-[#5d51e8] transition-colors cursor-pointer"
        >
          {t('haveAccount')}
        </button>
      </div>
    </div>
  );
}
