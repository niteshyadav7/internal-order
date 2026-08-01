'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast, { ToastType } from '../../components/ui/Toast';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Balaji Textiles Admin - Login';
  }, []);

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

  const handleGoogleSignIn = async () => {
    if (!auth) {
      showToast('Firebase Auth is not initialized.', 'error');
      return;
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Successfully authenticated as administrator.', 'success');
        router.push('/admin');
      } else {
        showToast(data.error || 'Access denied: Administrator role required.', 'error');
      }
    } catch (err: any) {
      console.error('Google Admin Sign In error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast(err.message || 'Google Sign-In failed.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both adminname and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      let idToken = '';
      if (auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          idToken = await userCredential.user.getIdToken();
        } catch (firebaseErr: any) {
          console.warn('Firebase Auth admin sign-in failed, trying to auto-create user:', firebaseErr);
          if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/invalid-credential') {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              idToken = await userCredential.user.getIdToken();
            } catch (createErr: any) {
              console.error('Failed to auto-create admin in Firebase Auth:', createErr);
              if (createErr.code === 'auth/email-already-in-use') {
                showToast('Email already in use with a different password. Please enter the correct Firebase Auth password or click Reset Password below.', 'error');
                setLoading(false);
                return;
              } else {
                showToast(`Firebase registration error: ${createErr.message || createErr.code}`, 'error');
                setLoading(false);
                return;
              }
            }
          } else {
            showToast(`Firebase authentication error: ${firebaseErr.message || firebaseErr.code}`, 'error');
            setLoading(false);
            return;
          }
        }
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, idToken })
      });

      const data = await res.json();
      if (res.ok && data.success) {
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
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 sm:p-10 shadow-lg text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Title */}
        <div className="inline-block">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Admin Login
          </h2>
          <div className="w-full h-1 bg-[#1c2c80] dark:bg-indigo-500 mt-2"></div>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-slate-200 font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div className="relative flex items-center my-2">
          <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-black uppercase text-slate-400">or use password</span>
          <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          {/* Adminname Input */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-zinc-800 py-1.5 focus-within:border-[#1c2c80] dark:focus-within:border-indigo-500 transition-colors">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="Email address"
              className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-400 font-semibold text-sm outline-none border-none py-1 px-1"
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
              className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-400 font-semibold text-sm outline-none border-none py-1 px-1"
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
            className="w-full bg-[#1c2c80] hover:bg-[#152060] dark:bg-indigo-650 dark:hover:bg-indigo-700 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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

        <div className="flex flex-col items-center gap-2 pt-2 text-center">
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
