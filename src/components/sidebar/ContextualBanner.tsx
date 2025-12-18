'use client';

import * as React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContextualBanner as BannerType } from '@/lib/popupEngine';

interface ContextualBannerProps {
  banner: BannerType;
  onDismiss?: () => void;
}

export function ContextualBanner({ banner, onDismiss }: ContextualBannerProps) {
  const Icon = banner.type === 'error' 
    ? AlertCircle 
    : banner.type === 'warning' 
      ? AlertTriangle 
      : Info;
  
  const colorClasses = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconColorClasses = {
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-3 mb-2 transition-all',
        colorClasses[banner.type]
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', iconColorClasses[banner.type])} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{banner.message}</p>
          {banner.detail && (
            <p className="text-xs mt-0.5 opacity-80">{banner.detail}</p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface ContextualBannersProps {
  banners: BannerType[];
}

export function ContextualBanners({ banners }: ContextualBannersProps) {
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  if (banners.length === 0) return null;

  const visibleBanners = banners.filter(b => !dismissedIds.has(b.id));

  if (visibleBanners.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="space-y-2 mb-4">
      {visibleBanners.map((banner) => (
        <ContextualBanner
          key={banner.id}
          banner={banner}
          onDismiss={() => handleDismiss(banner.id)}
        />
      ))}
    </div>
  );
}
