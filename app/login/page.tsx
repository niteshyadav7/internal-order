'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import Toast, { ToastType } from '../components/ui/Toast';
import { getTranslation, LangType } from '../lib/translations';

type AuthView = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<AuthView>('LOGIN');
  const [lang, setLang] = useState<LangType>('en');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Dynamic window/tab title
  useEffect(() => {
    const viewTitles: Record<AuthView, string> = {
      LOGIN: 'Balaji Textiles - Login',
      REGISTER: 'Balaji Textiles - Registration',
      FORGOT_PASSWORD: 'Balaji Textiles - Forgot Password'
    };
    document.title = viewTitles[view] || 'Balaji Textiles - Sign In';
  }, [view]);

  // Redirect if logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const t = (key: any) => getTranslation(lang, key);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-[#5d51e8]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If already logged in, show a blank loader while redirecting
  if (user) {
    return null;
  }

  return (
    <>
      <AuthLayout lang={lang} setLang={setLang} t={t}>
        {view === 'LOGIN' && (
          <LoginForm
            onRegisterClick={() => setView('REGISTER')}
            onForgotPasswordClick={() => setView('FORGOT_PASSWORD')}
            showToast={showToast}
            t={t}
          />
        )}
        {view === 'REGISTER' && (
          <RegisterForm
            onLoginClick={() => setView('LOGIN')}
            showToast={showToast}
            t={t}
          />
        )}
        {view === 'FORGOT_PASSWORD' && (
          <ForgotPasswordForm
            onLoginClick={() => setView('LOGIN')}
            showToast={showToast}
            t={t}
          />
        )}
      </AuthLayout>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
