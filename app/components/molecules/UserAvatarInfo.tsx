import React from 'react';

interface UserAvatarInfoProps {
  name: string;
  email: string;
  customDetails?: Record<string, string>;
  getFieldLabel?: (key: string) => string;
}

export default function UserAvatarInfo({
  name,
  email,
  customDetails,
  getFieldLabel = (key) => key
}: UserAvatarInfoProps) {
  const initial = name && name.length > 0 ? name[0].toUpperCase() : '?';

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-slate-150 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-full flex items-center justify-center text-sm flex-shrink-0">
        {initial}
      </div>
      <div>
        <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{name}</div>
        <div className="text-xs font-semibold text-slate-400">{email}</div>
        {customDetails && Object.keys(customDetails).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-xs">
            {Object.entries(customDetails).map(([key, val]) => (
              <span
                key={key}
                className="inline-block bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-355 text-[10px] font-bold px-2 py-0.5 rounded"
              >
                {getFieldLabel(key)}: {val}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
