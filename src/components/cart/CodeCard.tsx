'use client';

import * as React from 'react';
import { X, Plus, AlertTriangle, Sparkles, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCaseStore } from '@/lib/store';
import { getWRVU, getCodeByNumber } from '@/lib/database';
import { formatWRVU } from '@/lib/utils';
import type { CodeEntry, CodeSpecificTip } from '@/types';
import popupConfig from '@/data/popup_trigger_config.json';

interface CodeCardProps {
  code: CodeEntry;
}

export function CodeCard({ code }: CodeCardProps) {
  const selectedYear = useCaseStore((state) => state.selectedYear);
  const removeCode = useCaseStore((state) => state.removeCode);
  const addCode = useCaseStore((state) => state.addCode);
  const selectedCodes = useCaseStore((state) => state.selectedCodes);
  
  const wrvu = getWRVU(code, selectedYear);
  
  // Get code-specific tips from config
  const config = popupConfig as { code_specific_tips: Record<string, CodeSpecificTip> };
  const tip = config.code_specific_tips[code.code];
  
  // Get related codes that aren't already selected
  const relatedCodes = React.useMemo(() => {
    if (!tip?.related_codes) return [];
    return tip.related_codes
      .filter(relCode => !selectedCodes.some(sc => sc.code === relCode))
      .map(relCode => getCodeByNumber(relCode))
      .filter((c): c is CodeEntry => c !== undefined);
  }, [tip, selectedCodes]);

  const handleAddRelated = (relatedCode: CodeEntry) => {
    addCode(relatedCode);
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-slate-500">{code.code}</span>
              <span className="font-semibold text-slate-900">{code.shorthand}</span>
              {code.is_addon && (
                <Badge variant="secondary" className="text-[10px]">Add-On</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{code.full_name}</p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span className="font-mono text-lg font-semibold text-blue-600 tabular-nums">
              {formatWRVU(wrvu)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-500"
              onClick={() => removeCode(code.code)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Meta info row */}
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            Global: {code.global}d
          </Badge>
          
          {code.status === 'deleted_2026' && (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Deleted 2026
            </Badge>
          )}
          {code.status === 'new_2026' && (
            <Badge variant="success" className="flex items-center gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              New 2026
            </Badge>
          )}
        </div>

        {/* Tip message */}
        {tip && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-800">{tip.title}</p>
                <p className="text-xs text-amber-700 mt-0.5">{tip.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Related codes suggestions */}
        {relatedCodes.length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs font-medium text-blue-800 flex items-center gap-1 mb-2">
              <Lightbulb className="h-3 w-3" />
              Related Codes
            </p>
            <div className="flex flex-wrap gap-2">
              {relatedCodes.map((relCode) => (
                <Button
                  key={relCode.code}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs bg-white hover:bg-blue-100"
                  onClick={() => handleAddRelated(relCode)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {relCode.code}: {relCode.shorthand}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
