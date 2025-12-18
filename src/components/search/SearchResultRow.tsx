'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { useCaseStore } from '@/lib/store';
import { getWRVU } from '@/lib/database';
import { formatWRVU } from '@/lib/utils';
import type { CodeEntry } from '@/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, Sparkles, Plus } from 'lucide-react';

interface SearchResultRowProps {
  code: CodeEntry;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  id?: string;
}

export function SearchResultRow({
  code,
  isSelected,
  onClick,
  onMouseEnter,
  id,
}: SearchResultRowProps) {
  const selectedYear = useCaseStore((state) => state.selectedYear);
  const wrvu = getWRVU(code, selectedYear);

  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      className={cn(
        "flex items-center justify-between p-2.5 sm:p-3 cursor-pointer transition-all group",
        isSelected 
          ? "bg-blue-50 border-l-2 border-blue-500" 
          : "hover:bg-slate-50 border-l-2 border-transparent"
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div className="flex-1 min-w-0 mr-2 sm:mr-4">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 text-sm sm:text-base">{code.shorthand}</span>
          <span className="text-xs sm:text-sm text-slate-400 font-mono">{code.code}</span>
          {code.is_addon && (
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4">
              <Plus className="h-2.5 w-2.5 mr-0.5" />
              Add-On
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-400 truncate mt-0.5 pr-2">{code.full_name}</p>
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Global period badge */}
        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 h-5 hidden xs:flex">
          {code.global}d
        </Badge>
        
        {/* Status badges */}
        {code.status === 'deleted_2026' && (
          <Badge variant="destructive" className="flex items-center gap-0.5 text-[10px] sm:text-xs px-1.5 h-5">
            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden xs:inline">Del</span> 2026
          </Badge>
        )}
        {code.status === 'new_2026' && (
          <Badge variant="success" className="flex items-center gap-0.5 text-[10px] sm:text-xs px-1.5 h-5">
            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden xs:inline">New</span> 2026
          </Badge>
        )}
        
        {/* wRVU value */}
        <span className="font-mono text-blue-600 font-semibold tabular-nums text-sm sm:text-base min-w-[3rem] sm:min-w-[4rem] text-right">
          {formatWRVU(wrvu)}
        </span>
      </div>
    </div>
  );
}
