import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface HierarchicalNode {
  name: string;
  amount: string;
  children?: { [key: string]: HierarchicalNode };
}

interface HierarchicalReport {
  [key: string]: HierarchicalNode;
}

interface HierarchicalReportProps {
  hierarchy: HierarchicalReport;
  title: string;
  totalAmount: string;
}

const formatCurrency = (amount: string | number) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numAmount);
};

export function HierarchicalReport({ hierarchy, title, totalAmount }: HierarchicalReportProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleExpansion = (nodePath: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodePath)) {
      newExpanded.delete(nodePath);
    } else {
      newExpanded.add(nodePath);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node: HierarchicalNode, path: string, level: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    const isExpanded = expandedNodes.has(path);

    // Main row
    rows.push(
      <TableRow key={path} className={level > 0 ? "bg-muted/20" : ""}>
        <TableCell style={{ paddingLeft: `${level * 20 + 12}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleExpansion(path)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            <span className={level === 0 ? "font-semibold" : level === 1 ? "font-medium" : ""}>
              {node.name}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right font-mono">
          {formatCurrency(node.amount)}
        </TableCell>
      </TableRow>
    );

    // Children rows (if expanded)
    if (hasChildren && isExpanded && node.children) {
      Object.entries(node.children).forEach(([childKey, childNode]) => {
        const childPath = `${path}.${childKey}`;
        rows.push(...renderNode(childNode, childPath, level + 1));
      });
    }

    return rows;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-lg font-bold">
          {formatCurrency(totalAmount)}
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(hierarchy).map(([key, node]) => {
            return renderNode(node, key);
          })}
        </TableBody>
      </Table>
    </div>
  );
}