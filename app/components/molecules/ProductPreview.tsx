import React from 'react';
import { transformImageUrl } from '../../lib/image';

interface ProductPreviewProps {
  imageUrl?: string;
  name: string;
  category: string;
  className?: string;
}

export default function ProductPreview({
  imageUrl,
  name,
  category,
  className = "w-10 h-10"
}: ProductPreviewProps) {
  const transformedUrl = imageUrl ? transformImageUrl(imageUrl) : '';
  const isWebLink = transformedUrl.startsWith('http') || transformedUrl.startsWith('https') || transformedUrl.startsWith('data:image/');

  const getGradientClass = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'electronics': return 'from-indigo-500 to-blue-500';
      case 'fashion': return 'from-rose-500 to-pink-500';
      case 'home & kitchen': return 'from-amber-500 to-orange-500';
      case 'beauty & care': return 'from-emerald-500 to-teal-500';
      case 'furniture & decor': return 'from-purple-500 to-violet-500';
      case 'fitness': return 'from-cyan-500 to-sky-500';
      default: return 'from-slate-500 to-slate-700';
    }
  };

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-150 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 flex items-center justify-center mx-auto shadow-sm flex-shrink-0 ${className}`}>
      {isWebLink ? (
        <img
          src={transformedUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${getGradientClass(category)}`} />
      )}
    </div>
  );
}
