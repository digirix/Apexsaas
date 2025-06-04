import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoTooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function InfoTooltip({ content, side = 'top', className = '' }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`cursor-help ${className}`}>
            <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}