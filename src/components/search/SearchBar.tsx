'use client';

import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchCodes } from '@/lib/fuseSearch';
import { useCaseStore } from '@/lib/store';
import { SearchResultRow } from './SearchResultRow';
import type { SearchResult } from '@/types';

const DEBOUNCE_MS = 150;

export const SearchBar = React.forwardRef<HTMLInputElement, object>(
  function SearchBar(_props, ref) {
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [isSearching, setIsSearching] = React.useState(false);
    
    const selectedYear = useCaseStore((state) => state.selectedYear);
    const addCode = useCaseStore((state) => state.addCode);
    
    const inputRef = React.useRef<HTMLInputElement>(null);
    const resultsRef = React.useRef<HTMLDivElement>(null);
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Debounced search
    React.useEffect(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      if (query.trim()) {
        setIsSearching(true);
      }
      
      debounceRef.current = setTimeout(() => {
        if (query.trim()) {
          const searchResults = searchCodes(query, 10, selectedYear);
          setResults(searchResults);
          setIsOpen(true);
          setSelectedIndex(0);
        } else {
          setResults([]);
          setIsOpen(false);
        }
        setIsSearching(false);
      }, DEBOUNCE_MS);

      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, [query, selectedYear]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) {
        if (e.key === 'Escape') {
          setQuery('');
          inputRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    // Handle code selection
    const handleSelect = (result: SearchResult) => {
      addCode(result.item);
      setQuery('');
      setResults([]);
      setIsOpen(false);
      inputRef.current?.focus();
    };

    // Close dropdown on outside click
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          resultsRef.current &&
          !resultsRef.current.contains(e.target as Node) &&
          !inputRef.current?.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll selected item into view
    React.useEffect(() => {
      if (isOpen && resultsRef.current) {
        const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [selectedIndex, isOpen]);

    return (
      <div className="relative w-full">
        {/* Search Input */}
        <div className="relative">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          )}
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search CPT codes, procedures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim() && setIsOpen(true)}
            className="pl-10 pr-16 sm:pr-20 h-11 sm:h-12 text-base rounded-xl border-slate-200 focus:border-blue-300 focus:ring-blue-200"
            aria-label="Search CPT codes"
            aria-expanded={isOpen}
            aria-controls="search-results"
            aria-activedescendant={isOpen ? `result-${selectedIndex}` : undefined}
            role="combobox"
          />
          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-slate-100"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] text-slate-500 font-mono">
              /
            </kbd>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {isOpen && results.length > 0 && (
          <div
            ref={resultsRef}
            id="search-results"
            role="listbox"
            className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          >
            <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
              {results.map((result, index) => (
                <SearchResultRow
                  key={result.item.code}
                  code={result.item}
                  isSelected={index === selectedIndex}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  id={`result-${index}`}
                />
              ))}
            </div>
            <div className="border-t border-slate-100 p-2 bg-slate-50">
              <p className="text-[10px] sm:text-xs text-slate-500 text-center">
                <kbd className="rounded border border-slate-200 bg-white px-1 mr-1">↑↓</kbd>
                navigate
                <kbd className="rounded border border-slate-200 bg-white px-1 mx-1">↵</kbd>
                select
                <kbd className="rounded border border-slate-200 bg-white px-1 mx-1">esc</kbd>
                close
              </p>
            </div>
          </div>
        )}

        {/* No results state */}
        {isOpen && query.trim() && results.length === 0 && !isSearching && (
          <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl p-6 text-center">
            <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600">No codes found for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    );
  }
);
