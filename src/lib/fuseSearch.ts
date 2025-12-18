/**
 * Fuse.js Search Configuration
 * Provides fuzzy search across CPT codes
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import type { CodeEntry, SearchResult } from '@/types';
import { codes, getUnlistedCode, getCodesForYear } from '@/lib/database';

// Fuse.js configuration optimized for CPT code search
const fuseOptions: IFuseOptions<CodeEntry> = {
  keys: [
    { name: 'shorthand', weight: 0.4 },
    { name: 'full_name', weight: 0.3 },
    { name: 'code', weight: 0.2 },
    { name: 'category', weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true, // Search anywhere in the string
  minMatchCharLength: 2,
};

// Create the Fuse instance with all codes
let fuseInstance: Fuse<CodeEntry> | null = null;

function getFuseInstance(year?: 2025 | 2026): Fuse<CodeEntry> {
  // If year is specified, create a filtered instance
  if (year) {
    const yearCodes = getCodesForYear(year);
    return new Fuse(yearCodes, fuseOptions);
  }
  
  // Otherwise use cached instance for all codes
  if (!fuseInstance) {
    fuseInstance = new Fuse(codes, fuseOptions);
  }
  return fuseInstance;
}

/**
 * Search for CPT codes
 * @param query - Search query string
 * @param maxResults - Maximum number of results to return
 * @param year - Optional year filter (2025 or 2026)
 * @returns Array of search results, always includes unlisted code as fallback
 */
export function searchCodes(
  query: string, 
  maxResults: number = 10,
  year?: 2025 | 2026
): SearchResult[] {
  const fuse = getFuseInstance(year);
  const unlistedCode = getUnlistedCode();
  
  // Empty query returns empty results (just unlisted)
  if (!query.trim()) {
    return [{ item: unlistedCode, score: 1 }];
  }
  
  // Perform the search
  const results = fuse.search(query, { limit: maxResults });
  
  // Convert to our SearchResult type
  const searchResults: SearchResult[] = results.map(result => ({
    item: result.item,
    score: result.score,
    refIndex: result.refIndex,
  }));
  
  // CRITICAL: If no results or very few results, add unlisted code
  // Per spec: "If zero results, ALWAYS show 37799"
  const hasUnlisted = searchResults.some(r => r.item.code === '37799');
  
  if (searchResults.length === 0) {
    return [{ item: unlistedCode, score: 1 }];
  }
  
  // If we have results but unlisted isn't one of them, add it at the end
  if (!hasUnlisted && searchResults.length < maxResults) {
    searchResults.push({ item: unlistedCode, score: 1 });
  }
  
  return searchResults;
}

/**
 * Search by exact code number
 */
export function searchByCodeNumber(codeNumber: string): CodeEntry | null {
  const code = codes.find(c => c.code === codeNumber);
  return code || null;
}

/**
 * Get suggestions based on a code (related codes from tips)
 */
export function getRelatedCodes(code: CodeEntry): string[] {
  // This will be enhanced when we integrate popup_trigger_config
  // For now, return replaced_by codes if they exist
  if (code.replaced_by && code.replaced_by.length > 0) {
    return code.replaced_by;
  }
  return [];
}

/**
 * Quick search - just returns the top result
 */
export function quickSearch(query: string, year?: 2025 | 2026): CodeEntry | null {
  const results = searchCodes(query, 1, year);
  if (results.length > 0 && results[0].item.code !== '37799') {
    return results[0].item;
  }
  return null;
}
