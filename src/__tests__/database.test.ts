/**
 * Database Integrity Tests
 * Validates CPT code database structure and data quality
 */

import { codes, metadata } from '@/lib/database';

describe('Database Integrity', () => {
  describe('CPT Code Format', () => {
    test('all codes are 5-digit numeric strings', () => {
      const invalidCodes = codes.filter(c => !/^\d{5}$/.test(c.code));
      expect(invalidCodes).toHaveLength(0);
    });

    test('no duplicate codes exist', () => {
      const codeNumbers = codes.map(c => c.code);
      const uniqueCodes = new Set(codeNumbers);
      expect(uniqueCodes.size).toBe(codeNumbers.length);
    });

    test('all codes have required fields', () => {
      codes.forEach(code => {
        expect(code.code).toBeDefined();
        expect(code.shorthand).toBeDefined();
        expect(code.full_name).toBeDefined();
        expect(code.category).toBeDefined();
        // new_2026 codes can have null wrvu_2025 - they don't exist in 2025
        if (code.status !== 'new_2026') {
          expect(typeof code.wrvu_2025).toBe('number');
        }
        expect(code.status).toMatch(/^(active|new_2026|deleted_2026)$/);
        expect(typeof code.is_addon).toBe('boolean');
        expect(typeof code.global).toBe('number');
      });
    });
  });

  describe('Status-Based Validation', () => {
    test('active codes have wrvu_2025 values', () => {
      const activeCodes = codes.filter(c => c.status === 'active');
      activeCodes.forEach(code => {
        expect(code.wrvu_2025).toBeGreaterThanOrEqual(0);
      });
    });

    test('new_2026 codes have wrvu_2026 values', () => {
      const new2026Codes = codes.filter(c => c.status === 'new_2026');
      new2026Codes.forEach(code => {
        expect(code.wrvu_2026).not.toBeNull();
        expect(code.wrvu_2026).toBeGreaterThanOrEqual(0);
      });
    });

    test('deleted_2026 codes have replaced_by arrays', () => {
      const deleted2026Codes = codes.filter(c => c.status === 'deleted_2026');
      deleted2026Codes.forEach(code => {
        expect(code.replaced_by).toBeDefined();
        expect(Array.isArray(code.replaced_by)).toBe(true);
        expect(code.replaced_by!.length).toBeGreaterThan(0);
      });
    });

    test('replaced_by references point to valid codes', () => {
      const allCodeIds = new Set(codes.map(c => c.code));
      const deleted2026Codes = codes.filter(c => c.status === 'deleted_2026');
      
      deleted2026Codes.forEach(code => {
        code.replaced_by?.forEach(replacementCode => {
          expect(allCodeIds.has(replacementCode)).toBe(true);
        });
      });
    });
  });

  describe('Add-On Code Validation', () => {
    test('most add-on codes have global period of 0 or XXX', () => {
      const addonCodes = codes.filter(c => c.is_addon);
      // Note: 33883 is an unusual exception with 90-day global
      const normalAddons = addonCodes.filter(c => c.code !== '33883');
      
      normalAddons.forEach(code => {
        expect([0, -1]).toContain(code.global); // -1 for XXX
      });
    });

    test('33883 is correctly flagged as add-on with 90-day global', () => {
      const code33883 = codes.find(c => c.code === '33883');
      expect(code33883).toBeDefined();
      expect(code33883!.is_addon).toBe(true);
      expect(code33883!.global).toBe(90);
    });

    test('add-on codes exist in the database', () => {
      const addonCodes = codes.filter(c => c.is_addon);
      expect(addonCodes.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata Validation', () => {
    test('metadata has required fields', () => {
      expect(metadata.version).toBeDefined();
      expect(metadata.last_updated).toBeDefined();
      expect(metadata.description).toBeDefined();
      expect(metadata.data_source).toBeDefined();
    });

    test('version follows semver format', () => {
      expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('last_updated is valid date format', () => {
      expect(metadata.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('wRVU Value Ranges', () => {
    test('wRVU values are within reasonable range (0-50)', () => {
      codes.forEach(code => {
        // new_2026 codes may have null wrvu_2025
        if (code.wrvu_2025 !== null) {
          expect(code.wrvu_2025).toBeGreaterThanOrEqual(0);
          expect(code.wrvu_2025).toBeLessThanOrEqual(50);
        }
        
        if (code.wrvu_2026 !== null) {
          expect(code.wrvu_2026).toBeGreaterThanOrEqual(0);
          expect(code.wrvu_2026).toBeLessThanOrEqual(50);
        }
      });
    });

    test('key procedure codes have expected wRVU ranges', () => {
      // CEA (35301) should be ~20-25 wRVU
      const cea = codes.find(c => c.code === '35301');
      expect(cea).toBeDefined();
      expect(cea!.wrvu_2025).toBeGreaterThan(18);
      expect(cea!.wrvu_2025).toBeLessThan(28);

      // EVAR (34705) should be ~25-32 wRVU
      const evar = codes.find(c => c.code === '34705');
      expect(evar).toBeDefined();
      expect(evar!.wrvu_2025).toBeGreaterThan(24);
      expect(evar!.wrvu_2025).toBeLessThan(35);

      // Fem/Pop Angio (37224) should be ~7-12 wRVU
      const fempop = codes.find(c => c.code === '37224');
      expect(fempop).toBeDefined();
      expect(fempop!.wrvu_2025).toBeGreaterThan(6);
      expect(fempop!.wrvu_2025).toBeLessThan(14);
    });
  });

  describe('Category Consistency', () => {
    test('all codes have non-empty categories', () => {
      codes.forEach(code => {
        expect(code.category.trim().length).toBeGreaterThan(0);
      });
    });

    test('dialysis codes are properly categorized', () => {
      const dialysisCodes = ['36901', '36902', '36903', '36904', '36905', '36906'];
      dialysisCodes.forEach(codeNum => {
        const code = codes.find(c => c.code === codeNum);
        expect(code).toBeDefined();
        expect(code!.category).toContain('Dialysis');
      });
    });
  });
});
