/**
 * Database Access Layer
 * Provides type-safe access to the CPT code database
 */

import type { Database, CodeEntry, DatabaseMetadata } from '@/types';
import databaseJson from '@/data/master_vascular_db.json';

// Type assertion for the imported JSON
const database = databaseJson as Database;

export const codes: CodeEntry[] = database.codes;
export const metadata: DatabaseMetadata = database.metadata;

/**
 * Get a single code by its CPT number
 */
export function getCodeByNumber(codeNumber: string): CodeEntry | undefined {
  return codes.find(c => c.code === codeNumber);
}

/**
 * Get all codes in a specific category
 */
export function getCodesByCategory(category: string): CodeEntry[] {
  return codes.filter(c => c.category === category);
}

/**
 * Get codes applicable for a specific year
 * 2025: active + deleted_2026 (codes that work in 2025)
 * 2026: active + new_2026 (codes that work in 2026)
 */
export function getCodesForYear(year: 2025 | 2026): CodeEntry[] {
  if (year === 2025) {
    return codes.filter(c => c.status === 'active' || c.status === 'deleted_2026');
  }
  return codes.filter(c => c.status === 'active' || c.status === 'new_2026');
}

/**
 * Get the correct wRVU value for a code based on year
 */
export function getWRVU(code: CodeEntry, year: 2025 | 2026): number {
  if (year === 2026 && code.wrvu_2026 !== null) {
    return code.wrvu_2026;
  }
  return code.wrvu_2025;
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(codes.map(c => c.category));
  return Array.from(categories).sort();
}

/**
 * Get the unlisted code (37799) - always shown as fallback
 */
export function getUnlistedCode(): CodeEntry {
  const unlisted = codes.find(c => c.code === '37799');
  if (!unlisted) {
    throw new Error('Unlisted code 37799 not found in database');
  }
  return unlisted;
}

/**
 * Check if code has replacement codes for 2026
 */
export function hasReplacements(code: CodeEntry): boolean {
  return Boolean(code.replaced_by && code.replaced_by.length > 0);
}

/**
 * Get replacement codes for a deleted code
 */
export function getReplacementCodes(code: CodeEntry): CodeEntry[] {
  if (!code.replaced_by || code.replaced_by.length === 0) {
    return [];
  }
  return code.replaced_by
    .map(codeNum => getCodeByNumber(codeNum))
    .filter((c): c is CodeEntry => c !== undefined);
}

export { database };
