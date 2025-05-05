import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  TrendingUp
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

export default function CashFlowPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1)); // Jan 1st of current year
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Fetch cash flow report
  const { data: report, isLoading } = useQuery({
    queryKey: [
      '/api/v1/finance/reports/cash-flow',
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

  // Group operating activities
  const operatingGroups = report?.operatingActivities ? 
    report.operatingActivities.reduce((groups: any, item: any) => {
      const groupName = item.category || 'Other Operating Activities';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(item);
      return groups;
    }, {}) : {};

  // Group investing activities
  const investingGroups = report?.investingActivities ? 
    report.investingActivities.reduce((groups: any, item: any) => {
      const groupName = item.category || 'Other Investing Activities';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(item);
      return groups;
    }, {}) : {};

  // Group financing activities
  const financingGroups = report?.financingActivities ? 
    report.financingActivities.reduce((groups: any, item: any) => {
      const groupName = item.category || 'Other Financing Activities';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(item);
      return groups;
    }, {}) : {};

  // Helper to calculate group totals
  const calculateGroupTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  };

  return (
    <AppLayout title="Cash Flow">
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
            <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
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
              Cash Flow Statement
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
                {/* Starting Cash Balance */}
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md">
                  <h3 className="text-xl font-bold">Starting Cash Balance</h3>
                  <div className="text-xl font-bold">
                    {report ? formatCurrency(report.startingCashBalance) : formatCurrency(0)}
                  </div>
                </div>

                {/* Operating Activities Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Operating Activities</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(operatingGroups).map(([groupName, items]: [string, any]) => (
                        <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-medium">{groupName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateGroupTotal(items))}
                            </TableCell>
                          </TableRow>
                          {items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="pl-8">
                                {item.description}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Net Cash from Operating Activities</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.netOperatingCash) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Investing Activities Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Investing Activities</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(investingGroups).map(([groupName, items]: [string, any]) => (
                        <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-medium">{groupName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateGroupTotal(items))}
                            </TableCell>
                          </TableRow>
                          {items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="pl-8">
                                {item.description}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Net Cash from Investing Activities</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.netInvestingCash) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Financing Activities Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Financing Activities</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(financingGroups).map(([groupName, items]: [string, any]) => (
                        <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-medium">{groupName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateGroupTotal(items))}
                            </TableCell>
                          </TableRow>
                          {items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="pl-8">
                                {item.description}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell>Net Cash from Financing Activities</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.netFinancingCash) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Net Change in Cash */}
                <div className="flex justify-between items-center p-4 rounded-md bg-primary/10">
                  <h3 className="text-xl font-bold">Net Change in Cash</h3>
                  <div className={`text-xl font-bold ${parseFloat(report?.netCashChange || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {report ? formatCurrency(report.netCashChange) : formatCurrency(0)}
                  </div>
                </div>

                {/* Ending Cash Balance */}
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md">
                  <h3 className="text-xl font-bold">Ending Cash Balance</h3>
                  <div className="text-xl font-bold">
                    {report ? formatCurrency(report.endingCashBalance) : formatCurrency(0)}
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