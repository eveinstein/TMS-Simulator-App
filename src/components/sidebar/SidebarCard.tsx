'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SidebarCard as SidebarCardType } from '@/content/sidebarContent';

interface SidebarCardProps {
  card: SidebarCardType;
  defaultExpanded?: boolean;
}

export function SidebarCard({ card, defaultExpanded = false }: SidebarCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Card Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">{card.title}</h3>
          {card.subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{card.subtitle}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {/* Card Content - Expandable */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {/* Main content */}
          {card.content && (
            <p className="text-sm text-slate-600">{card.content}</p>
          )}

          {/* Table */}
          {card.table && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    {card.table.headers.map((header, i) => (
                      <th
                        key={i}
                        className="px-2 py-1.5 text-left font-semibold text-slate-700 border-b border-slate-200"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {card.table.rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={cn(
                            "px-2 py-1.5 text-slate-600",
                            j === 0 && "font-medium text-slate-800"
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bullets */}
          {card.bullets && card.bullets.length > 0 && (
            <ul className="space-y-1">
              {card.bullets.map((bullet, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Examples */}
          {card.examples && card.examples.length > 0 && (
            <div className="space-y-2">
              {card.examples.map((example, i) => (
                <div key={i} className="bg-slate-50 rounded p-2">
                  <p className="text-xs font-medium text-slate-700 mb-1">
                    {example.label}
                  </p>
                  <p className="text-xs text-slate-600 whitespace-pre-line">
                    {example.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {card.footer && (
            <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">
              {card.footer}
            </p>
          )}

          {/* Code references */}
          {card.codeRef && card.codeRef.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {card.codeRef.map((code) => (
                <span
                  key={code}
                  className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-mono rounded"
                >
                  {code}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
