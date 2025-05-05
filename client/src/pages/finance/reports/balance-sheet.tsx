import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Download, 
  Calendar
} from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function BalanceSheetPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(new Date());
  const [dateOpen, setDateOpen] = useState(false);

  // Fetch balance sheet report
  const { data: report, isLoading } = useQuery({
    queryKey: [
      '/api/v1/finance/reports/balance-sheet',
      {
        asOfDate: asOfDate ? asOfDate.toISOString() : undefined,
      },
    ],
    refetchOnWindowFocus: false,
  });

  // Helper function to format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Group assets by element group
  const assetGroups = report?.assets ? 
    report.assets.reduce((groups: any, account: any) => {
      const groupName = account.elementGroup?.name || 'Other Assets';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(account);
      return groups;
    }, {}) : {};

  // Group liabilities by element group
  const liabilityGroups = report?.liabilities ? 
    report.liabilities.reduce((groups: any, account: any) => {
      const groupName = account.elementGroup?.name || 'Other Liabilities';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(account);
      return groups;
    }, {}) : {};

  // Group equity by element group
  const equityGroups = report?.equity ? 
    report.equity.reduce((groups: any, account: any) => {
      const groupName = account.elementGroup?.name || 'Other Equity';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(account);
      return groups;
    }, {}) : {};

  // Helper to calculate group totals
  const calculateGroupTotal = (accounts: any[]) => {
    return accounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);
  };

  // Calculate total liabilities and equity combined
  const totalLiabilitiesAndEquity = report ? 
    (parseFloat(report.totalLiabilities) + parseFloat(report.totalEquity)).toFixed(2) : "0.00";

  return (
    <AppLayout title="Balance Sheet">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/finance/reports")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
          </div>

          <div className="flex items-center gap-2">
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Calendar className="h-4 w-4" />
                  {asOfDate ? format(asOfDate, "PP") : "As of Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={asOfDate}
                  onSelect={(date) => {
                    setAsOfDate(date);
                    setDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => {
                    toast({
                      title: "Export to PDF",
                      description: "The report will be exported as a PDF file.",
                    });
                  }}
                >
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast({
                      title: "Export to Excel",
                      description: "The report will be exported as an Excel file.",
                    });
                  }}
                >
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">
              Balance Sheet
            </CardTitle>
            <CardDescription>
              {asOfDate
                ? `As of ${format(asOfDate, "PP")}`
                : "As of today"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Assets Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Assets</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(assetGroups).map(([groupName, accounts]: [string, any]) => (
                        <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-medium">{groupName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateGroupTotal(accounts))}
                            </TableCell>
                          </TableRow>
                          {accounts.map((account: any) => (
                            <TableRow key={account.id}>
                              <TableCell className="pl-8">
                                {account.accountName} ({account.accountCode})
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(account.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Total Assets</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.totalAssets) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Liabilities Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Liabilities</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(liabilityGroups).map(([groupName, accounts]: [string, any]) => (
                        <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-medium">{groupName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateGroupTotal(accounts))}
                            </TableCell>
                          </TableRow>
                          {accounts.map((account: any) => (
                            <TableRow key={account.id}>
                              <TableCell className="pl-8">
                                {account.accountName} ({account.accountCode})
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(account.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Total Liabilities</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.totalLiabilities) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Equity Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Equity</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(equityGroups).map(([groupName, accounts]: [string, any]) => (
                        <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-medium">{groupName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateGroupTotal(accounts))}
                            </TableCell>
                          </TableRow>
                          {accounts.map((account: any) => (
                            <TableRow key={account.id}>
                              <TableCell className="pl-8">
                                {account.accountName} ({account.accountCode})
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(account.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Total Equity</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.totalEquity) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Total Liabilities and Equity */}
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md">
                  <h3 className="text-xl font-bold">Total Liabilities and Equity</h3>
                  <div className="text-xl font-bold">
                    {formatCurrency(totalLiabilitiesAndEquity)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}