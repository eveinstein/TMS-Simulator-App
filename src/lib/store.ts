/**
 * Zustand Store for Case Management
 * Manages selected codes, year toggle, and popup dismissals
 */

import { create } from 'zustand';
import type { CodeEntry } from '@/types';
import { getWRVU } from '@/lib/database';

interface CaseStore {
  // State
  selectedCodes: CodeEntry[];
  selectedYear: 2025 | 2026;
  dismissedPopups: Set<string>;
  
  // Actions
  addCode: (code: CodeEntry) => void;
  removeCode: (codeId: string) => void;
  clearAll: () => void;
  setYear: (year: 2025 | 2026) => void;
  dismissPopup: (popupId: string) => void;
  resetDismissedPopups: () => void;
  
  // Computed (implemented as functions)
  getTotalWRVU: () => number;
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  // Initial state
  selectedCodes: [],
  selectedYear: 2025,
  dismissedPopups: new Set(),
  
  // Add a code to the cart
  addCode: (code: CodeEntry) => {
    set((state) => {
      // Check if code already exists
      if (state.selectedCodes.some(c => c.code === code.code)) {
        return state; // Don't add duplicates
      }
      return {
        selectedCodes: [...state.selectedCodes, code]
      };
    });
  },
  
  // Remove a code from the cart
  removeCode: (codeId: string) => {
    set((state) => ({
      selectedCodes: state.selectedCodes.filter(c => c.code !== codeId)
    }));
  },
  
  // Clear all selected codes
  clearAll: () => {
    set({ selectedCodes: [] });
  },
  
  // Switch between 2025 and 2026
  setYear: (year: 2025 | 2026) => {
    set({ selectedYear: year });
  },
  
  // Dismiss a popup for this session
  dismissPopup: (popupId: string) => {
    set((state) => {
      const newDismissed = new Set(state.dismissedPopups);
      newDismissed.add(popupId);
      return { dismissedPopups: newDismissed };
    });
  },
  
  // Reset dismissed popups (e.g., on page reload)
  resetDismissedPopups: () => {
    set({ dismissedPopups: new Set() });
  },
  
  // Calculate total wRVU for selected codes
  getTotalWRVU: () => {
    const state = get();
    return state.selectedCodes.reduce((total, code) => {
      return total + getWRVU(code, state.selectedYear);
    }, 0);
  },
}));

// Selector hooks for specific state slices
export const useSelectedCodes = () => useCaseStore((state) => state.selectedCodes);
export const useSelectedYear = () => useCaseStore((state) => state.selectedYear);
export const useDismissedPopups = () => useCaseStore((state) => state.dismissedPopups);
