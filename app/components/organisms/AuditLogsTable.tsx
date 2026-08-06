import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  ToggleRight, 
  Upload, 
  PackageX, 
  User, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Tag, 
  Filter 
} from 'lucide-react';
import { ActivityLog } from '../../lib/db';
import SearchInput from '../molecules/SearchInput';
import Pagination from '../molecules/Pagination';
import Loader from '../atoms/Loader';

interface AuditLogsTableProps {
  logs: ActivityLog[];
  loading: boolean;
}

export default function AuditLogsTable({ logs, loading }: AuditLogsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (actionFilter !== 'all') {
      result = result.filter(log => log.action === actionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(log =>
        log.performerName.toLowerCase().includes(q) ||
        log.performerEmail.toLowerCase().includes(q) ||
        (log.performerRole && log.performerRole.toLowerCase().includes(q)) ||
        (log.targetProductName && log.targetProductName.toLowerCase().includes(q)) ||
        (log.targetProductId && log.targetProductId.toLowerCase().includes(q)) ||
        log.details.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, searchQuery, actionFilter]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const getActionBadge = (action: ActivityLog['action']) => {
    switch (action) {
      case 'CREATE_PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
            <PlusCircle className="w-3 h-3" />
            Product Added
          </span>
        );
      case 'UPDATE_PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/50">
            <Edit2 className="w-3 h-3" />
            Product Edited
          </span>
        );
      case 'DELETE_PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50">
            <Trash2 className="w-3 h-3" />
            Product Deleted
          </span>
        );
      case 'BATCH_DELETE_PRODUCTS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <PackageX className="w-3 h-3" />
            Batch Deleted
          </span>
        );
      case 'TOGGLE_STOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">
            <ToggleRight className="w-3 h-3" />
            Stock Toggled
          </span>
        );
      case 'BULK_IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/50">
            <Upload className="w-3 h-3" />
            Bulk Import
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700">
            {action}
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      };
    } catch (e) {
      return { date: isoString, time: '' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-md overflow-hidden flex flex-col justify-between min-h-[500px]">
        <div>
          {/* Header Bar */}
          <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#5d51e8]/10 text-[#5d51e8] rounded-2xl">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Product Activity & Audit Logs</h2>
                <p className="text-xs text-slate-400 font-bold">Trace all additions, edits, deletions & stock changes</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Action Filter */}
              <div className="relative flex items-center">
                <Filter className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <select
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 outline-none focus:border-[#5d51e8] cursor-pointer"
                >
                  <option value="all">All Actions</option>
                  <option value="CREATE_PRODUCT">Product Added</option>
                  <option value="UPDATE_PRODUCT">Product Edited</option>
                  <option value="DELETE_PRODUCT">Product Deleted</option>
                  <option value="BATCH_DELETE_PRODUCTS">Batch Deleted</option>
                  <option value="TOGGLE_STOCK">Stock Toggled</option>
                  <option value="BULK_IMPORT">Bulk Import</option>
                </select>
              </div>

              <SearchInput
                placeholder="Search staff name, email, product..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <Loader text="Loading activity logs..." />
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/20 text-slate-400 text-[10px] uppercase font-black tracking-wider select-none">
                        <th className="py-4 px-6">Timestamp</th>
                        <th className="py-4 px-6">Action</th>
                        <th className="py-4 px-6">Performer (User & Credentials)</th>
                        <th className="py-4 px-6">Target Product</th>
                        <th className="py-4 px-6">Details / Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <History className="w-8 h-8 text-slate-300 dark:text-zinc-700 stroke-1" />
                              <p className="font-bold text-sm text-slate-500">
                                {logs.length === 0 
                                  ? "No product activity logs recorded yet. Changes will appear here automatically!"
                                  : "No activity logs match your search or filter criteria."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => {
                          const { date, time } = formatDate(log.timestamp);
                          return (
                            <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/20 transition-colors">
                              {/* Date & Time */}
                              <td className="py-4 px-6 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[#5d51e8]" />
                                    {date}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {time}
                                  </span>
                                </div>
                              </td>

                              {/* Action Badge */}
                              <td className="py-4 px-6 whitespace-nowrap">
                                {getActionBadge(log.action)}
                              </td>

                              {/* Performer Credentials */}
                              <td className="py-4 px-6">
                                <div>
                                  <div className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{log.performerName || 'Unknown User'}</span>
                                    {log.performerRole && (
                                      <span className="inline-block bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-slate-200/60 dark:border-zinc-700">
                                        {log.performerRole}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-0.5 truncate max-w-xs">
                                    {log.performerEmail}
                                  </div>
                                </div>
                              </td>

                              {/* Target Product */}
                              <td className="py-4 px-6">
                                <div>
                                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                                    {log.targetProductName || 'N/A'}
                                  </span>
                                  {log.targetProductId && (
                                    <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500">
                                      ID: {log.targetProductId}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Details */}
                              <td className="py-4 px-6">
                                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 max-w-md line-clamp-2">
                                  {log.details}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                {paginatedLogs.length > 0 && (
                  <div className="block md:hidden p-4 space-y-3 bg-slate-50/30 dark:bg-zinc-955/10">
                    {paginatedLogs.map((log) => {
                      const { date, time } = formatDate(log.timestamp);
                      return (
                        <div key={log.id} className="p-4 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 rounded-2xl space-y-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            {getActionBadge(log.action)}
                            <span className="text-[10px] font-extrabold text-slate-400">
                              {date} • {time}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                              {log.targetProductName ? `Product: ${log.targetProductName}` : 'Catalog Action'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">
                              {log.details}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-extrabold">
                              <User className="w-3 h-3 text-[#5d51e8]" />
                              {log.performerName} ({log.performerRole || 'User'})
                            </span>
                            <span className="truncate max-w-[150px]">{log.performerEmail}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
