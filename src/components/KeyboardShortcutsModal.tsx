'use client';

import * as React from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: ['/', 'Ctrl+K'], description: 'Focus search' },
    { keys: ['Esc'], description: 'Close modal / Clear search' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ]},
  { category: 'Actions', items: [
    { keys: ['Ctrl+G'], description: 'Generate Op-Note' },
    { keys: ['Ctrl+R'], description: 'Open Quick Reference' },
    { keys: ['Ctrl+Shift+C'], description: 'Clear all selected codes' },
  ]},
  { category: 'Year Toggle', items: [
    { keys: ['1'], description: 'Switch to 2025' },
    { keys: ['2'], description: 'Switch to 2026' },
  ]},
  { category: 'Search Results', items: [
    { keys: ['↑', '↓'], description: 'Navigate results' },
    { keys: ['Enter'], description: 'Select highlighted result' },
  ]},
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-blue-600" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Navigate faster with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md bg-slate-50"
                  >
                    <span className="text-sm text-slate-600">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <React.Fragment key={key}>
                          {keyIdx > 0 && <span className="text-xs text-slate-400 mx-1">or</span>}
                          <kbd className="px-2 py-0.5 text-xs font-mono bg-white border border-slate-200 rounded shadow-sm">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
