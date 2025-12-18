'use client';

import * as React from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckSquare, HelpCircle, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PopupConfig } from '@/types';
import { getPopupContent } from '@/lib/popupEngine';

interface PopupToastProps {
  popup: PopupConfig;
  onDismiss: () => void;
  onAction?: (action: string) => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  checklist: CheckSquare,
  decision: HelpCircle,
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; icon: string; title: string }> = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-500',
    title: 'text-orange-800',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-800',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
  },
  neutral: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: 'text-slate-500',
    title: 'text-slate-800',
  },
  blue_amber: {
    bg: 'bg-gradient-to-r from-blue-50 to-amber-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-slate-800',
  },
};

// Educational content for checklist items
const CHECKLIST_DETAILS: Record<string, { title: string; explanation: string; codes?: string[]; tip?: string }> = {
  'contralateral': {
    title: 'Contralateral/Crossover Access',
    explanation: 'When you access from the opposite groin and cross over the aortic bifurcation, document the catheter course explicitly. This supports selective catheterization codes.',
    codes: ['36245 (1st order)', '36246 (2nd order)', '36247 (3rd order)'],
    tip: 'Document: "From right CFA, catheter advanced over aortic bifurcation to left external iliac, then selectively into left SFA."',
  },
  'ivus': {
    title: 'IVUS (Intravascular Ultrasound)',
    explanation: 'IVUS provides vessel diameter measurements and plaque characterization. Document specific measurements, vessel examined, and findings.',
    codes: ['+37252 (initial vessel)', '+37253 (each additional vessel)'],
    tip: 'Document: "IVUS of SFA showed reference diameter 5.5mm, MLA 2.1mm² (62% stenosis), calcium arc 270°."',
  },
  'us_access': {
    title: 'Ultrasound-Guided Access',
    explanation: 'Real-time ultrasound guidance for vascular access. Requires permanent image storage and documentation of the guidance.',
    codes: ['+76937 (with permanent recording)'],
    tip: 'Document: "Under real-time US guidance, CFA evaluated for patency and appropriate access site. Needle entry visualized. Image saved."',
  },
  'additional_territory': {
    title: 'Additional Vascular Territory',
    explanation: 'When treating vessels in different vascular territories during the same session, modifier -59 or -XS may apply to distinguish separate work.',
    codes: ['-59 (distinct procedural service)', '-XS (separate structure)'],
    tip: 'Example: Fem-pop intervention PLUS iliac intervention = different territories. Document separately.',
  },
  'atherectomy_stent': {
    title: 'Atherectomy + Stent Combination',
    explanation: 'When both atherectomy AND stent are performed in the same vessel, use the combination code rather than billing separately.',
    codes: ['37227 → 37231 (2026)', 'Fem/Pop atherectomy + stent'],
    tip: 'The combination code captures both components. Do not bill atherectomy and stent separately in same territory.',
  },
  'ivl': {
    title: 'Intravascular Lithotripsy (IVL)',
    explanation: 'IVL treats calcified lesions with sonic pressure waves. NEW code in 2026. Document calcium burden and number of treatments.',
    codes: ['+37279 (effective 2026)'],
    tip: 'Document: "Calcified lesion at distal SFA. IVL catheter positioned. 10 cycles x 30 pulses delivered. Post-treatment compliance improved."',
  },
};

// Expandable checklist item component
function ChecklistItem({ 
  text, 
  isExpanded, 
  onToggle 
}: { 
  text: string; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  // Determine which detail to show based on text content
  const getDetailKey = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('contralateral') || lowerText.includes('crossover')) return 'contralateral';
    if (lowerText.includes('ivus')) return 'ivus';
    if (lowerText.includes('us-guided') || lowerText.includes('76937')) return 'us_access';
    if (lowerText.includes('additional territory') || lowerText.includes('-59')) return 'additional_territory';
    if (lowerText.includes('atherectomy') && lowerText.includes('stent')) return 'atherectomy_stent';
    if (lowerText.includes('ivl') || lowerText.includes('37279')) return 'ivl';
    return null;
  };

  const detailKey = getDetailKey(text);
  const detail = detailKey ? CHECKLIST_DETAILS[detailKey] : null;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className={cn(
          "w-full text-left p-2 flex items-start gap-2 hover:bg-white/50 transition-colors rounded",
          isExpanded && "bg-white/50"
        )}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
        )}
        <span className={cn(
          "text-xs",
          isExpanded ? "text-blue-700 font-medium" : "text-slate-600"
        )}>
          {text}
        </span>
      </button>
      
      {isExpanded && detail && (
        <div className="ml-5 mr-2 mb-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <h4 className="font-semibold text-sm text-slate-800 mb-2">{detail.title}</h4>
          <p className="text-xs text-slate-600 mb-2">{detail.explanation}</p>
          
          {detail.codes && (
            <div className="mb-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Codes:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {detail.codes.map((code, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-mono rounded">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {detail.tip && (
            <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
              <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Documentation Tip:</span>
              <p className="text-[11px] text-amber-800 mt-1 italic">{detail.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PopupToast({ popup, onDismiss, onAction }: PopupToastProps) {
  const content = getPopupContent(popup.id);
  const Icon = TYPE_ICONS[popup.type] || Info;
  const colors = COLOR_CLASSES[popup.color] || COLOR_CLASSES.neutral;
  
  // Track which checklist items are expanded
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!content) return null;

  const handleAction = (action: string) => {
    if (action === 'dismiss') {
      onDismiss();
    } else if (onAction) {
      onAction(action);
    }
  };

  // Check if this is a checklist-style popup (has checkbox items)
  const isChecklist = content.bullets?.some(b => b.includes('☐'));

  return (
    <div
      className={cn(
        'rounded-lg border shadow-lg overflow-hidden animate-in slide-in-from-right-full duration-300',
        colors.bg,
        colors.border
      )}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`popup-title-${popup.id}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', colors.icon)} />
        <div className="flex-1 min-w-0">
          <h3 
            id={`popup-title-${popup.id}`}
            className={cn('font-semibold text-sm', colors.title)}
          >
            {content.title}
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-colors"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 space-y-3">
        <p className="text-sm text-slate-600">{content.body}</p>

        {/* Table */}
        {content.table && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white">
                  {content.table.headers.map((header, i) => (
                    <th
                      key={i}
                      className="px-2 py-1.5 text-left font-semibold text-slate-700 border-b border-slate-200"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.table.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1.5 text-slate-600">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bullets - Interactive if checklist style */}
        {content.bullets && content.bullets.length > 0 && (
          isChecklist ? (
            <div className="bg-white/50 rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-2 py-1.5 bg-slate-100 border-b border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Click each item for details
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {content.bullets.map((bullet, i) => (
                  <ChecklistItem
                    key={i}
                    text={bullet}
                    isExpanded={expandedItems.has(i)}
                    onToggle={() => toggleItem(i)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-1">
              {content.bullets.map((bullet, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-slate-400 flex-shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )
        )}

        {/* Footer */}
        {content.footer && (
          <p className="text-xs text-slate-500 italic border-t border-slate-200 pt-2">{content.footer}</p>
        )}
      </div>

      {/* Actions */}
      {content.ctaButtons && content.ctaButtons.length > 0 && (
        <div className="flex gap-2 px-4 pb-4 pt-1">
          {content.ctaButtons.map((cta, i) => (
            <Button
              key={i}
              variant={i === 0 ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "text-xs flex-1",
                i === 0 && "bg-blue-600 hover:bg-blue-700"
              )}
              onClick={() => handleAction(cta.action)}
            >
              {cta.label}
              {cta.action.startsWith('sidebar:') && (
                <ExternalLink className="h-3 w-3 ml-1" />
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Container for multiple popups
interface PopupContainerProps {
  popups: PopupConfig[];
  onDismiss: (popupId: string) => void;
  onAction?: (popupId: string, action: string) => void;
}

export function PopupContainer({ popups, onDismiss, onAction }: PopupContainerProps) {
  if (popups.length === 0) return null;

  // Only show the highest priority popup (lowest priority number)
  const activePopup = popups[0];

  return (
    <div className="fixed top-20 right-4 z-[100] w-96 max-w-[calc(100vw-2rem)]">
      <PopupToast
        popup={activePopup}
        onDismiss={() => onDismiss(activePopup.id)}
        onAction={(action) => onAction?.(activePopup.id, action)}
      />
      
      {/* Show count if more popups are queued */}
      {popups.length > 1 && (
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-500 bg-white/80 px-2 py-1 rounded-full shadow-sm border border-slate-200">
            +{popups.length - 1} more notification{popups.length > 2 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
