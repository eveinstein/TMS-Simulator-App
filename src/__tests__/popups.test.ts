/**
 * Popup Trigger Tests
 * Validates alert logic for code combinations
 */

import { codes, getCodeByNumber } from '@/lib/database';
import type { CodeEntry } from '@/types';

// Replicate the alert logic from ContextualAlerts for testing
const DIALYSIS_BASE_CODES = ['36901', '36902', '36903', '36904', '36905', '36906'];

const ADDON_REQUIREMENTS: Record<string, { name: string; requiresAny: string[] | 'any_procedure' }> = {
  '36248': { name: 'Selective Cath', requiresAny: ['36245', '36246', '36247'] },
  '37252': { name: 'IVUS (Initial)', requiresAny: 'any_procedure' },
  '37253': { name: 'IVUS (Additional)', requiresAny: ['37252'] },
  '36907': { name: 'Central PTA', requiresAny: DIALYSIS_BASE_CODES },
  '36908': { name: 'Central Stent', requiresAny: DIALYSIS_BASE_CODES },
  '36909': { name: 'Dialysis Embolization', requiresAny: DIALYSIS_BASE_CODES },
};

const NCCI_PAIRS: [string, string][] = [
  // Dialysis
  ['36901', '36902'],
  ['36901', '36903'],
  ['36902', '36903'],
  ['36904', '36905'],
  ['36904', '36906'],
  ['36905', '36906'],
  // Fem/Pop
  ['37224', '37225'],
  ['37224', '37226'],
  ['37224', '37227'],
  ['37225', '37226'],
  ['37225', '37227'],
  ['37226', '37227'],
  // Tibial
  ['37228', '37229'],
  ['37228', '37230'],
  ['37228', '37231'],
  ['37229', '37230'],
  ['37229', '37231'],
  ['37230', '37231'],
  // Iliac
  ['37220', '37221'],
];

function hasDialysisConflict(selectedCodes: CodeEntry[]): boolean {
  const dialysisCodes = selectedCodes.filter(c => DIALYSIS_BASE_CODES.includes(c.code));
  return dialysisCodes.length >= 2;
}

function getOrphanAddons(selectedCodes: CodeEntry[]): string[] {
  const orphans: string[] = [];
  const selectedIds = selectedCodes.map(c => c.code);
  
  selectedCodes.filter(c => c.is_addon).forEach(addon => {
    const req = ADDON_REQUIREMENTS[addon.code];
    if (!req) return;
    
    if (req.requiresAny === 'any_procedure') {
      const hasPrimary = selectedCodes.some(c => !c.is_addon && c.code !== addon.code);
      if (!hasPrimary) orphans.push(addon.code);
    } else {
      const hasPrimary = req.requiresAny.some(r => selectedIds.includes(r));
      if (!hasPrimary) orphans.push(addon.code);
    }
  });
  
  return orphans;
}

function getNcciConflicts(selectedCodes: CodeEntry[]): [string, string][] {
  const conflicts: [string, string][] = [];
  const selectedIds = selectedCodes.map(c => c.code);
  
  NCCI_PAIRS.forEach(([code1, code2]) => {
    if (selectedIds.includes(code1) && selectedIds.includes(code2)) {
      conflicts.push([code1, code2]);
    }
  });
  
  return conflicts;
}

describe('Popup Triggers', () => {
  describe('Dialysis Hierarchy Conflict', () => {
    test('triggers when 2+ dialysis base codes selected', () => {
      const codes = [
        getCodeByNumber('36901')!,
        getCodeByNumber('36903')!,
      ];
      
      expect(hasDialysisConflict(codes)).toBe(true);
    });

    test('does not trigger with single dialysis code', () => {
      const selectedCodes = [
        getCodeByNumber('36901')!,
      ];
      
      expect(hasDialysisConflict(selectedCodes)).toBe(false);
    });

    test('does not trigger with dialysis base + addon', () => {
      const selectedCodes = [
        getCodeByNumber('36901')!,
        getCodeByNumber('36907')!, // addon
      ];
      
      expect(hasDialysisConflict(selectedCodes)).toBe(false);
    });

    test('triggers with 3 dialysis base codes', () => {
      const selectedCodes = [
        getCodeByNumber('36901')!,
        getCodeByNumber('36902')!,
        getCodeByNumber('36903')!,
      ];
      
      expect(hasDialysisConflict(selectedCodes)).toBe(true);
    });
  });

  describe('Add-On Code Orphan Detection', () => {
    test('detects orphan IVUS code', () => {
      const selectedCodes = [
        getCodeByNumber('37252')!, // IVUS - needs any procedure
      ];
      
      const orphans = getOrphanAddons(selectedCodes);
      expect(orphans).toContain('37252');
    });

    test('IVUS with primary code is not orphan', () => {
      const selectedCodes = [
        getCodeByNumber('37252')!,
        getCodeByNumber('37224')!, // Fem/pop angio - primary code
      ];
      
      const orphans = getOrphanAddons(selectedCodes);
      expect(orphans).not.toContain('37252');
    });

    test('detects orphan dialysis addon', () => {
      const selectedCodes = [
        getCodeByNumber('36907')!, // Central PTA - needs dialysis base
      ];
      
      const orphans = getOrphanAddons(selectedCodes);
      expect(orphans).toContain('36907');
    });

    test('dialysis addon with base is not orphan', () => {
      const selectedCodes = [
        getCodeByNumber('36907')!,
        getCodeByNumber('36901')!, // Dialysis base code
      ];
      
      const orphans = getOrphanAddons(selectedCodes);
      expect(orphans).not.toContain('36907');
    });

    test('37253 without 37252 is orphan', () => {
      const selectedCodes = [
        getCodeByNumber('37253')!, // Additional IVUS - needs 37252
        getCodeByNumber('37224')!, // Primary procedure
      ];
      
      const orphans = getOrphanAddons(selectedCodes);
      expect(orphans).toContain('37253');
    });

    test('37253 with 37252 is not orphan', () => {
      const selectedCodes = [
        getCodeByNumber('37253')!,
        getCodeByNumber('37252')!, // Initial IVUS
        getCodeByNumber('37224')!,
      ];
      
      const orphans = getOrphanAddons(selectedCodes);
      expect(orphans).not.toContain('37253');
    });
  });

  describe('NCCI Edit Conflicts', () => {
    test('detects 37224 + 37225 conflict', () => {
      const selectedCodes = [
        getCodeByNumber('37224')!,
        getCodeByNumber('37225')!,
      ];
      
      const conflicts = getNcciConflicts(selectedCodes);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.includes('37224') && c.includes('37225'))).toBe(true);
    });

    test('detects 36901 + 36903 conflict', () => {
      const selectedCodes = [
        getCodeByNumber('36901')!,
        getCodeByNumber('36903')!,
      ];
      
      const conflicts = getNcciConflicts(selectedCodes);
      expect(conflicts.some(c => c.includes('36901') && c.includes('36903'))).toBe(true);
    });

    test('detects atherectomy + stent code conflict (should use combo)', () => {
      // 37225 (atherectomy) + 37226 (stent) should use 37227 (combo)
      const selectedCodes = [
        getCodeByNumber('37225')!,
        getCodeByNumber('37226')!,
      ];
      
      const conflicts = getNcciConflicts(selectedCodes);
      expect(conflicts.some(c => c.includes('37225') && c.includes('37226'))).toBe(true);
    });

    test('detects tibial atherectomy + stent conflict', () => {
      // 37229 (atherectomy) + 37230 (stent) should use 37231 (combo)
      const selectedCodes = [
        getCodeByNumber('37229')!,
        getCodeByNumber('37230')!,
      ];
      
      const conflicts = getNcciConflicts(selectedCodes);
      expect(conflicts.some(c => c.includes('37229') && c.includes('37230'))).toBe(true);
    });

    test('no conflict for valid venous ablation base + addon', () => {
      // 36475 + 36476 is VALID (base + addon for additional veins)
      const selectedCodes = [
        getCodeByNumber('36475')!,
        getCodeByNumber('36476')!,
      ];
      
      const conflicts = getNcciConflicts(selectedCodes);
      expect(conflicts).toHaveLength(0);
    });

    test('no conflict for unrelated codes', () => {
      const selectedCodes = [
        getCodeByNumber('35301')!, // CEA
        getCodeByNumber('34705')!, // EVAR
      ];
      
      const conflicts = getNcciConflicts(selectedCodes);
      expect(conflicts).toHaveLength(0);
    });

    test('detects multiple conflicts', () => {
      const selectedCodes = [
        getCodeByNumber('37224')!,
        getCodeByNumber('37225')!,
        getCodeByNumber('37226')!,
        getCodeByNumber('37227')!,
      ];
      
      const conflicts = getNcciConflicts(selectedCodes);
      expect(conflicts.length).toBeGreaterThan(1);
    });
  });

  describe('2026 Code Transition', () => {
    test('deleted_2026 codes have status flag', () => {
      const deletedCodes = codes.filter(c => c.status === 'deleted_2026');
      expect(deletedCodes.length).toBeGreaterThan(0);
      
      deletedCodes.forEach(code => {
        expect(code.replaced_by).toBeDefined();
        expect(code.replaced_by!.length).toBeGreaterThan(0);
      });
    });

    test('37224-37235 are marked as deleted_2026', () => {
      const lerCodes = ['37224', '37225', '37226', '37227', '37228', '37229', '37230', '37231'];
      
      lerCodes.forEach(codeNum => {
        const code = getCodeByNumber(codeNum);
        expect(code).toBeDefined();
        expect(code!.status).toBe('deleted_2026');
      });
    });
  });

  describe('90-Day Global + E/M Combination', () => {
    test('identifies 90-day global codes', () => {
      const global90Codes = codes.filter(c => c.global === 90);
      expect(global90Codes.length).toBeGreaterThan(0);
      
      // CEA should be 90-day global
      const cea = getCodeByNumber('35301');
      expect(cea?.global).toBe(90);
    });

    test('identifies 0-day global codes', () => {
      const global0Codes = codes.filter(c => c.global === 0);
      expect(global0Codes.length).toBeGreaterThan(0);
    });
  });
});
