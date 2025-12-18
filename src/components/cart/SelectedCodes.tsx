'use client';

import * as React from 'react';
import { ShoppingCart, Trash2, FileText, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useCaseStore } from '@/lib/store';
import { formatWRVU } from '@/lib/utils';
import { CodeCard } from './CodeCard';
import { ContextualAlerts } from './ContextualAlerts';
import { OpNoteModal } from '@/components/opnote/OpNoteModal';

interface SelectedCodesProps {
  opNoteButtonRef?: React.RefObject<HTMLButtonElement>;
  onSidebarAction?: (tab: string) => void;
}

export function SelectedCodes({ opNoteButtonRef, onSidebarAction }: SelectedCodesProps) {
  const selectedCodes = useCaseStore((state) => state.selectedCodes);
  const selectedYear = useCaseStore((state) => state.selectedYear);
  const clearAll = useCaseStore((state) => state.clearAll);
  const getTotalWRVU = useCaseStore((state) => state.getTotalWRVU);

  const [isOpNoteOpen, setIsOpNoteOpen] = React.useState(false);
  const internalButtonRef = React.useRef<HTMLButtonElement>(null);
  
  // Use external ref if provided, otherwise use internal
  const buttonRef = opNoteButtonRef || internalButtonRef;

  const totalWRVU = getTotalWRVU();

  return (
    <>
      <Card className="bg-white border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <span>Selected Codes</span>
              {selectedCodes.length > 0 && (
                <span className="bg-blue-600 text-white text-xs sm:text-sm font-medium px-2 py-0.5 rounded-full">
                  {selectedCodes.length}
                </span>
              )}
            </CardTitle>
            {selectedCodes.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    onClick={clearAll}
                    aria-label="Clear all selected codes"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Clear All</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">Ctrl+Shift+C</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-6">
          {selectedCodes.length === 0 ? (
            <div className="text-center py-6 sm:py-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-slate-300" />
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-600">No codes selected</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Search and select CPT codes to add them here
              </p>
              <p className="text-xs text-slate-300 mt-3">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">/</kbd> to search
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Code cards */}
              <div className="space-y-2 sm:space-y-3">
                {selectedCodes.map((code, index) => (
                  <div 
                    key={code.code}
                    className="animate-in slide-in-from-left duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CodeCard code={code} />
                  </div>
                ))}
              </div>

              {/* Totals section */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                {/* Total wRVU - Full width now */}
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                      <p className="text-xs sm:text-sm text-blue-600 font-medium">Total wRVU</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700 tabular-nums">
                      {formatWRVU(totalWRVU)}
                    </p>
                  </div>
                </div>
                
                {/* Year indicator */}
                <p className="mt-3 text-[10px] sm:text-xs text-slate-400 text-center">
                  Using {selectedYear} CMS wRVU values
                </p>

                {/* Generate Op-Note button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      ref={buttonRef as React.RefObject<HTMLButtonElement>}
                      className="w-full mt-4 h-11 sm:h-12 text-sm sm:text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
                      size="lg"
                      disabled={selectedCodes.length === 0}
                      onClick={() => setIsOpNoteOpen(true)}
                    >
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Generate Op-Note
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Ctrl+G</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Contextual Alerts - Inline below totals */}
              <ContextualAlerts 
                selectedCodes={selectedCodes}
                onSidebarAction={onSidebarAction}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Op-Note Modal */}
      <OpNoteModal
        isOpen={isOpNoteOpen}
        onClose={() => setIsOpNoteOpen(false)}
        selectedCodes={selectedCodes}
      />
    </>
  );
}
