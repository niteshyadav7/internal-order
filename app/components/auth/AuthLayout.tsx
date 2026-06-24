'use client';

import React from 'react';
import Image from 'next/image';
import { LangType } from '../../lib/translations';

interface AuthLayoutProps {
  children: React.ReactNode;
  lang: LangType;
  setLang: (lang: LangType) => void;
  t: (key: any) => string;
}

export default function AuthLayout({
  children,
  lang,
  setLang,
  t
}: AuthLayoutProps) {
  return (
    <div className="w-full min-h-screen md:h-screen md:max-h-screen overflow-y-auto md:overflow-hidden flex flex-col md:flex-row bg-white dark:bg-zinc-950">
      


      {/* Left Column (Forms & Auth) */}
      <div className="w-full md:w-1/2 min-h-screen md:h-full flex flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-12 bg-white dark:bg-zinc-950 overflow-y-auto md:overflow-y-hidden">
        {/* Top Bar / Brand */}
        <div className="flex justify-center items-center w-full pt-2">
          <div className="flex flex-col items-center gap-2.5">
            <div className="bg-[#5d51e8] p-3 rounded-2xl text-white shadow-lg shadow-[#5d51e8]/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
              {t('brandName')}
            </span>
          </div>
        </div>

        {/* Auth form center content */}
        <div className="max-w-md w-full mx-auto my-auto py-3">
          {children}
        </div>

        {/* Bottom Footer */}
        <div className="w-full text-center mt-auto pt-4">
          <p className="text-[10px] text-slate-400 font-bold">
            {t('copyrightText')}
          </p>
        </div>
      </div>

      {/* Right Column (Marketing Sidebar) */}
      <div className="hidden md:flex md:w-1/2 h-full bg-[#5d51e8] p-8 sm:p-12 lg:p-16 flex-col justify-center items-center relative overflow-hidden">
        {/* Elegant wavy background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,50 Q25,70 50,50 T100,50 L100,100 L0,100 Z" fill="currentColor" className="text-white" />
            <path d="M0,60 Q30,40 60,60 T100,60 L100,100 L0,100 Z" fill="currentColor" className="text-white" />
          </svg>
        </div>

        {/* Main Rounded Box */}
        <div className="w-full max-w-lg bg-[#857cf8] rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between relative shadow-2xl overflow-visible border border-white/10">
          {/* Text Header */}
          <div className="space-y-3 text-white text-left">
            <h3 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              {t('marketingTitle')}
            </h3>
            <p className="text-xl lg:text-2xl font-black text-indigo-100">
              {t('marketingSubtitle')}
            </p>
          </div>

          {/* Character Image */}
          <div className="mt-8 relative flex justify-center items-end overflow-visible">
            <Image
              src="/images/login_professional.png"
              alt="Professional Manager"
              width={320}
              height={320}
              priority
              className="w-full max-w-[280px] lg:max-w-[320px] object-contain rounded-2xl drop-shadow-2xl"
            />

            {/* Floating Handshake badge */}
            <div className="absolute -left-6 bottom-10 bg-white dark:bg-zinc-900 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-3xl border border-slate-100 dark:border-zinc-800 transition-transform hover:scale-115 cursor-default select-none animate-bounce" style={{ animationDuration: '3s' }}>
              🤝
            </div>

            {/* Floating 100 badge */}
            <div className="absolute -right-6 top-1/3 bg-white dark:bg-zinc-900 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl border border-slate-100 dark:border-zinc-800 transition-transform hover:scale-115 cursor-default select-none animate-pulse">
              💯
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
