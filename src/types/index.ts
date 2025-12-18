/**
 * Vascular CPT Coding Assistant - Type Definitions
 */

// ============================================
// DATABASE TYPES
// ============================================

export interface CodeEntry {
  code: string;
  shorthand: string;
  full_name: string;
  category: string;
  wrvu_2025: number;
  wrvu_2026: number | null;
  global: number;
  status: 'active' | 'new_2026' | 'deleted_2026';
  effective_date: string | null;
  sunset_date?: string | null;
  replaced_by?: string[];
  replaces?: string[];
  is_addon: boolean;
  details?: string;
  documentation_tips?: string;
  common_modifiers?: string[];
  bundling_notes?: string;
  // Op-note generation fields
  template_type: string | null;
  intervention_subtype: string | null;
  vascular_territory: string | null;
  pathology_type: string | null;
  narrative_order: number | null;
  access_site_hint: string | null;
}

export interface DatabaseMetadata {
  version: string;
  last_updated: string;
  description: string;
  data_source: string;
  notes: string;
  op_note_version: string;
}

export interface Database {
  metadata: DatabaseMetadata;
  codes: CodeEntry[];
}

// ============================================
// POPUP TYPES
// ============================================

export type PopupType = 'error' | 'warning' | 'info' | 'checklist' | 'decision';
export type PopupColor = 'red' | 'orange' | 'amber' | 'blue' | 'neutral' | 'blue_amber';

export interface PopupTrigger {
  type: string;
  code_list?: string;
  categories?: string;
  global_value?: number;
  global_values?: number[];
  status?: string;
  minimum_count?: number;
  conditions?: PopupTrigger[];
  logic?: 'AND' | 'OR';
}

export interface PopupConfig {
  id: string;
  title: string;
  priority: number;
  type: PopupType;
  color: PopupColor;
  trigger: PopupTrigger;
  content_reference: string;
  dismissable: boolean;
  show_once_per_session: boolean;
  show_as?: string;
}

export interface CodeSpecificTip {
  tip_type: string;
  title: string;
  message: string;
  related_codes?: string[];
}

export interface PopupTriggerConfig {
  version: string;
  description: string;
  last_updated: string;
  em_codes: {
    office_new: string[];
    office_established: string[];
    hospital_initial: string[];
    hospital_subsequent: string[];
    hospital_discharge: string[];
    all: string[];
  };
  amputation_codes: string[];
  dialysis_base_codes: string[];
  dialysis_addon_codes: string[];
  endovascular_categories: string[];
  revasc_categories: string[];
  popups: PopupConfig[];
  sidebar_tabs: SidebarTabConfig[];
  code_specific_tips: Record<string, CodeSpecificTip>;
  checklist_items: Record<string, ChecklistItem[]>;
}

export interface SidebarTabConfig {
  id: string;
  label: string;
  icon: string;
  order: number;
  cards: string[];
  link_to?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  related_codes: string[];
}

// ============================================
// STORE TYPES
// ============================================

export interface CaseStore {
  selectedCodes: CodeEntry[];
  selectedYear: 2025 | 2026;
  dismissedPopups: Set<string>;
  addCode: (code: CodeEntry) => void;
  removeCode: (codeId: string) => void;
  clearAll: () => void;
  setYear: (year: 2025 | 2026) => void;
  getTotalWRVU: () => number;
  dismissPopup: (popupId: string) => void;
  resetDismissedPopups: () => void;
}

// ============================================
// OP-NOTE TYPES
// ============================================

export interface PatientContext {
  laterality?: 'left' | 'right' | 'bilateral' | null;
  accessSite?: string;
  position?: string;
  anesthesiaType?: string;
}

export interface GeneratedNote {
  header: string;
  operationsPerformed: string;
  narrative: string;
  fullNote: string;
}

// ============================================
// UI TYPES
// ============================================

export interface SearchResult {
  item: CodeEntry;
  score?: number;
  refIndex?: number;
}
