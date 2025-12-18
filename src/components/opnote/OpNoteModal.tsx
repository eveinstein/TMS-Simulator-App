'use client';

import * as React from 'react';
import { 
  FileText, 
  Copy, 
  Download, 
  Check, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { generateOpNote } from '@/lib/opNoteTemplates';
import type { CodeEntry, PatientContext, GeneratedNote } from '@/types';

interface OpNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCodes: CodeEntry[];
}

export function OpNoteModal({ isOpen, onClose, selectedCodes }: OpNoteModalProps) {
  // Patient context state
  const [context, setContext] = React.useState<PatientContext>({
    laterality: null,
    accessSite: undefined,
    anesthesiaType: undefined,
  });
  
  // Generated note state
  const [generatedNote, setGeneratedNote] = React.useState<GeneratedNote | null>(null);
  const [copySuccess, setCopySuccess] = React.useState(false);
  const [showFullNote, setShowFullNote] = React.useState(true);
  
  // Generate note when codes or context change
  React.useEffect(() => {
    if (selectedCodes.length > 0) {
      const note = generateOpNote(selectedCodes, context);
      setGeneratedNote(note);
    } else {
      setGeneratedNote(null);
    }
  }, [selectedCodes, context]);
  
  // Copy to clipboard
  const handleCopy = async () => {
    if (!generatedNote) return;
    
    try {
      await navigator.clipboard.writeText(generatedNote.fullNote);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  // Download as text file
  const handleDownload = () => {
    if (!generatedNote) return;
    
    const blob = new Blob([generatedNote.fullNote], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `op-note-draft-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Count placeholders
  const placeholderCount = generatedNote?.fullNote.match(/\*\*\*/g)?.length || 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <DialogTitle>Generate Op-Note Draft</DialogTitle>
          </div>
          <DialogDescription>
            Generate a draft operative report from your selected CPT codes. 
            All *** placeholders must be filled in.
          </DialogDescription>
        </DialogHeader>
        
        {/* Main content area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
          {/* Left panel - Context inputs and code list */}
          <div className="lg:col-span-1 space-y-4 overflow-auto">
            {/* Patient Context Form */}
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <h3 className="font-semibold text-sm mb-3">Patient Context</h3>
              
              {/* Laterality */}
              <div className="space-y-2 mb-3">
                <Label htmlFor="laterality" className="text-xs">Laterality</Label>
                <Select 
                  value={context.laterality || 'none'}
                  onValueChange={(value) => setContext(prev => ({
                    ...prev,
                    laterality: value === 'none' ? null : value as PatientContext['laterality']
                  }))}
                >
                  <SelectTrigger id="laterality">
                    <SelectValue placeholder="Select laterality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified (***)</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="bilateral">Bilateral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Access Site */}
              <div className="space-y-2 mb-3">
                <Label htmlFor="access" className="text-xs">Access Site</Label>
                <Select 
                  value={context.accessSite || 'none'}
                  onValueChange={(value) => setContext(prev => ({
                    ...prev,
                    accessSite: value === 'none' ? undefined : value
                  }))}
                >
                  <SelectTrigger id="access">
                    <SelectValue placeholder="Select access site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified (***)</SelectItem>
                    <SelectItem value="right common femoral artery">Right CFA</SelectItem>
                    <SelectItem value="left common femoral artery">Left CFA</SelectItem>
                    <SelectItem value="right radial artery">Right radial</SelectItem>
                    <SelectItem value="left radial artery">Left radial</SelectItem>
                    <SelectItem value="right brachial artery">Right brachial</SelectItem>
                    <SelectItem value="left brachial artery">Left brachial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Anesthesia */}
              <div className="space-y-2">
                <Label htmlFor="anesthesia" className="text-xs">Anesthesia</Label>
                <Select 
                  value={context.anesthesiaType || 'none'}
                  onValueChange={(value) => setContext(prev => ({
                    ...prev,
                    anesthesiaType: value === 'none' ? undefined : value
                  }))}
                >
                  <SelectTrigger id="anesthesia">
                    <SelectValue placeholder="Select anesthesia type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified (***)</SelectItem>
                    <SelectItem value="general anesthesia">General</SelectItem>
                    <SelectItem value="local anesthesia with sedation">Local + sedation</SelectItem>
                    <SelectItem value="regional anesthesia">Regional</SelectItem>
                    <SelectItem value="MAC anesthesia">MAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Selected Codes */}
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-sm mb-3">
                Selected Codes ({selectedCodes.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-auto">
                {selectedCodes.map((code) => (
                  <div 
                    key={code.code}
                    className="flex items-center justify-between py-1 px-2 bg-slate-50 rounded text-xs"
                  >
                    <span className="font-mono font-medium">{code.code}</span>
                    <span className="text-slate-500 truncate ml-2">{code.shorthand}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Placeholder warning */}
            {placeholderCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">
                      {placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''} remaining
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Look for *** and fill in before finalizing
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right panel - Generated note preview */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden rounded-lg border border-slate-200">
            {/* Preview header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Preview</span>
                <Badge variant="secondary" className="text-xs">Draft</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFullNote(!showFullNote)}
                  className="text-xs"
                >
                  {showFullNote ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Expand
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="text-xs"
                >
                  {copySuccess ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            
            {/* Note content */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {generatedNote ? (
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700">
                    {showFullNote ? generatedNote.fullNote : generatedNote.narrative}
                  </pre>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No codes selected</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Footer disclaimer */}
        <div className="flex-shrink-0 pt-4 border-t border-slate-200">
          <p className="text-[10px] text-slate-400 text-center">
            DISCLAIMER: This draft is a suggestion only and must be edited to reflect the actual case, 
            medical necessity, and documentation requirements. It is not a billable note on its own.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
