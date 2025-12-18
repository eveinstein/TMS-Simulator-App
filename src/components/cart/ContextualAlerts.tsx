'use client';

import * as React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  X, 
  AlertTriangle, 
  CheckSquare, 
  Info,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CodeEntry } from '@/types';

// Educational content for checklist items
const CHECKLIST_DETAILS: Record<string, { 
  title: string; 
  explanation: string; 
  codes?: string[]; 
  tip?: string 
}> = {
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

// Alert configurations based on code patterns
interface AlertConfig {
  id: string;
  type: 'checklist' | 'warning' | 'info';
  title: string;
  description: string;
  items?: { text: string; detailKey?: string }[];
  table?: { headers: string[]; rows: string[][] };
  footer?: string;
  sidebarAction?: { label: string; tab: string };
}

// Add-on codes and their required primary code categories/codes
const ADDON_REQUIREMENTS: Record<string, { name: string; requiresAny: string[] | 'any_procedure' }> = {
  // Diagnostic add-ons - require any endovascular or procedure code
  '36248': { name: 'Selective Cath (Add\'l Branch)', requiresAny: ['36245', '36246', '36247'] },
  '37252': { name: 'IVUS (Initial)', requiresAny: 'any_procedure' },
  '37253': { name: 'IVUS (Additional)', requiresAny: ['37252'] },
  '76937': { name: 'US Access Guidance', requiresAny: 'any_procedure' },
  // TEVAR add-on
  '33883': { name: 'TEVAR Proximal Extension', requiresAny: ['33880', '33881'] },
  // Dialysis add-ons
  '36907': { name: 'Central PTA', requiresAny: ['36901', '36902', '36903', '36904', '36905', '36906'] },
  '36908': { name: 'Central Stent', requiresAny: ['36901', '36902', '36903', '36904', '36905', '36906'] },
  '36909': { name: 'Dialysis Embolization', requiresAny: ['36901', '36902', '36903', '36904', '36905', '36906'] },
  // LER add-ons (2025)
  '37222': { name: 'Iliac Angio', requiresAny: ['37220', '37221', '37224', '37225', '37226', '37227', '37228', '37229', '37230', '37231'] },
  '37223': { name: 'Iliac Stent', requiresAny: ['37220', '37221', '37224', '37225', '37226', '37227', '37228', '37229', '37230', '37231'] },
  '37232': { name: 'Tib/Per Angio', requiresAny: ['37224', '37225', '37226', '37227'] },
  '37233': { name: 'Tib/Per Atherectomy', requiresAny: ['37224', '37225', '37226', '37227'] },
  '37234': { name: 'Tib/Per Stent', requiresAny: ['37224', '37225', '37226', '37227'] },
  '37235': { name: 'Tib/Per Stent+Ath', requiresAny: ['37224', '37225', '37226', '37227'] },
  // Thrombectomy add-on
  '37186': { name: 'Secondary Thrombectomy', requiresAny: ['37184', '37185', '37187', '37188'] },
  // Venous add-ons
  '36474': { name: 'MOCA Ablation Add-on', requiresAny: ['36473'] },
  '36476': { name: 'RFA Ablation Add-on', requiresAny: ['36475'] },
  '36479': { name: 'EVLT Ablation Add-on', requiresAny: ['36478'] },
  '37239': { name: 'Iliac Vein Stent Add-on', requiresAny: ['37238'] },
};

// Common NCCI edit pairs (codes that should NOT be billed together)
// NCCI edit pairs - codes that should NOT be billed together (one supersedes the other)
// NOTE: Do NOT include valid base+addon combinations here (e.g., 36475+36476 is correct billing)
const NCCI_EDIT_PAIRS: { codes: [string, string]; description: string }[] = [
  // Dialysis hierarchy - use highest complexity code only
  { codes: ['36901', '36902'], description: '36902 includes 36901 diagnostic work' },
  { codes: ['36901', '36903'], description: '36903 includes 36901 diagnostic work' },
  { codes: ['36902', '36903'], description: '36903 (stent) supersedes 36902 (PTA)' },
  { codes: ['36904', '36905'], description: '36905 includes 36904 thrombectomy' },
  { codes: ['36904', '36906'], description: '36906 includes 36904 thrombectomy' },
  { codes: ['36905', '36906'], description: '36906 (stent) supersedes 36905 (PTA)' },
  // Fem/Pop - use combination code when multiple interventions in same territory
  { codes: ['37224', '37225'], description: 'Use 37225 if atherectomy performed' },
  { codes: ['37224', '37226'], description: 'Use 37226 if stent placed' },
  { codes: ['37224', '37227'], description: 'Use 37227 for atherectomy + stent' },
  { codes: ['37225', '37226'], description: 'Use 37227 for atherectomy + stent (not both codes)' },
  { codes: ['37225', '37227'], description: 'Use 37227 for atherectomy + stent' },
  { codes: ['37226', '37227'], description: 'Use 37227 for atherectomy + stent' },
  // Tibial - use combination code when multiple interventions in same territory
  { codes: ['37228', '37229'], description: 'Use 37229 if atherectomy performed' },
  { codes: ['37228', '37230'], description: 'Use 37230 if stent placed' },
  { codes: ['37228', '37231'], description: 'Use 37231 for atherectomy + stent' },
  { codes: ['37229', '37230'], description: 'Use 37231 for atherectomy + stent (not both codes)' },
  { codes: ['37229', '37231'], description: 'Use 37231 for atherectomy + stent' },
  { codes: ['37230', '37231'], description: 'Use 37231 for atherectomy + stent' },
  // Iliac - use stent code if stent placed
  { codes: ['37220', '37221'], description: 'Use 37221 if stent placed' },
];

function getAlertsForCodes(codes: CodeEntry[]): AlertConfig[] {
  const alerts: AlertConfig[] = [];
  
  if (codes.length === 0) return alerts;

  const selectedCodeIds = codes.map(c => c.code);

  // Check for add-on codes without required primary codes
  const addonCodes = codes.filter(c => c.is_addon);
  const orphanAddons: { code: string; name: string; needs: string }[] = [];
  
  for (const addon of addonCodes) {
    const requirement = ADDON_REQUIREMENTS[addon.code];
    if (!requirement) continue;
    
    if (requirement.requiresAny === 'any_procedure') {
      // Check if there's at least one non-addon procedure code
      const hasPrimary = codes.some(c => !c.is_addon && c.code !== addon.code);
      if (!hasPrimary) {
        orphanAddons.push({
          code: addon.code,
          name: requirement.name,
          needs: 'a primary procedure code'
        });
      }
    } else {
      // Check if any of the required primary codes are present
      const hasPrimary = requirement.requiresAny.some(req => selectedCodeIds.includes(req));
      if (!hasPrimary) {
        orphanAddons.push({
          code: addon.code,
          name: requirement.name,
          needs: requirement.requiresAny.join(' or ')
        });
      }
    }
  }

  if (orphanAddons.length > 0) {
    alerts.push({
      id: 'addon_orphan_warning',
      type: 'warning',
      title: '⚠️ Add-On Code Without Primary Procedure',
      description: 'Add-on codes (+) cannot be billed alone — they require a primary procedure code.',
      items: orphanAddons.map(o => ({ 
        text: `${o.code} (${o.name}) requires ${o.needs}` 
      })),
      footer: 'Add the required primary procedure code or remove the add-on.',
    });
  }

  // Check for NCCI edit conflicts
  const ncciConflicts: string[] = [];
  for (const pair of NCCI_EDIT_PAIRS) {
    if (selectedCodeIds.includes(pair.codes[0]) && selectedCodeIds.includes(pair.codes[1])) {
      ncciConflicts.push(`${pair.codes[0]} + ${pair.codes[1]}: ${pair.description}`);
    }
  }

  if (ncciConflicts.length > 0) {
    alerts.push({
      id: 'ncci_conflict_warning',
      type: 'warning',
      title: '⚠️ Potential Bundling Conflict (NCCI)',
      description: 'These codes typically cannot be billed together. Use the higher-complexity code that captures all work performed.',
      items: ncciConflicts.map(c => ({ text: c })),
      footer: 'Review and select the appropriate single code, or use modifier -59/XS if services were truly distinct.',
    });
  }

  // Check for endovascular codes
  const hasEndo = codes.some(c => 
    c.category.includes('Endovascular') || 
    c.category.includes('Aortic (Endo)') ||
    c.category.includes('Carotid (Endo)')
  );
  
  if (hasEndo) {
    alerts.push({
      id: 'endo_checklist',
      type: 'checklist',
      title: 'Endovascular Documentation Checklist',
      description: 'Review commonly missed add-on codes and documentation elements:',
      items: [
        { text: '☐ Contralateral/crossover access? Document catheter course.', detailKey: 'contralateral' },
        { text: '☐ IVUS used? Add +37252/37253 with measurements.', detailKey: 'ivus' },
        { text: '☐ US-guided access with saved image? Add +76937.', detailKey: 'us_access' },
        { text: '☐ Additional territory treated? Consider -59/XS.', detailKey: 'additional_territory' },
        { text: '☐ Atherectomy AND stent? Use combination code.', detailKey: 'atherectomy_stent' },
        { text: '☐ IVL for calcification? (2026: +37279)', detailKey: 'ivl' },
      ],
      footer: 'Click each item for documentation guidance.',
      sidebarAction: { label: 'View Endo Add-Ons', tab: 'endo_addons' },
    });
  }

  // Check for dialysis base code conflicts
  const dialysisBaseCodes = ['36901', '36902', '36903', '36904', '36905', '36906'];
  const selectedDialysisCodes = codes.filter(c => dialysisBaseCodes.includes(c.code));
  
  if (selectedDialysisCodes.length > 1) {
    alerts.push({
      id: 'dialysis_conflict',
      type: 'warning',
      title: '⚠️ Dialysis Base Code Conflict',
      description: "You've selected multiple dialysis base codes (36901-36906). These are mutually exclusive — only ONE base code per session.",
      table: {
        headers: ['If You Performed...', 'Use Code'],
        rows: [
          ['Diagnostic fistulogram only', '36901'],
          ['+ Peripheral angioplasty', '36902'],
          ['+ Peripheral stent', '36903'],
          ['Thrombectomy only', '36904'],
          ['Thrombectomy + peripheral PTA', '36905'],
          ['Thrombectomy + peripheral stent', '36906'],
        ],
      },
      footer: 'Then ADD +36907 (central PTA), +36908 (central stent), or +36909 (embolization) as needed.',
      sidebarAction: { label: 'View Dialysis Hierarchy', tab: 'dialysis' },
    });
  }

  // Check for 2026 deleted codes
  const hasDeleted2026 = codes.some(c => c.status === 'deleted_2026');
  
  if (hasDeleted2026) {
    alerts.push({
      id: 'code_transition',
      type: 'warning',
      title: '⚠️ 2026 Code Transition',
      description: "One or more selected codes will be deleted January 1, 2026. The new LER codes differentiate stenosis vs occlusion.",
      items: [
        { text: '37224 → 37263 (stenosis) or 37265 (occlusion)' },
        { text: '37225 → 37271 (stenosis) or 37273 (occlusion)' },
        { text: '37226 → 37267 (stenosis) or 37269 (occlusion)' },
        { text: '37227 → 37275 (stenosis) or 37277 (occlusion)' },
      ],
      footer: 'Starting 2026, document whether the lesion is a stenosis or total occlusion (CTO).',
    });
  }

  // Check for 90-day global with potential E/M
  const has90DayGlobal = codes.some(c => c.global === 90);
  const emCodes = ['99202', '99203', '99204', '99205', '99211', '99212', '99213', '99214', '99215'];
  const hasEM = codes.some(c => emCodes.includes(c.code));
  
  if (has90DayGlobal && hasEM) {
    alerts.push({
      id: 'decision_surgery',
      type: 'info',
      title: 'E/M + Major Surgery',
      description: "You've selected both an E/M code and a 90-day global procedure.",
      items: [
        { text: 'If decision for surgery made today → Add modifier -57 to E/M' },
        { text: 'E/M must occur day-of or day-before surgery' },
        { text: 'Documentation must clearly state the decision was made' },
      ],
      footer: 'Missing -57 = E/M bundled into surgery at $0.',
      sidebarAction: { label: 'View Modifier Guide', tab: 'modifiers' },
    });
  }

  return alerts;
}

// Expandable checklist item
function ChecklistItem({ 
  item,
  isExpanded, 
  onToggle 
}: { 
  item: { text: string; detailKey?: string };
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const detail = item.detailKey ? CHECKLIST_DETAILS[item.detailKey] : null;
  const isExpandable = !!detail;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={isExpandable ? onToggle : undefined}
        className={cn(
          "w-full text-left py-2 px-1 flex items-start gap-2 transition-colors rounded",
          isExpandable && "hover:bg-slate-50 cursor-pointer",
          !isExpandable && "cursor-default",
          isExpanded && "bg-slate-50"
        )}
        disabled={!isExpandable}
      >
        {isExpandable ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
          )
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <span className={cn(
          "text-xs",
          isExpanded ? "text-blue-700 font-medium" : "text-slate-600"
        )}>
          {item.text}
        </span>
      </button>
      
      {isExpanded && detail && (
        <div className="ml-5 mr-1 mb-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
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

// Single alert card
function AlertCard({ 
  alert, 
  onDismiss,
  onSidebarAction 
}: { 
  alert: AlertConfig; 
  onDismiss: () => void;
  onSidebarAction?: (tab: string) => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(true);
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

  const Icon = alert.type === 'warning' ? AlertTriangle : 
               alert.type === 'checklist' ? CheckSquare : Info;
  
  const colorClasses = {
    warning: 'border-amber-200 bg-amber-50',
    checklist: 'border-blue-200 bg-blue-50',
    info: 'border-slate-200 bg-slate-50',
  };

  const iconClasses = {
    warning: 'text-amber-500',
    checklist: 'text-blue-500',
    info: 'text-slate-500',
  };

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      colorClasses[alert.type]
    )}>
      {/* Header */}
      <div className="flex items-start gap-2 p-3">
        <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', iconClasses[alert.type])} />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-left w-full"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
            <h4 className="font-semibold text-sm text-slate-800">{alert.title}</h4>
          </button>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded transition-colors flex-shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-slate-600 ml-6">{alert.description}</p>

          {/* Table */}
          {alert.table && (
            <div className="ml-6 overflow-x-auto rounded border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white">
                    {alert.table.headers.map((header, i) => (
                      <th key={i} className="px-2 py-1.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alert.table.rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1.5 text-slate-600">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Checklist items */}
          {alert.items && alert.type === 'checklist' && (
            <div className="ml-6 bg-white/50 rounded-lg border border-slate-200 overflow-hidden">
              {alert.items.map((item, i) => (
                <ChecklistItem
                  key={i}
                  item={item}
                  isExpanded={expandedItems.has(i)}
                  onToggle={() => toggleItem(i)}
                />
              ))}
            </div>
          )}

          {/* Simple bullet items (non-checklist) */}
          {alert.items && alert.type !== 'checklist' && (
            <ul className="ml-6 space-y-1">
              {alert.items.map((item, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-slate-400 flex-shrink-0" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          {alert.footer && (
            <p className="ml-6 text-[10px] text-slate-500 italic">{alert.footer}</p>
          )}

          {/* Sidebar action */}
          {alert.sidebarAction && onSidebarAction && (
            <div className="ml-6 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onSidebarAction(alert.sidebarAction!.tab)}
              >
                {alert.sidebarAction.label}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main component
interface ContextualAlertsProps {
  selectedCodes: CodeEntry[];
  onSidebarAction?: (tab: string) => void;
}

export function ContextualAlerts({ selectedCodes, onSidebarAction }: ContextualAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = React.useState<Set<string>>(new Set());
  
  const alerts = React.useMemo(
    () => getAlertsForCodes(selectedCodes).filter(a => !dismissedAlerts.has(a.id)),
    [selectedCodes, dismissedAlerts]
  );

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.add(alertId);
      return newSet;
    });
  };

  // Reset dismissed alerts when codes change significantly
  React.useEffect(() => {
    setDismissedAlerts(new Set());
  }, [selectedCodes.length]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Lightbulb className="h-3.5 w-3.5" />
        <span className="font-medium">Coding Alerts</span>
      </div>
      {alerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onDismiss={() => handleDismiss(alert.id)}
          onSidebarAction={onSidebarAction}
        />
      ))}
    </div>
  );
}
