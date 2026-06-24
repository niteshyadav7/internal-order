'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import PendingApprovalView from './components/auth/PendingApprovalView';
import RegistrationForm from './components/auth/RegistrationForm';
import { getTranslation } from './lib/translations';
import Image from 'next/image';
import ProductCatalog from './components/products/ProductCatalog';

export default function Home() {
  const { user, profileStatus, profileName, userProfile, loading, refreshProfile, logout } = useAuth();
  const router = useRouter();

  // Redirect logic depending on authentication
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-[#5d51e8]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show blank loader while redirecting
  if (!user) {
    return null;
  }

  // If registration is not completed yet, show the onboarding form
  if (userProfile && !userProfile.registrationCompleted) {
    return <RegistrationForm onComplete={refreshProfile} />;
  }

  // If account status is pending or rejected, render the PendingApprovalView instead of homepage
  if (profileStatus === 'pending' || profileStatus === 'rejected') {
    // English t mock wrapper for UI
    const t = (key: any) => getTranslation('en', key);
    return (
      <PendingApprovalView 
        status={profileStatus} 
        t={t}
      />
    );
  }

  return <ProductCatalog />;
}
