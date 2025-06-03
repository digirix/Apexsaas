import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Account {
  id: number;
  accountNumber: string;
  name: string;
  balance: string;
}

interface DetailedGroup {
  name: string;
  total: number;
  accounts: Account[];
}

interface SubElementGroup {
  name: string;
  total: number;
  detailedGroups: Record<string, DetailedGroup>;
}

interface ElementGroup {
  name: string;
  total: number;
  subElementGroups: Record<string, SubElementGroup>;
}

interface MainGroup {
  name: string;
  total: number;
  elementGroups: Record<string, ElementGroup>;
}

interface HierarchicalReportProps {
  hierarchy: Record<string, MainGroup>;
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
  const [expandedMainGroups, setExpandedMainGroups] = useState<Set<string>>(new Set());
  const [expandedElementGroups, setExpandedElementGroups] = useState<Set<string>>(new Set());
  const [expandedSubElementGroups, setExpandedSubElementGroups] = useState<Set<string>>(new Set());
  const [expandedDetailedGroups, setExpandedDetailedGroups] = useState<Set<string>>(new Set());

  const toggleMainGroup = (groupName: string) => {
    const newExpanded = new Set(expandedMainGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedMainGroups(newExpanded);
  };

  const toggleElementGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedElementGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedElementGroups(newExpanded);
  };

  const toggleSubElementGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedSubElementGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedSubElementGroups(newExpanded);
  };

  const toggleDetailedGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedDetailedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedDetailedGroups(newExpanded);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Hierarchy</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(hierarchy).map(([mainGroupName, mainGroup]) => {
            const mainGroupKey = mainGroupName;
            const isMainGroupExpanded = expandedMainGroups.has(mainGroupKey);

            return (
              <React.Fragment key={mainGroupKey}>
                {/* Level 1: Main Group */}
                <TableRow className="bg-slate-100 font-bold border-b-2">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto font-bold"
                      onClick={() => toggleMainGroup(mainGroupKey)}
                    >
                      {isMainGroupExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                      {mainGroup.name}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(mainGroup.total)}
                  </TableCell>
                </TableRow>

                {/* Level 2: Element Groups */}
                {isMainGroupExpanded && Object.entries(mainGroup.elementGroups).map(([elementGroupName, elementGroup]) => {
                  const elementGroupKey = `${mainGroupKey}-${elementGroupName}`;
                  const isElementGroupExpanded = expandedElementGroups.has(elementGroupKey);

                  return (
                    <React.Fragment key={elementGroupKey}>
                      <TableRow className="bg-slate-50 font-semibold">
                        <TableCell className="pl-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto font-semibold"
                            onClick={() => toggleElementGroup(elementGroupKey)}
                          >
                            {isElementGroupExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                            {elementGroup.name}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(elementGroup.total)}
                        </TableCell>
                      </TableRow>

                      {/* Level 3: Sub Element Groups */}
                      {isElementGroupExpanded && Object.entries(elementGroup.subElementGroups).map(([subElementGroupName, subElementGroup]) => {
                        const subElementGroupKey = `${elementGroupKey}-${subElementGroupName}`;
                        const isSubElementGroupExpanded = expandedSubElementGroups.has(subElementGroupKey);

                        return (
                          <React.Fragment key={subElementGroupKey}>
                            <TableRow className="bg-slate-25 font-medium">
                              <TableCell className="pl-12">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-auto font-medium"
                                  onClick={() => toggleSubElementGroup(subElementGroupKey)}
                                >
                                  {isSubElementGroupExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                                  {subElementGroup.name}
                                </Button>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(subElementGroup.total)}
                              </TableCell>
                            </TableRow>

                            {/* Level 4: Detailed Groups */}
                            {isSubElementGroupExpanded && Object.entries(subElementGroup.detailedGroups).map(([detailedGroupName, detailedGroup]) => {
                              const detailedGroupKey = `${subElementGroupKey}-${detailedGroupName}`;
                              const isDetailedGroupExpanded = expandedDetailedGroups.has(detailedGroupKey);

                              return (
                                <React.Fragment key={detailedGroupKey}>
                                  <TableRow className="font-medium text-slate-700">
                                    <TableCell className="pl-18">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-0 h-auto"
                                        onClick={() => toggleDetailedGroup(detailedGroupKey)}
                                      >
                                        {isDetailedGroupExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                                        {detailedGroup.name}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(detailedGroup.total)}
                                    </TableCell>
                                  </TableRow>

                                  {/* Level 5: Individual Accounts */}
                                  {isDetailedGroupExpanded && detailedGroup.accounts.map((account) => (
                                    <TableRow key={account.id} className="text-slate-600">
                                      <TableCell className="pl-24">
                                        {account.accountNumber} - {account.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(account.balance)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Total Row */}
          <TableRow className="font-bold border-t-2 bg-slate-200">
            <TableCell>Total {title}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(totalAmount)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}