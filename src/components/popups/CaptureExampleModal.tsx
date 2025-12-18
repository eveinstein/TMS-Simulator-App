'use client';

import * as React from 'react';
import { FileText, Copy, Check, Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CaptureExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CAPTURE_EXAMPLE = {
  title: 'Endovascular Fem-Pop Case Example',
  scenario: 'Right SFA CTO with intervention, crossover from left CFA',
  codes: [
    { code: '37226', desc: 'Fem/Pop stent', wrvu: 15.74 },
    { code: '36245', desc: '1st order selective cath (contralateral)', wrvu: 3.59 },
    { code: '+37252', desc: 'IVUS initial vessel', wrvu: 2.89 },
    { code: '+76937', desc: 'US-guided access with image', wrvu: 0.30 },
  ],
  totalWRVU: 22.52,
  opNoteExcerpt: `PROCEDURE:
The patient was brought to the procedure room and placed supine. After local anesthesia and conscious sedation, the left groin was prepped and draped.

ACCESS:
Under real-time ultrasound guidance, the left common femoral artery was assessed for patency and appropriate access site. Micropuncture access was obtained under direct visualization. Permanent ultrasound image was saved to the medical record. (Supports +76937)

SELECTIVE CATHETERIZATION:
A 6F sheath was placed. A guidewire and catheter were advanced over the aortic bifurcation to the right external iliac artery, then selectively into the right common femoral artery and superficial femoral artery. (Supports 36245)

INTRAVASCULAR ULTRASOUND:
IVUS was performed in the right SFA. Reference diameter measured 5.8mm proximally. The occlusion segment showed no detectable lumen. Distal reconstitution showed 5.2mm diameter. (Supports +37252)

INTERVENTION:
The chronic total occlusion of the right SFA was crossed using subintimal technique. Pre-dilation with 4mm balloon. A 6mm x 150mm self-expanding stent was deployed. Post-dilation to 5mm. Completion angiography showed <20% residual stenosis with brisk flow. (Supports 37226)`,
  tips: [
    'Each add-on code requires specific documentation',
    'US guidance requires permanent image storage',
    'IVUS requires measurements be recorded',
    'Selective cath requires catheter course description',
  ],
};

export function CaptureExampleModal({ isOpen, onClose }: CaptureExampleModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CAPTURE_EXAMPLE.opNoteExcerpt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <DialogTitle>Capture Optimization Example</DialogTitle>
          </div>
          <DialogDescription>
            See how proper documentation supports add-on code billing
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Scenario */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <h3 className="font-semibold text-sm text-slate-800 mb-1">
              {CAPTURE_EXAMPLE.title}
            </h3>
            <p className="text-sm text-slate-600">{CAPTURE_EXAMPLE.scenario}</p>
          </div>

          {/* Code breakdown */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="font-semibold text-sm text-blue-800 mb-3">
              Optimized Code Selection
            </h4>
            <div className="space-y-2">
              {CAPTURE_EXAMPLE.codes.map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between py-2 px-3 bg-white rounded border border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={item.code.startsWith('+') ? 'secondary' : 'default'} className="font-mono">
                      {item.code}
                    </Badge>
                    <span className="text-sm text-slate-700">{item.desc}</span>
                  </div>
                  <span className="font-mono text-sm text-blue-600 font-semibold">
                    {item.wrvu.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
              <span className="font-semibold text-blue-800">Total wRVU</span>
              <span className="font-mono text-lg text-blue-700 font-bold">
                {CAPTURE_EXAMPLE.totalWRVU.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Op note excerpt */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  Sample Op-Note Documentation
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 text-xs"
              >
                {copied ? (
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
            </div>
            <pre className="p-4 text-xs font-mono text-slate-700 whitespace-pre-wrap bg-white max-h-60 overflow-auto">
              {CAPTURE_EXAMPLE.opNoteExcerpt}
            </pre>
          </div>

          {/* Tips */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="font-semibold text-sm text-amber-800 mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Key Documentation Points
            </h4>
            <ul className="space-y-1">
              {CAPTURE_EXAMPLE.tips.map((tip, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <Button onClick={onClose}>Got It</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
