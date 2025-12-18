'use client';

import * as React from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/search/SearchBar';
import { SelectedCodes } from '@/components/cart/SelectedCodes';
import { Sidebar, SidebarTrigger } from '@/components/sidebar/Sidebar';
import { CaptureExampleModal } from '@/components/popups/CaptureExampleModal';
import { ContextualBanners } from '@/components/sidebar/ContextualBanner';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCaseStore } from '@/lib/store';
import { getContextualBanners } from '@/lib/popupEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Tag, PlusCircle, Activity, Image, ChevronRight, Building2 } from 'lucide-react';

const TAB_ICONS: Record<string, React.ElementType> = {
  modifiers: Tag,
  endo_addons: PlusCircle,
  dialysis: Activity,
  imaging: Image,
  contract: Building2,
};

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarTab, setSidebarTab] = React.useState('modifiers');
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [captureExampleOpen, setCaptureExampleOpen] = React.useState(false);
  
  const selectedCodes = useCaseStore((state) => state.selectedCodes);
  const setYear = useCaseStore((state) => state.setYear);
  const clearAll = useCaseStore((state) => state.clearAll);

  // Refs for keyboard navigation
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const opNoteButtonRef = React.useRef<HTMLButtonElement>(null);

  // Get contextual banners for inline display
  const banners = React.useMemo(
    () => getContextualBanners(selectedCodes),
    [selectedCodes]
  );

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '/',
      action: () => searchInputRef.current?.focus(),
      description: 'Focus search',
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => searchInputRef.current?.focus(),
      description: 'Focus search',
    },
    {
      key: '?',
      action: () => setShortcutsOpen(true),
      description: 'Show keyboard shortcuts',
    },
    {
      key: 'Escape',
      action: () => {
        if (shortcutsOpen) setShortcutsOpen(false);
        else if (captureExampleOpen) setCaptureExampleOpen(false);
        else if (sidebarOpen) setSidebarOpen(false);
      },
      description: 'Close modal',
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => setSidebarOpen(true),
      description: 'Open Quick Reference',
    },
    {
      key: 'g',
      ctrlKey: true,
      action: () => {
        if (selectedCodes.length > 0) {
          opNoteButtonRef.current?.click();
        }
      },
      description: 'Generate Op-Note',
    },
    {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      action: () => clearAll(),
      description: 'Clear all codes',
    },
    {
      key: '1',
      action: () => setYear(2025),
      description: 'Switch to 2025',
    },
    {
      key: '2',
      action: () => setYear(2026),
      description: 'Switch to 2026',
    },
  ]);

  // Handle sidebar action from inline alerts
  const handleSidebarAction = (tab: string) => {
    setSidebarTab(tab);
    setSidebarOpen(true);
  };

  const sidebarTabs = [
    { id: 'modifiers', label: 'Modifiers', subtitle: '-57, -24, -58, -78, -25, -59, -22' },
    { id: 'endo_addons', label: 'Endo Add-Ons', subtitle: 'IVUS, Selective Cath, US Guidance, IVL' },
    { id: 'dialysis', label: 'Dialysis Access', subtitle: '36901-36909 hierarchy & scenarios' },
    { id: 'imaging', label: 'Imaging / S&I', subtitle: 'Vascular lab, 2026 bundling changes' },
    { id: 'contract', label: 'Institutional wRVU', subtitle: 'Shadow billing, vintage year, GPCI' },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Skip to main content - Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none"
        >
          Skip to main content
        </a>
        
        <Header onHelpClick={() => setShortcutsOpen(true)} />
        
        <main id="main-content" className="flex-1 container mx-auto px-4 py-4 sm:py-6" role="main">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Main content area - Search and Cart */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Search Section */}
              <section aria-label="Code Search">
                <SearchBar ref={searchInputRef} />
              </section>
              
              {/* Contextual Banners - Mobile/Tablet inline display */}
              <section className="lg:hidden" aria-label="Alerts">
                <ContextualBanners banners={banners} />
              </section>
              
              {/* Selected Codes Cart */}
              <section aria-label="Selected Codes">
                <SelectedCodes 
                  opNoteButtonRef={opNoteButtonRef}
                  onSidebarAction={handleSidebarAction}
                />
              </section>
            </div>
            
            {/* Right Sidebar - Desktop inline preview */}
            <aside className="hidden lg:block" aria-label="Quick Reference">
              <div className="sticky top-24 space-y-4">
                {/* Contextual Banners */}
                <ContextualBanners banners={banners} />
                
                {/* Quick Reference Panel */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="font-semibold text-slate-900">Quick Reference</h2>
                    <SidebarTrigger
                      onClick={() => setSidebarOpen(true)}
                      selectedCount={selectedCodes.length}
                    />
                  </div>
                  
                  {/* Tab previews */}
                  <nav className="p-2" aria-label="Reference categories">
                    {sidebarTabs.map((tab) => {
                      const Icon = TAB_ICONS[tab.id] || Tag;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => { setSidebarTab(tab.id); setSidebarOpen(true); }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-all group text-left"
                          aria-label={`Open ${tab.label} reference`}
                        >
                          <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                            <Icon className="h-4 w-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                              {tab.label}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {tab.subtitle}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })}
                  </nav>
                </div>
                
                {/* Keyboard hint */}
                <div className="text-center">
                  <button
                    onClick={() => setShortcutsOpen(true)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 rounded mx-0.5">?</kbd> for keyboard shortcuts
                  </button>
                </div>
              </div>
            </aside>
          </div>
          
          {/* Mobile Quick Reference Button */}
          <div className="lg:hidden fixed bottom-4 right-4 z-40">
            <SidebarTrigger
              onClick={() => setSidebarOpen(true)}
              selectedCount={selectedCodes.length}
            />
          </div>
          
          {/* Compliance Footer */}
          <footer className="mt-6 sm:mt-8 pt-4 border-t border-slate-200" role="contentinfo">
            <p className="text-xs text-slate-400 text-center max-w-2xl mx-auto">
              Educational reference only. Bill only when supported by medical necessity, 
              documentation, and payer policy. When in doubt, confirm with your coding/compliance team.
            </p>
            <p className="text-[10px] text-slate-300 text-center mt-2">
              Vascular CPT Coding Assistant v1.0 • 2025/2026 wRVU Data
            </p>
          </footer>
        </main>
        
        {/* Sidebar Drawer */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          defaultTab={sidebarTab}
        />
        
        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />
        
        {/* Capture Example Modal */}
        <CaptureExampleModal
          isOpen={captureExampleOpen}
          onClose={() => setCaptureExampleOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
}
