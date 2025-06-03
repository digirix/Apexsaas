import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PrintLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  companyName?: string;
  reportDate?: string;
}

export function PrintLayout({ title, subtitle, children, companyName = "Your Company Name", reportDate }: PrintLayoutProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Print Button - Hidden in print */}
      <div className="print:hidden mb-6 flex justify-end">
        <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Print Content */}
      <div className="print-content">
        {/* Header - Optimized for print */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-2xl font-bold print:text-xl print:font-semibold mb-1">
            {companyName}
          </h1>
          <h2 className="text-xl font-semibold print:text-lg mb-1">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground print:text-black print:text-xs mb-1">
              {subtitle}
            </p>
          )}
          {reportDate && (
            <p className="text-sm text-muted-foreground print:text-black print:text-xs">
              As of {reportDate}
            </p>
          )}
        </div>

        {/* Report Content */}
        <div className="print:text-sm">
          {children}
        </div>

        {/* Footer - Print only */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-center">
          <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}

// Print-specific hierarchical report component
interface PrintHierarchicalReportProps {
  hierarchy: any;
  title: string;
  totalAmount: string;
  level?: number;
}

export function PrintHierarchicalReport({ 
  hierarchy, 
  title, 
  totalAmount,
  level = 0 
}: PrintHierarchicalReportProps) {
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const getIndentation = (level: number) => {
    return `pl-${level * 4}`;
  };

  const renderHierarchy = (data: any, currentLevel: number = 0) => {
    return Object.entries(data).map(([key, node]: [string, any]) => (
      <div key={key} className="mb-1">
        {/* Group/Account Line */}
        <div className={`flex justify-between py-1 ${getIndentation(currentLevel)} ${
          currentLevel === 0 ? 'font-bold border-b border-gray-300 mb-2' :
          currentLevel === 1 ? 'font-semibold' :
          currentLevel === 2 ? 'font-medium' :
          'font-normal'
        }`}>
          <span className={currentLevel >= 4 ? 'text-sm' : ''}>
            {node.name}
          </span>
          <span className={`tabular-nums ${currentLevel >= 4 ? 'text-sm' : ''}`}>
            {formatAmount(node.amount)}
          </span>
        </div>

        {/* Children */}
        {node.children && Object.keys(node.children).length > 0 && (
          <div className="mb-2">
            {renderHierarchy(node.children, currentLevel + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-black">
        <h3 className="text-lg font-bold print:text-base">{title}</h3>
        <span className="text-lg font-bold print:text-base tabular-nums">
          {formatAmount(totalAmount)}
        </span>
      </div>
      
      <div className="space-y-1">
        {renderHierarchy(hierarchy)}
      </div>
    </div>
  );
}