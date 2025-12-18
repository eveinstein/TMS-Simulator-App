/**
 * Popup Engine
 * Evaluates trigger conditions and manages popup state
 */

import type { CodeEntry, PopupConfig, PopupTrigger } from '@/types';
import popupConfigData from '@/data/popup_trigger_config.json';

// Type assertion for the config
const config = popupConfigData as {
  em_codes: { all: string[] };
  amputation_codes: string[];
  dialysis_base_codes: string[];
  endovascular_categories: string[];
  revasc_categories: string[];
  popups: PopupConfig[];
};

/**
 * Evaluate if a trigger condition is met
 */
function evaluateTrigger(trigger: PopupTrigger, selectedCodes: CodeEntry[]): boolean {
  switch (trigger.type) {
    case 'multiple_codes_from_list': {
      const codeList = getCodeList(trigger.code_list || '');
      const matchCount = selectedCodes.filter(c => codeList.includes(c.code)).length;
      return matchCount >= (trigger.minimum_count || 2);
    }
    
    case 'code_status': {
      return selectedCodes.some(c => c.status === trigger.status);
    }
    
    case 'global_period': {
      return selectedCodes.some(c => c.global === trigger.global_value);
    }
    
    case 'global_period_in': {
      const values = trigger.global_values || [];
      return selectedCodes.some(c => values.includes(c.global));
    }
    
    case 'code_in_list': {
      const codeList = getCodeList(trigger.code_list || '');
      return selectedCodes.some(c => codeList.includes(c.code));
    }
    
    case 'category_match': {
      const categories = getCategoryList(trigger.categories || '');
      return selectedCodes.some(c => 
        categories.some(cat => c.category.includes(cat))
      );
    }
    
    case 'multiple_codes_with_global': {
      const matchCount = selectedCodes.filter(c => c.global === trigger.global_value).length;
      return matchCount >= (trigger.minimum_count || 2);
    }
    
    case 'compound': {
      const conditions = trigger.conditions || [];
      if (trigger.logic === 'AND') {
        return conditions.every(cond => evaluateTrigger(cond, selectedCodes));
      } else if (trigger.logic === 'OR') {
        return conditions.some(cond => evaluateTrigger(cond, selectedCodes));
      }
      return false;
    }
    
    case 'compound_or': {
      const conditions = trigger.conditions || [];
      return conditions.some(cond => evaluateTrigger(cond, selectedCodes));
    }
    
    case 'code_in_list_and_category': {
      const codeList = getCodeList(trigger.code_list || '');
      const categories = getCategoryList(trigger.categories || '');
      const hasCodeFromList = selectedCodes.some(c => codeList.includes(c.code));
      const hasCodeFromCategory = selectedCodes.some(c => 
        categories.some(cat => c.category.includes(cat))
      );
      return hasCodeFromList && hasCodeFromCategory;
    }
    
    default:
      return false;
  }
}

/**
 * Get code list from config reference
 */
function getCodeList(listRef: string): string[] {
  if (listRef === 'dialysis_base_codes') {
    return config.dialysis_base_codes;
  }
  if (listRef === 'em_codes.all') {
    return config.em_codes.all;
  }
  if (listRef === 'amputation_codes') {
    return config.amputation_codes;
  }
  return [];
}

/**
 * Get category list from config reference
 */
function getCategoryList(catRef: string): string[] {
  if (catRef === 'endovascular_categories') {
    return config.endovascular_categories;
  }
  if (catRef === 'revasc_categories') {
    return config.revasc_categories;
  }
  return [];
}

/**
 * Evaluate all popups and return triggered ones
 */
export function evaluatePopups(
  selectedCodes: CodeEntry[],
  dismissedPopups: Set<string>
): PopupConfig[] {
  if (selectedCodes.length === 0) {
    return [];
  }
  
  const triggered: PopupConfig[] = [];
  
  for (const popup of config.popups) {
    // Skip if already dismissed this session (for show_once_per_session popups)
    if (popup.show_once_per_session && dismissedPopups.has(popup.id)) {
      continue;
    }
    
    // Evaluate the trigger
    if (evaluateTrigger(popup.trigger, selectedCodes)) {
      triggered.push(popup);
    }
  }
  
  // Sort by priority (lower = more important)
  return triggered.sort((a, b) => a.priority - b.priority);
}

/**
 * Get contextual banners based on selected codes
 */
export interface ContextualBanner {
  id: string;
  type: 'warning' | 'info' | 'error';
  message: string;
  detail?: string;
}

export function getContextualBanners(selectedCodes: CodeEntry[]): ContextualBanner[] {
  const banners: ContextualBanner[] = [];
  
  if (selectedCodes.length === 0) {
    return banners;
  }
  
  // Check for 90-day global
  const has90DayGlobal = selectedCodes.some(c => c.global === 90);
  if (has90DayGlobal) {
    banners.push({
      id: 'global_90',
      type: 'warning',
      message: '90-Day Global Selected',
      detail: 'Post-op E/M generally bundled. Consider -57/-24/-58 if applicable.',
    });
  }
  
  // Check for endovascular codes
  const hasEndo = selectedCodes.some(c => 
    c.category.includes('Endovascular') || c.category.includes('Aortic (Endo)')
  );
  if (hasEndo) {
    banners.push({
      id: 'endo_checklist',
      type: 'info',
      message: 'Endovascular Case',
      detail: 'Review add-on capture: IVUS, US guidance, selective cath.',
    });
  }
  
  // Check for E/M with 90-day global (Decision for Surgery)
  const hasEM = selectedCodes.some(c => config.em_codes.all.includes(c.code));
  if (has90DayGlobal && hasEM) {
    banners.push({
      id: 'decision_surgery',
      type: 'info',
      message: 'E/M + Major Surgery',
      detail: 'If decision made today, add modifier -57 to E/M.',
    });
  }
  
  // Check for multiple dialysis base codes
  const dialysisBaseCount = selectedCodes.filter(c => 
    config.dialysis_base_codes.includes(c.code)
  ).length;
  if (dialysisBaseCount > 1) {
    banners.push({
      id: 'dialysis_conflict',
      type: 'error',
      message: 'Dialysis Base Code Conflict',
      detail: 'Only ONE base code (36901-36906) per session. Choose highest complexity.',
    });
  }
  
  // Check for 2026 deleted codes
  const hasDeleted2026 = selectedCodes.some(c => c.status === 'deleted_2026');
  if (hasDeleted2026) {
    banners.push({
      id: 'code_transition',
      type: 'warning',
      message: '2026 Code Change',
      detail: 'One or more codes will be deleted Jan 1, 2026.',
    });
  }
  
  return banners;
}

/**
 * Get popup content by ID
 */
export function getPopupContent(popupId: string): PopupContent | null {
  return POPUP_CONTENT[popupId] || null;
}

export interface PopupContent {
  title: string;
  body: string;
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  footer?: string;
  ctaButtons: { label: string; action: string }[];
}

const POPUP_CONTENT: Record<string, PopupContent> = {
  dialysis_hierarchy_warning: {
    title: '⚠️ Dialysis Base Code Conflict',
    body: "You've selected multiple dialysis base codes (36901-36906). These are mutually exclusive — only ONE base code should be billed per session.",
    table: {
      headers: ['If You Performed...', 'Use Code'],
      rows: [
        ['Diagnostic fistulogram only', '36901'],
        ['+ Peripheral angioplasty', '36902'],
        ['+ Peripheral stent', '36903'],
        ['Thrombectomy only', '36904'],
        ['Thrombectomy + peripheral angioplasty', '36905'],
        ['Thrombectomy + peripheral stent', '36906'],
      ],
    },
    footer: 'Then ADD +36907 (central PTA), +36908 (central stent), or +36909 (embolization) as appropriate.',
    ctaButtons: [
      { label: 'Show Dialysis Hierarchy', action: 'sidebar:dialysis' },
      { label: 'I Understand', action: 'dismiss' },
    ],
  },
  
  code_transition_2026: {
    title: '⚠️ 2026 Code Change Alert',
    body: "One or more selected codes will be deleted effective January 1, 2026. The 2026 LER codes differentiate between stenosis and occlusion lesions.",
    bullets: [
      '37224 → 37263 (stenosis) or 37265 (occlusion)',
      '37225 → 37271 (stenosis) or 37273 (occlusion)',
      '37226 → 37267 (stenosis) or 37269 (occlusion)',
      '37227 → 37275 (stenosis) or 37277 (occlusion)',
    ],
    footer: 'Starting 2026, document whether the lesion is a stenosis or total occlusion (CTO).',
    ctaButtons: [
      { label: 'View 2026 Mapping', action: 'sidebar:modifiers' },
      { label: 'Dismiss', action: 'dismiss' },
    ],
  },
  
  global_90_reminder: {
    title: '90-Day Global Period Reminder',
    body: "You've selected a code with a 90-day global period. Post-operative E/M visits are generally bundled.",
    bullets: [
      'Use modifier -57 if E/M includes decision for surgery',
      'Use modifier -24 for unrelated E/M during global period',
      'Use modifier -58 for staged/planned procedures',
      'Use modifier -78 for complications requiring return to OR',
    ],
    ctaButtons: [
      { label: 'Show Modifier Guide', action: 'sidebar:modifiers' },
      { label: 'Got It', action: 'dismiss' },
    ],
  },
  
  decision_for_surgery: {
    title: 'Did Today\'s Visit Include the Decision for Major Surgery?',
    body: "You've selected both an E/M code and a major (90-day global) procedure.",
    bullets: [
      'If you made the operative decision during this visit, modifier -57 may apply',
      'E/M must occur day-of or day-before the surgery',
      'Documentation must clearly state the decision was made',
    ],
    footer: 'Prevents the E/M from being bundled into the surgery at $0.',
    ctaButtons: [
      { label: 'Show -57 Template', action: 'sidebar:modifiers' },
      { label: 'Not Applicable', action: 'dismiss' },
    ],
  },
  
  staged_vs_complication: {
    title: 'Return to OR: Staged/Progression vs. Complication?',
    body: "You've selected codes suggesting a return to the operating room.",
    table: {
      headers: ['Situation', 'Modifier', 'Payment', 'Global'],
      rows: [
        ['Staged/Planned return', '-58', '100%', 'Resets'],
        ['Complication', '-78', '~70%', 'No reset'],
      ],
    },
    bullets: [
      '-58: Thrombolysis day 1 → intervention day 2, staged revasc, planned amputation',
      '-78: Bleeding, early thrombosis, wound dehiscence',
    ],
    ctaButtons: [
      { label: 'Show Documentation', action: 'sidebar:modifiers' },
      { label: 'Dismiss', action: 'dismiss' },
    ],
  },
  
  endovascular_checklist: {
    title: 'Endovascular Documentation Checklist',
    body: 'Review commonly missed add-on codes and documentation elements:',
    bullets: [
      '☐ Contralateral/crossover access? Document catheter course.',
      '☐ IVUS used? Add +37252/37253 with measurements.',
      '☐ US-guided access with saved image? Add +76937.',
      '☐ Additional territory treated? Consider -59/XS.',
      '☐ Atherectomy AND stent? Use combination code.',
      '☐ IVL for calcification? (2026: +37279)',
    ],
    footer: 'Educational reference only. Bill only when supported by documentation.',
    ctaButtons: [
      { label: 'See Capture Example', action: 'modal:example' },
      { label: 'Close', action: 'dismiss' },
    ],
  },
  
  em_minor_procedure: {
    title: 'Same-Day Visit + Minor Procedure',
    body: "You've selected both an E/M code and a procedure with 0 or 10-day global.",
    bullets: [
      'Modifier -25 may apply if E/M was significant and separately identifiable',
      'E/M must be documented separately from procedure note',
      'The visit must include evaluation beyond the procedure itself',
    ],
    footer: '"Patient here for scheduled procedure" is NOT a separate E/M.',
    ctaButtons: [
      { label: 'Show -25 Guide', action: 'sidebar:modifiers' },
      { label: 'Not Applicable', action: 'dismiss' },
    ],
  },
};
