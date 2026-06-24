'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { translations } from '../../lib/translations';
import ConfirmModal from '../ui/ConfirmModal';

interface PendingApprovalViewProps {
  status: 'pending' | 'rejected';
  t: (key: keyof typeof translations['en']) => string;
}

export default function PendingApprovalView({
  status,
  t
}: PendingApprovalViewProps) {
  const { user, profileName, logout } = useAuth();
  const helpPhoneNumber = "+919876543210"; // Sample support number
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleSignOutClick = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = async () => {
    setShowSignOutModal(false);
    try {
      await logout();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const titleKey = status === 'rejected' ? 'rejectedTitle' : 'pendingTitle';
  const subKey = status === 'rejected' ? 'rejectedSub' : 'pendingSub';

  const headingText = t(titleKey);
  // Replace {name} placeholder in translations
  const subText = t(subKey).replace('{name}', profileName || user?.displayName || user?.email || 'User');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center px-4 py-16 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl max-w-md w-full text-center space-y-6">
        
        {/* Animated Icon Banner */}
        {status === 'rejected' ? (
          <div className="bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/50">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        ) : (
          <div className="bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/50 animate-pulse">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {headingText}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            {subText}
          </p>
        </div>

        {/* User profile card */}
        <div className="bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl text-xs space-y-1 font-bold text-slate-500">
          <div>{t('contactText')}:</div>
          <div className="text-slate-900 dark:text-white font-extrabold">{user?.email}</div>
        </div>

        {/* Support CTA Call */}
        <a
          href={`tel:${helpPhoneNumber}`}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base py-4 px-6 rounded-full transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>{t('callAdminBtn')}</span>
        </a>

        {/* Sign Out Trigger */}
        <button
          onClick={handleSignOutClick}
          className="w-full text-slate-400 hover:text-[#5d51e8] font-bold text-xs hover:underline cursor-pointer"
        >
          Sign Out / Switch Account
        </button>
      </div>
      
      {/* Confirm Sign Out Modal */}
      <ConfirmModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleConfirmSignOut}
        title="Sign Out / लॉग आउट"
        message="Are you sure you want to sign out? / क्या आप वाकई लॉग आउट करना चाहते हैं?"
        confirmText="Sign Out / लॉग आउट"
        cancelText="Cancel / रद्द करें"
      />
    </div>
  );
}
