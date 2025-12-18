'use client';

import * as React from 'react';
import { Heart, CalendarDays, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useCaseStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onHelpClick?: () => void;
}

export function Header({ onHelpClick }: HeaderProps) {
  const selectedYear = useCaseStore((state) => state.selectedYear);
  const setYear = useCaseStore((state) => state.setYear);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900">
              Vascular CPT Assistant
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 hidden xs:block">
              Code search, wRVU calculator & op-note generator
            </p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Year Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 sm:gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400 hidden sm:block" />
                <div className="flex rounded-lg border border-slate-200 p-0.5 sm:p-1 bg-slate-50">
                  <button
                    className={cn(
                      "px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all",
                      selectedYear === 2025
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                    onClick={() => setYear(2025)}
                    aria-pressed={selectedYear === 2025}
                    aria-label="Use 2025 wRVU values"
                  >
                    2025
                  </button>
                  <button
                    className={cn(
                      "px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all",
                      selectedYear === 2026
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                    onClick={() => setYear(2026)}
                    aria-pressed={selectedYear === 2026}
                    aria-label="Use 2026 wRVU values"
                  >
                    2026
                  </button>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] mx-0.5">1</kbd> or <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] mx-0.5">2</kbd> to switch</p>
            </TooltipContent>
          </Tooltip>

          {/* Help Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-500 px-2 sm:px-3"
                onClick={onHelpClick}
                aria-label="Show keyboard shortcuts"
              >
                <Keyboard className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Shortcuts</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] mx-0.5">?</kbd> to show</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
