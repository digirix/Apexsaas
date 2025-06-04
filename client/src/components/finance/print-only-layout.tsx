import React from "react";
import { format } from "date-fns";
import { HierarchicalReport } from "./hierarchical-report";
import { FilteredReportDisplay } from "./filtered-report-display";

interface PrintOnlyReportProps {
  title: string;
  subtitle?: string;
  reportData: any;
  displayLevel: string;
  companyName?: string;
  fromDate?: Date;
  toDate?: Date;
  asOfDate?: Date;
}

const formatCurrency = (amount: string | number) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numAmount);
};

export function PrintOnlyProfitLoss({
  title,
  subtitle,
  reportData,
  displayLevel,
  companyName = "Your Company",
  fromDate,
  toDate
}: PrintOnlyReportProps) {
  const filteredRevenueHierarchy = React.useMemo(() => {
    if (!reportData?.incomeHierarchy) return {};
    if (displayLevel === 'all') return reportData.incomeHierarchy;
    
    const getLevelNumber = (level: string): number => {
      switch (level) {
        case 'main': return 0;
        case 'element': return 1;
        case 'sub_element': return 2;
        case 'detailed': return 3;
        case 'account': return 4;
        default: return 5;
      }
    };

    const flattenToLevel = (hierarchy: any, targetLevel: number): any => {
      if (!hierarchy || typeof hierarchy !== 'object') return {};
      
      const result: any = {};
      
      const traverse = (node: any, currentLevel: number, path: string[] = []) => {
        if (currentLevel === targetLevel) {
          const totalAmount = calculateTotalAmount(node);
          const key = path.join('_') || node.name;
          result[key] = {
            name: node.name,
            amount: totalAmount.toString()
          };
          return;
        }
        
        if (node.children && currentLevel < targetLevel) {
          for (const [childKey, child] of Object.entries(node.children)) {
            traverse(child, currentLevel + 1, [...path, childKey]);
          }
        }
      };
      
      for (const [key, node] of Object.entries(hierarchy)) {
        traverse(node, 0, [key]);
      }
      
      return result;
    };

    const calculateTotalAmount = (node: any): number => {
      if (!node.children) {
        return parseFloat(node.amount || '0');
      }
      
      let total = 0;
      for (const child of Object.values(node.children)) {
        total += calculateTotalAmount(child as any);
      }
      return total;
    };

    const targetLevel = getLevelNumber(displayLevel);
    return flattenToLevel(reportData.incomeHierarchy, targetLevel);
  }, [reportData?.incomeHierarchy, displayLevel]);

  const filteredExpenseHierarchy = React.useMemo(() => {
    if (!reportData?.expenseHierarchy) return {};
    if (displayLevel === 'all') return reportData.expenseHierarchy;
    
    const getLevelNumber = (level: string): number => {
      switch (level) {
        case 'main': return 0;
        case 'element': return 1;
        case 'sub_element': return 2;
        case 'detailed': return 3;
        case 'account': return 4;
        default: return 5;
      }
    };

    const flattenToLevel = (hierarchy: any, targetLevel: number): any => {
      if (!hierarchy || typeof hierarchy !== 'object') return {};
      
      const result: any = {};
      
      const traverse = (node: any, currentLevel: number, path: string[] = []) => {
        if (currentLevel === targetLevel) {
          const totalAmount = calculateTotalAmount(node);
          const key = path.join('_') || node.name;
          result[key] = {
            name: node.name,
            amount: totalAmount.toString()
          };
          return;
        }
        
        if (node.children && currentLevel < targetLevel) {
          for (const [childKey, child] of Object.entries(node.children)) {
            traverse(child, currentLevel + 1, [...path, childKey]);
          }
        }
      };
      
      for (const [key, node] of Object.entries(hierarchy)) {
        traverse(node, 0, [key]);
      }
      
      return result;
    };

    const calculateTotalAmount = (node: any): number => {
      if (!node.children) {
        return parseFloat(node.amount || '0');
      }
      
      let total = 0;
      for (const child of Object.values(node.children)) {
        total += calculateTotalAmount(child as any);
      }
      return total;
    };

    const targetLevel = getLevelNumber(displayLevel);
    return flattenToLevel(reportData.expenseHierarchy, targetLevel);
  }, [reportData?.expenseHierarchy, displayLevel]);

  return (
    <div className="print-only bg-white text-black min-h-screen p-8">
      <style>{`
        @media print {
          .print-only { 
            margin: 0 !important; 
            padding: 20px !important;
            color: black !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{companyName}</h1>
        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        {subtitle && <h3 className="text-lg mb-2">{subtitle}</h3>}
        <p className="text-sm">
          {fromDate && toDate
            ? `For the period from ${format(fromDate, "PP")} to ${format(toDate, "PP")}`
            : "For the current period"}
        </p>
      </div>

      {/* Income Section */}
      <div className="mb-8">
        {displayLevel !== 'all' ? (
          <FilteredReportDisplay
            data={filteredRevenueHierarchy}
            title="Income"
            totalAmount={reportData?.totalIncome || "0"}
            displayLevel={displayLevel}
          />
        ) : filteredRevenueHierarchy && Object.keys(filteredRevenueHierarchy).length > 0 ? (
          <HierarchicalReport
            hierarchy={filteredRevenueHierarchy}
            title="Income"
            totalAmount={reportData?.totalIncome || "0"}
          />
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-2">Revenues</h3>
            <p>No revenue accounts with balances found.</p>
          </div>
        )}
      </div>

      {/* Expense Section */}
      <div className="mb-8">
        {displayLevel !== 'all' ? (
          <FilteredReportDisplay
            data={filteredExpenseHierarchy}
            title="Expenses"
            totalAmount={reportData?.totalExpenses || "0"}
            displayLevel={displayLevel}
          />
        ) : filteredExpenseHierarchy && Object.keys(filteredExpenseHierarchy).length > 0 ? (
          <HierarchicalReport
            hierarchy={filteredExpenseHierarchy}
            title="Expenses"
            totalAmount={reportData?.totalExpenses || "0"}
          />
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-2">Expenses</h3>
            <p>No expense accounts with balances found.</p>
          </div>
        )}
      </div>

      {/* Net Profit */}
      <div className="border-t-2 border-black pt-4">
        <div className="flex justify-between items-center font-bold text-lg">
          <span>Net Profit</span>
          <span className={parseFloat(reportData?.netProfit || "0") >= 0 ? "" : "text-red-600"}>
            {reportData ? formatCurrency(reportData.netProfit) : formatCurrency(0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PrintOnlyBalanceSheet({
  title,
  subtitle,
  reportData,
  displayLevel,
  companyName = "Your Company",
  asOfDate
}: PrintOnlyReportProps) {
  const filteredAssetsHierarchy = React.useMemo(() => {
    if (!reportData?.assetsHierarchy) return {};
    if (displayLevel === 'all') return reportData.assetsHierarchy;
    
    const getLevelNumber = (level: string): number => {
      switch (level) {
        case 'main': return 0;
        case 'element': return 1;
        case 'sub_element': return 2;
        case 'detailed': return 3;
        case 'account': return 4;
        default: return 5;
      }
    };

    const flattenToLevel = (hierarchy: any, targetLevel: number): any => {
      if (!hierarchy || typeof hierarchy !== 'object') return {};
      
      const result: any = {};
      
      const traverse = (node: any, currentLevel: number, path: string[] = []) => {
        if (currentLevel === targetLevel) {
          const totalAmount = calculateTotalAmount(node);
          const key = path.join('_') || node.name;
          result[key] = {
            name: node.name,
            amount: totalAmount.toString()
          };
          return;
        }
        
        if (node.children && currentLevel < targetLevel) {
          for (const [childKey, child] of Object.entries(node.children)) {
            traverse(child, currentLevel + 1, [...path, childKey]);
          }
        }
      };
      
      for (const [key, node] of Object.entries(hierarchy)) {
        traverse(node, 0, [key]);
      }
      
      return result;
    };

    const calculateTotalAmount = (node: any): number => {
      if (!node.children) {
        return parseFloat(node.amount || '0');
      }
      
      let total = 0;
      for (const child of Object.values(node.children)) {
        total += calculateTotalAmount(child as any);
      }
      return total;
    };

    const targetLevel = getLevelNumber(displayLevel);
    return flattenToLevel(reportData.assetsHierarchy, targetLevel);
  }, [reportData?.assetsHierarchy, displayLevel]);

  const filteredLiabilitiesHierarchy = React.useMemo(() => {
    if (!reportData?.liabilitiesHierarchy) return {};
    if (displayLevel === 'all') return reportData.liabilitiesHierarchy;
    
    const getLevelNumber = (level: string): number => {
      switch (level) {
        case 'main': return 0;
        case 'element': return 1;
        case 'sub_element': return 2;
        case 'detailed': return 3;
        case 'account': return 4;
        default: return 5;
      }
    };

    const flattenToLevel = (hierarchy: any, targetLevel: number): any => {
      if (!hierarchy || typeof hierarchy !== 'object') return {};
      
      const result: any = {};
      
      const traverse = (node: any, currentLevel: number, path: string[] = []) => {
        if (currentLevel === targetLevel) {
          const totalAmount = calculateTotalAmount(node);
          const key = path.join('_') || node.name;
          result[key] = {
            name: node.name,
            amount: totalAmount.toString()
          };
          return;
        }
        
        if (node.children && currentLevel < targetLevel) {
          for (const [childKey, child] of Object.entries(node.children)) {
            traverse(child, currentLevel + 1, [...path, childKey]);
          }
        }
      };
      
      for (const [key, node] of Object.entries(hierarchy)) {
        traverse(node, 0, [key]);
      }
      
      return result;
    };

    const calculateTotalAmount = (node: any): number => {
      if (!node.children) {
        return parseFloat(node.amount || '0');
      }
      
      let total = 0;
      for (const child of Object.values(node.children)) {
        total += calculateTotalAmount(child as any);
      }
      return total;
    };

    const targetLevel = getLevelNumber(displayLevel);
    return flattenToLevel(reportData.liabilitiesHierarchy, targetLevel);
  }, [reportData?.liabilitiesHierarchy, displayLevel]);

  const filteredEquityHierarchy = React.useMemo(() => {
    if (!reportData?.equityHierarchy) return {};
    if (displayLevel === 'all') return reportData.equityHierarchy;
    
    const getLevelNumber = (level: string): number => {
      switch (level) {
        case 'main': return 0;
        case 'element': return 1;
        case 'sub_element': return 2;
        case 'detailed': return 3;
        case 'account': return 4;
        default: return 5;
      }
    };

    const flattenToLevel = (hierarchy: any, targetLevel: number): any => {
      if (!hierarchy || typeof hierarchy !== 'object') return {};
      
      const result: any = {};
      
      const traverse = (node: any, currentLevel: number, path: string[] = []) => {
        if (currentLevel === targetLevel) {
          const totalAmount = calculateTotalAmount(node);
          const key = path.join('_') || node.name;
          result[key] = {
            name: node.name,
            amount: totalAmount.toString()
          };
          return;
        }
        
        if (node.children && currentLevel < targetLevel) {
          for (const [childKey, child] of Object.entries(node.children)) {
            traverse(child, currentLevel + 1, [...path, childKey]);
          }
        }
      };
      
      for (const [key, node] of Object.entries(hierarchy)) {
        traverse(node, 0, [key]);
      }
      
      return result;
    };

    const calculateTotalAmount = (node: any): number => {
      if (!node.children) {
        return parseFloat(node.amount || '0');
      }
      
      let total = 0;
      for (const child of Object.values(node.children)) {
        total += calculateTotalAmount(child as any);
      }
      return total;
    };

    const targetLevel = getLevelNumber(displayLevel);
    return flattenToLevel(reportData.equityHierarchy, targetLevel);
  }, [reportData?.equityHierarchy, displayLevel]);

  const totalLiabilitiesAndEquity = React.useMemo(() => {
    const liabilities = parseFloat(reportData?.totalLiabilities || '0');
    const equity = parseFloat(reportData?.totalEquity || '0');
    return liabilities + equity;
  }, [reportData?.totalLiabilities, reportData?.totalEquity]);

  return (
    <div className="print-only bg-white text-black min-h-screen p-8">
      <style>{`
        @media print {
          .print-only { 
            margin: 0 !important; 
            padding: 20px !important;
            color: black !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{companyName}</h1>
        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        {subtitle && <h3 className="text-lg mb-2">{subtitle}</h3>}
        <p className="text-sm">
          {asOfDate ? `As of ${format(asOfDate, "PP")}` : "As of today"}
        </p>
      </div>

      {/* Assets Section */}
      <div className="mb-8">
        {displayLevel !== 'all' ? (
          <FilteredReportDisplay
            data={filteredAssetsHierarchy}
            title="Assets"
            totalAmount={reportData?.totalAssets || "0"}
            displayLevel={displayLevel}
          />
        ) : filteredAssetsHierarchy && Object.keys(filteredAssetsHierarchy).length > 0 ? (
          <HierarchicalReport
            hierarchy={filteredAssetsHierarchy}
            title="Assets"
            totalAmount={reportData?.totalAssets || "0"}
          />
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-2">Assets</h3>
            <p>No asset accounts with balances found.</p>
          </div>
        )}
      </div>

      {/* Liabilities Section */}
      <div className="mb-8">
        {displayLevel !== 'all' ? (
          <FilteredReportDisplay
            data={filteredLiabilitiesHierarchy}
            title="Liabilities"
            totalAmount={reportData?.totalLiabilities || "0"}
            displayLevel={displayLevel}
          />
        ) : filteredLiabilitiesHierarchy && Object.keys(filteredLiabilitiesHierarchy).length > 0 ? (
          <HierarchicalReport
            hierarchy={filteredLiabilitiesHierarchy}
            title="Liabilities"
            totalAmount={reportData?.totalLiabilities || "0"}
          />
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-2">Liabilities</h3>
            <p>No liability accounts with balances found.</p>
          </div>
        )}
      </div>

      {/* Equity Section */}
      <div className="mb-8">
        {displayLevel !== 'all' ? (
          <FilteredReportDisplay
            data={filteredEquityHierarchy}
            title="Equity"
            totalAmount={reportData?.totalEquity || "0"}
            displayLevel={displayLevel}
          />
        ) : filteredEquityHierarchy && Object.keys(filteredEquityHierarchy).length > 0 ? (
          <HierarchicalReport
            hierarchy={filteredEquityHierarchy}
            title="Equity"
            totalAmount={reportData?.totalEquity || "0"}
          />
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-2">Equity</h3>
            <p>No equity accounts with balances found.</p>
          </div>
        )}
      </div>

      {/* Total Liabilities and Equity */}
      <div className="border-t-2 border-black pt-4">
        <div className="flex justify-between items-center font-bold text-lg">
          <span>Total Liabilities and Equity</span>
          <span>{formatCurrency(totalLiabilitiesAndEquity)}</span>
        </div>
      </div>
    </div>
  );
}