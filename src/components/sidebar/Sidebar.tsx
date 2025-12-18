'use client';

import * as React from 'react';
import { Tag, PlusCircle, Activity, Image, FileText, BookOpen, Building2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ContextualBanners } from './ContextualBanner';
import { SidebarCard } from './SidebarCard';
import { SIDEBAR_CONTENT } from '@/content/sidebarContent';
import { getContextualBanners } from '@/lib/popupEngine';
import { useCaseStore } from '@/lib/store';

const TAB_ICONS: Record<string, React.ElementType> = {
  tag: Tag,
  'plus-circle': PlusCircle,
  activity: Activity,
  image: Image,
  'file-text': FileText,
  'building': Building2,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export function Sidebar({ isOpen, onClose, defaultTab = 'modifiers' }: SidebarProps) {
  const selectedCodes = useCaseStore((state) => state.selectedCodes);
  const banners = getContextualBanners(selectedCodes);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <SheetTitle>Quick Reference</SheetTitle>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
              {/* Tab List - Scrollable horizontally */}
              <div className="px-4 pt-4 pb-2 border-b border-slate-100">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                  {SIDEBAR_CONTENT.map((tab) => {
                    const Icon = TAB_ICONS[tab.icon] || Tag;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {/* Tab Content - Scrollable */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {/* Contextual Banners - Always show at top */}
                  <ContextualBanners banners={banners} />

                  {/* Tab Panels */}
                  {SIDEBAR_CONTENT.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                      <div className="space-y-3">
                        {tab.cards.map((card, index) => (
                          <SidebarCard
                            key={card.id}
                            card={card}
                            defaultExpanded={index === 0}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </div>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <p className="text-[10px] text-slate-400 text-center">
              Educational reference only. Bill only when supported by medical necessity,
              documentation, and payer policy.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Trigger button component
interface SidebarTriggerProps {
  onClick: () => void;
  selectedCount?: number;
}

export function SidebarTrigger({ onClick, selectedCount = 0 }: SidebarTriggerProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="flex items-center gap-2"
    >
      <BookOpen className="h-4 w-4" />
      <span className="hidden sm:inline">Quick Reference</span>
      {selectedCount > 0 && (
        <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
          {selectedCount}
        </span>
      )}
    </Button>
  );
}
