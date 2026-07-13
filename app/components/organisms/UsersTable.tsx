import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Edit2, Trash2, Loader2, Plus } from 'lucide-react';
import { UserProfile } from '../../lib/db';
import SearchInput from '../molecules/SearchInput';
import UserAvatarInfo from '../molecules/UserAvatarInfo';
import Loader from '../atoms/Loader';
import Badge from '../atoms/Badge';

interface UsersTableProps {
  users: UserProfile[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedUserUids: string[];
  onSelectAllUsers: (checked: boolean) => void;
  onSelectUser: (uid: string, checked: boolean) => void;
  onStatusUpdate: (uid: string, nextStatus: 'approved' | 'rejected') => void;
  onDeleteUser: (uid: string) => void;
  onEditUser: (user: UserProfile) => void;
  onBatchStatusUpdate: (nextStatus: 'approved' | 'rejected') => void;
  onBatchDelete: () => void;
  onBatchReject: () => void;
  sortField: 'name' | 'createdAt' | 'status';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'name' | 'createdAt' | 'status') => void;
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected';
  roleFilter: 'all' | 'client' | 'salesman' | 'admin';
  onRoleFilterChange: (val: 'all' | 'client' | 'salesman' | 'admin') => void;
  onCreateUserClick: () => void;
  getFieldLabel: (key: string) => string;
  actionLoading: string | null;
}

export default function UsersTable({
  users,
  loading,
  searchQuery,
  onSearchChange,
  selectedUserUids,
  onSelectAllUsers,
  onSelectUser,
  onStatusUpdate,
  onDeleteUser,
  onEditUser,
  onBatchStatusUpdate,
  onBatchDelete,
  onBatchReject,
  sortField,
  sortDirection,
  onSort,
  statusFilter,
  roleFilter,
  onRoleFilterChange,
  onCreateUserClick,
  getFieldLabel,
  actionLoading
}: UsersTableProps) {
  const allSelected = users.length > 0 && selectedUserUids.length === users.length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">User Approvals</h2>
          {statusFilter !== 'all' && (
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/40">
              {statusFilter}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-black outline-none focus:border-[#5d51e8] text-slate-700 dark:text-zinc-300"
          >
            <option value="all">All Roles</option>
            <option value="client">Clients Only</option>
            <option value="salesman">Salesmen Only</option>
            <option value="admin">Admins Only</option>
          </select>
          <SearchInput
            placeholder="Search name, email, details..."
            value={searchQuery}
            onChange={onSearchChange}
          />
          <button
            type="button"
            onClick={onCreateUserClick}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white rounded-xl text-xs font-black shadow-sm active:scale-95 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Batch action operations when rows are selected */}
      {selectedUserUids.length > 0 && (
        <div className="bg-[#5d51e8]/5 dark:bg-[#5d51e8]/10 px-6 py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5d51e8] animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
              <strong>{selectedUserUids.length}</strong> accounts selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedUserUids.some(uid => users.find(u => u.uid === uid)?.status !== 'approved') && (
              <button
                type="button"
                onClick={() => onBatchStatusUpdate('approved')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-sm active:scale-95 cursor-pointer transition-transform"
              >
                Approve Selected
              </button>
            )}
            {selectedUserUids.some(uid => users.find(u => u.uid === uid)?.status !== 'rejected') && (
              <button
                type="button"
                onClick={onBatchReject}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow-sm active:scale-95 cursor-pointer transition-transform"
              >
                Reject Selected
              </button>
            )}
            <button
              type="button"
              onClick={onBatchDelete}
              className="px-3.5 py-1.5 border border-red-200 dark:border-red-900/50 hover:bg-red-55 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg text-xs font-black active:scale-95 cursor-pointer transition-colors"
            >
              Delete Selected
            </button>
            <button
              type="button"
              onClick={() => onSelectAllUsers(false)}
              className="text-xs text-slate-450 hover:text-slate-650 font-bold px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <Loader text="Loading user directories..." />
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-bold text-sm">No users match filter or query.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/20 text-slate-400 text-[10px] uppercase font-black tracking-wider select-none">
                    <th className="py-4 px-6 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => onSelectAllUsers(e.target.checked)}
                        className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-350 rounded cursor-pointer"
                      />
                    </th>
                    <th 
                      onClick={() => onSort('name')}
                      className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 group"
                    >
                      <div className="flex items-center gap-1">
                        <span>User Profile</span>
                        {sortField === 'name' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#5d51e8]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#5d51e8]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => onSort('createdAt')}
                      className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Join Date</span>
                        {sortField === 'createdAt' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#5d51e8]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#5d51e8]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => onSort('status')}
                      className="py-4 px-6 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Approval Status</span>
                        {sortField === 'status' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#5d51e8]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#5d51e8]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                  {users.map((profile) => {
                    const isSelected = selectedUserUids.includes(profile.uid);

                    return (
                      <tr key={profile.uid} className={`hover:bg-slate-55/40 dark:hover:bg-zinc-800/20 transition-colors ${
                        isSelected ? 'bg-indigo-50/25 dark:bg-indigo-950/5' : ''
                      }`}>
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onSelectUser(profile.uid, e.target.checked)}
                            className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-350 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <UserAvatarInfo
                            name={profile.name}
                            email={profile.email}
                            customDetails={profile.customDetails}
                            getFieldLabel={getFieldLabel}
                          />
                          {profile.requestedFirmName && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-955/25 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border border-amber-100 dark:border-amber-900/40 animate-pulse">
                              <span>Request: Change Firm Name to "{profile.requestedFirmName}"</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400">
                          {new Date(profile.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 flex flex-col items-start gap-1.5 justify-center">
                          <Badge status={profile.status} type="user" />
                          {profile.role && profile.role !== 'client' && (
                            <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${
                              profile.role === 'salesman'
                                ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/50'
                                : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/50'
                            }`}>
                              {profile.role}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {actionLoading === profile.uid ? (
                              <Loader2 className="animate-spin h-5 w-5 text-[#5d51e8]" />
                            ) : (
                              <>
                                {profile.status !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => onStatusUpdate(profile.uid, 'approved')}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10 cursor-pointer active:scale-95 transition-all shadow-sm"
                                  >
                                    Approve
                                  </button>
                                )}
                                {profile.status !== 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => onStatusUpdate(profile.uid, 'rejected')}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10 cursor-pointer active:scale-95 transition-all shadow-sm"
                                  >
                                    Reject
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onEditUser(profile)}
                                  className="p-2 text-slate-400 hover:text-[#5d51e8] hover:bg-[#5d51e8]/10 rounded-full transition-all cursor-pointer"
                                  title="Edit User Details"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteUser(profile.uid)}
                                  className="p-2 text-slate-400 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-full transition-all cursor-pointer"
                                  title="Delete Registration"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden p-4 space-y-4 bg-slate-50/30 dark:bg-zinc-955/10">
              {users.map((profile) => {
                const isSelected = selectedUserUids.includes(profile.uid);
                return (
                  <div 
                    key={profile.uid} 
                    className={`p-4 bg-white dark:bg-zinc-900 border rounded-2xl flex flex-col gap-3.5 transition-all shadow-sm ${
                      isSelected 
                        ? 'border-[#5d51e8] ring-1 ring-[#5d51e8]/10' 
                        : 'border-slate-150 dark:border-zinc-800/80'
                    }`}
                  >
                    {/* Header: Checkbox + Status badge + Role badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectUser(profile.uid, e.target.checked)}
                          className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-350 rounded cursor-pointer"
                        />
                        <Badge status={profile.status} type="user" />
                        {profile.role && profile.role !== 'client' && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${
                            profile.role === 'salesman'
                              ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/50'
                              : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/50'
                          }`}>
                            {profile.role}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                        {new Date(profile.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Body: User Details */}
                    <div className="pl-6.5 text-left">
                      <UserAvatarInfo
                        name={profile.name}
                        email={profile.email}
                        customDetails={profile.customDetails}
                        getFieldLabel={getFieldLabel}
                      />
                      {profile.requestedFirmName && (
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-955/25 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border border-amber-100 dark:border-amber-900/40 animate-pulse">
                          <span>Request: Change Firm Name to "{profile.requestedFirmName}"</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Quick Actions */}
                    <div className="pl-6.5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
                      {actionLoading === profile.uid ? (
                        <Loader2 className="animate-spin h-5 w-5 text-[#5d51e8]" />
                      ) : (
                        <>
                          {profile.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => onStatusUpdate(profile.uid, 'approved')}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer active:scale-95 transition-all"
                            >
                              Approve
                            </button>
                          )}
                          {profile.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => onStatusUpdate(profile.uid, 'rejected')}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer active:scale-95 transition-all"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditUser(profile)}
                            className="p-1.5 text-slate-400 hover:text-[#5d51e8] hover:bg-[#5d51e8]/10 rounded-lg cursor-pointer"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteUser(profile.uid)}
                            className="p-1.5 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg cursor-pointer"
                            title="Delete Registration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
