import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FilteredNode {
  name: string;
  amount: string;
}

interface FilteredReportProps {
  data: { [key: string]: FilteredNode };
  title: string;
  totalAmount: string;
  displayLevel: string;
}

const formatCurrency = (amount: string | number) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numAmount);
};

const getLevelDescription = (level: string): string => {
  switch (level) {
    case 'main': return 'Main Groups';
    case 'element': return 'Element Groups';
    case 'sub_element': return 'Sub Element Groups';
    case 'detailed': return 'Detailed Groups';
    case 'account': return 'Account Names';
    default: return 'All Levels';
  }
};

export function FilteredReportDisplay({ data, title, totalAmount, displayLevel }: FilteredReportProps) {
  const entries = Object.entries(data);
  
  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">No {title.toLowerCase()} accounts with balances found.</p>
      </div>
    );
  }

  // For filtered levels, use compact table layout
  if (displayLevel !== 'all') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="text-sm text-muted-foreground">
            Showing: {getLevelDescription(displayLevel)}
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{getLevelDescription(displayLevel)}</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(([key, node]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{node.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(node.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Total {title}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // For 'all' level, fall back to hierarchical display
  return null;
}