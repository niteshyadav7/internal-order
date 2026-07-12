'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../components/ui/Toast';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/check');
        const data = await res.json();
        if (data.authenticated) {
          router.push('/admin');
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };
    checkSession();
  }, [router]);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both adminname and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (auth) {
          try {
            await signInWithEmailAndPassword(auth, email, password);
          } catch (firebaseErr: any) {
            console.warn('Firebase Auth admin sign-in failed, trying to auto-create user:', firebaseErr);
            if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/invalid-credential') {
              try {
                await createUserWithEmailAndPassword(auth, email, password);
              } catch (createErr) {
                console.error('Failed to auto-create admin in Firebase Auth:', createErr);
              }
            }
          }
        }
        showToast('Successfully authenticated as administrator.', 'success');
        router.push('/admin');
      } else {
        showToast(data.error || 'Invalid administrator credentials.', 'error');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      showToast('Server connection error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
      {/* Admin Login Box */}
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 sm:p-10 shadow-lg text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Title */}
        <div className="inline-block">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Login
          </h2>
          <div className="w-full h-1 bg-[#1c2c80] dark:bg-indigo-500 mt-2"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          
          {/* Adminname Input */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-zinc-800 py-1.5 focus-within:border-[#1c2c80] dark:focus-within:border-indigo-500 transition-colors">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="Adminname"
              className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 font-semibold text-sm outline-none border-none py-1 px-1"
            />
          </div>

          {/* Password Input */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-zinc-800 py-1.5 focus-within:border-[#1c2c80] dark:focus-within:border-indigo-500 transition-colors">
            <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Password"
              className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 font-semibold text-sm outline-none border-none py-1 px-1"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 focus:outline-none flex-shrink-0 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1c2c80] hover:bg-[#152060] dark:bg-indigo-650 dark:hover:bg-indigo-700 text-white font-bold text-sm py-3 px-6 rounded-md shadow-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            <span>Sign In</span>
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => router.push('/login')}
            className="text-xs font-bold text-slate-400 hover:text-[#1c2c80] dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            Go to Customer Login
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
