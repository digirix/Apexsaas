import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  BarChart3, 
  Download, 
  Filter, 
  Calendar,
  DollarSign
} from "lucide-react";

import { AppLayout } from "@/components/app-layout";
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

export default function ProfitAndLossPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1)); // Jan 1st of current year
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Fetch profit and loss report
  const { data: report, isLoading } = useQuery({
    queryKey: [
      '/api/v1/finance/reports/profit-loss',
      {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
      },
    ],
    refetchOnWindowFocus: false,
  });

  // Handle date filter changes
  const applyDateFilter = () => {
    setStartDateOpen(false);
    setEndDateOpen(false);
  };

  // Helper function to format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Group revenue accounts by sub-element group
  const revenueGroups = report?.revenues ? 
    report.revenues.reduce((groups: any, account: any) => {
      const groupName = account.subElementGroup?.name || 'Other Income';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(account);
      return groups;
    }, {}) : {};

  // Group expense accounts by sub-element group
  const expenseGroups = report?.expenses ? 
    report.expenses.reduce((groups: any, account: any) => {
      const groupName = account.subElementGroup?.name || 'Other Expenses';
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

  return (
    <AppLayout title="Profit & Loss">
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
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
          </div>

          <div className="flex items-center gap-2">
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Calendar className="h-4 w-4" />
                  {startDate ? format(startDate, "PP") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    applyDateFilter();
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Calendar className="h-4 w-4" />
                  {endDate ? format(endDate, "PP") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    applyDateFilter();
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
              Profit & Loss Statement
            </CardTitle>
            <CardDescription>
              {startDate && endDate
                ? `For the period ${format(startDate, "PP")} to ${format(endDate, "PP")}`
                : "For the current period"}
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
                {/* Revenue Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Revenue</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(revenueGroups).map(([groupName, accounts]: [string, any]) => (
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
                        <TableCell>Total Revenue</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.totalRevenue) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Expenses Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Expenses</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(expenseGroups).map(([groupName, accounts]: [string, any]) => (
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
                        <TableCell>Total Expenses</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.totalExpense) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Net Income */}
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md">
                  <h3 className="text-xl font-bold">Net Income</h3>
                  <div className={`text-xl font-bold ${parseFloat(report?.netIncome || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {report ? formatCurrency(report.netIncome) : formatCurrency(0)}
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