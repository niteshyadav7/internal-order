import { 
  Shield, 
  Users, 
  UserCog,
  ShoppingBag, 
  Database, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Bell,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'users' | 'staff' | 'orders' | 'products' | 'fields' | 'notifications';
  onTabChange: (tab: 'users' | 'staff' | 'orders' | 'products' | 'fields' | 'notifications') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  unreadCount?: number;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  unreadCount = 0
}: SidebarProps) {
  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-40 bg-[#0b0e14] text-slate-300 border-r border-[#1a1f2c] 
        flex flex-col justify-between transition-all duration-300 shadow-md h-full w-64
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand/Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#161a24]">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 text-white border border-white/5 shadow-sm p-2 rounded-xl flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <div className="animate-in fade-in duration-300">
                  <h1 className="font-extrabold text-sm text-white leading-none">Admin Portal</h1>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Elegance Logistics</p>
                </div>
              )}
            </div>
            
            {/* Mobile close button inside the drawer */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              type="button"
              onClick={() => { onTabChange('users'); onCloseMobile(); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-[#151a26] text-white border border-white/5 shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="User Approvals"
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in duration-300">User Approvals</span>}
            </button>

            <button
              type="button"
              onClick={() => { onTabChange('staff'); onCloseMobile(); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-[#151a26] text-white border border-white/5 shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Staff Management"
            >
              <UserCog className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in duration-300">Staff Management</span>}
            </button>

            <button
              type="button"
              onClick={() => { onTabChange('orders'); onCloseMobile(); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#151a26] text-white border border-white/5 shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Order Requests"
            >
              <ShoppingBag className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in duration-300">Order Requests</span>}
            </button>

            <button
              type="button"
              onClick={() => { onTabChange('products'); onCloseMobile(); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#151a26] text-white border border-white/5 shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Manage Catalog"
            >
              <Database className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in duration-300">Manage Catalog</span>}
            </button>

            <button
              type="button"
              onClick={() => { onTabChange('fields'); onCloseMobile(); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'fields'
                  ? 'bg-[#151a26] text-white border border-white/5 shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Profile Settings"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in duration-300">Profile Settings</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#161a24] space-y-1.5">
          {/* Sign Out Button */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer text-red-400 hover:bg-white/5 hover:text-red-300"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="animate-in fade-in duration-300">Sign Out</span>}
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-450 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                <span className="animate-in fade-in duration-300">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 bg-black/55 z-30 transition-opacity animate-in fade-in duration-200"
        />
      )}
    </>
  );
}
