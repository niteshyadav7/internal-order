'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ShortProductRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ? decodeURIComponent(params.id) : '';

  useEffect(() => {
    if (id) {
      router.replace(`/product/${encodeURIComponent(id)}`);
    } else {
      router.replace('/');
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#5d51e8] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold">Redirecting to product...</p>
      </div>
    </div>
  );
}
