/**
 * wRVU Calculation Tests
 * Validates wRVU retrieval and calculation logic
 */

import { getWRVU, getCodeByNumber, codes } from '@/lib/database';

describe('wRVU Calculations', () => {
  describe('getWRVU function', () => {
    test('returns wrvu_2025 for year 2025', () => {
      const code = codes.find(c => c.status === 'active' && c.wrvu_2025 > 0);
      expect(code).toBeDefined();
      
      const wrvu = getWRVU(code!, 2025);
      expect(wrvu).toBe(code!.wrvu_2025);
    });

    test('returns wrvu_2026 for year 2026 when available', () => {
      const code = codes.find(c => c.status === 'active' && c.wrvu_2026 !== null);
      expect(code).toBeDefined();
      
      const wrvu = getWRVU(code!, 2026);
      expect(wrvu).toBe(code!.wrvu_2026);
    });

    test('falls back to wrvu_2025 when wrvu_2026 is null', () => {
      // Create a mock code with null wrvu_2026
      const mockCode = {
        ...codes[0],
        wrvu_2026: null,
      };
      
      const wrvu = getWRVU(mockCode, 2026);
      expect(wrvu).toBe(mockCode.wrvu_2025);
    });

    test('new_2026 codes return wrvu_2026 for 2026', () => {
      const new2026Code = codes.find(c => c.status === 'new_2026');
      if (new2026Code) {
        const wrvu = getWRVU(new2026Code, 2026);
        expect(wrvu).toBe(new2026Code.wrvu_2026);
      }
    });
  });

  describe('getCodeByNumber function', () => {
    test('returns correct code for valid CPT number', () => {
      const code = getCodeByNumber('35301');
      expect(code).toBeDefined();
      expect(code!.code).toBe('35301');
      expect(code!.shorthand).toContain('CEA');
    });

    test('returns undefined for invalid CPT number', () => {
      const code = getCodeByNumber('99999');
      expect(code).toBeUndefined();
    });

    test('returns undefined for empty string', () => {
      const code = getCodeByNumber('');
      expect(code).toBeUndefined();
    });
  });

  describe('wRVU totals calculation', () => {
    test('correctly sums multiple codes for 2025', () => {
      const testCodes = [
        getCodeByNumber('35301')!, // CEA
        getCodeByNumber('37252')!, // IVUS
      ];
      
      const total = testCodes.reduce((sum, code) => sum + getWRVU(code, 2025), 0);
      const expected = testCodes[0].wrvu_2025 + testCodes[1].wrvu_2025;
      
      expect(total).toBeCloseTo(expected, 2);
    });

    test('handles empty code list', () => {
      const testCodes: typeof codes = [];
      const total = testCodes.reduce((sum, code) => sum + getWRVU(code, 2025), 0);
      
      expect(total).toBe(0);
    });

    test('handles single code', () => {
      const testCode = getCodeByNumber('35301')!;
      const total = getWRVU(testCode, 2025);
      
      expect(total).toBe(testCode.wrvu_2025);
    });
  });

  describe('Year-based filtering', () => {
    test('deleted_2026 codes have valid wRVU for 2025', () => {
      const deletedCodes = codes.filter(c => c.status === 'deleted_2026');
      
      deletedCodes.forEach(code => {
        const wrvu = getWRVU(code, 2025);
        expect(wrvu).toBeGreaterThanOrEqual(0);
      });
    });

    test('new_2026 codes have valid wRVU for 2026', () => {
      const newCodes = codes.filter(c => c.status === 'new_2026');
      
      newCodes.forEach(code => {
        const wrvu = getWRVU(code, 2026);
        expect(wrvu).toBeGreaterThanOrEqual(0);
        expect(wrvu).not.toBeNull();
      });
    });
  });
});
