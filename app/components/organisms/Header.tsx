import React from 'react';
import { Menu, LogOut, Bell } from 'lucide-react';

interface HeaderProps {
  activeTab: 'users' | 'orders' | 'products' | 'fields' | 'notifications';
  onMenuClick: () => void;
  onLogout: () => void;
  onNotificationClick?: () => void;
  unreadCount?: number;
}

export default function Header({
  activeTab,
  onMenuClick,
  onLogout,
  onNotificationClick,
  unreadCount = 0
}: HeaderProps) {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'fields': return 'Profile Settings';
      case 'users': return 'User Approvals';
      case 'orders': return 'Order Requests';
      case 'products': return 'Manage Catalog';
      case 'notifications': return 'Notifications';
      default: return 'Admin Portal';
    }
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onMenuClick}
            className="p-2 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Admin Portal</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNotificationClick}
            className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full flex items-center justify-center cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-zinc-900 shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            type="button"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 rounded-full cursor-pointer flex items-center justify-center"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex h-16 bg-white dark:bg-zinc-900 border-b border-slate-150 dark:border-zinc-800/80 items-center justify-between px-8 shadow-sm flex-shrink-0 text-slate-800 dark:text-white">
        <h2 className="font-extrabold text-base text-slate-900 dark:text-white capitalize">
          {getTabTitle(activeTab)}
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNotificationClick}
            className="relative p-2 text-slate-500 hover:text-slate-750 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-zinc-850 rounded-full transition-all cursor-pointer flex items-center justify-center border border-slate-200/50 dark:border-zinc-800"
            title="Notifications Feed"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-zinc-900 shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>
    </>
  );
}
