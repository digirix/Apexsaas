import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  BarChart3, 
  Download, 
  Filter, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart as RechartPieChart,
  Pie, 
  Cell
} from "recharts";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HierarchicalReport } from "@/components/finance/hierarchical-report";

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

                <Separator />

                {/* Visualizations */}
                <div className="pt-4">
                  <Tabs defaultValue="charts" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="charts">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Revenue vs Expenses
                      </TabsTrigger>
                      <TabsTrigger value="breakdown">
                        <PieChart className="h-4 w-4 mr-2" />
                        Detailed Breakdown
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="charts" className="p-4">
                      <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses</h3>
                      {report && (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={[
                              {
                                name: 'Revenue',
                                amount: parseFloat(report.totalRevenue),
                                fill: '#22c55e'
                              },
                              {
                                name: 'Expenses',
                                amount: parseFloat(report.totalExpense),
                                fill: '#ef4444'
                              },
                              {
                                name: 'Net Income',
                                amount: parseFloat(report.netIncome),
                                fill: parseFloat(report.netIncome) >= 0 ? '#3b82f6' : '#f43f5e'
                              }
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis 
                              tickFormatter={(value) => 
                                new Intl.NumberFormat('en-US', {
                                  notation: 'compact',
                                  compactDisplay: 'short',
                                  currency: 'USD',
                                  style: 'currency',
                                }).format(value)
                              } 
                            />
                            <Tooltip 
                              formatter={(value) => formatCurrency(value as number)}
                              labelFormatter={(name) => `${name}`}
                            />
                            <Legend />
                            <Bar dataKey="amount" name="Amount" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                      
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center">
                                <DollarSign className="h-8 w-8 text-green-500 mb-2" />
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-2xl font-bold">
                                  {report ? formatCurrency(report.totalRevenue) : formatCurrency(0)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center">
                                <DollarSign className="h-8 w-8 text-red-500 mb-2" />
                                <p className="text-sm text-muted-foreground">Total Expenses</p>
                                <p className="text-2xl font-bold">
                                  {report ? formatCurrency(report.totalExpense) : formatCurrency(0)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col items-center">
                                {parseFloat(report?.netIncome || "0") >= 0 ? (
                                  <TrendingUp className="h-8 w-8 text-blue-500 mb-2" />
                                ) : (
                                  <TrendingDown className="h-8 w-8 text-red-500 mb-2" />
                                )}
                                <p className="text-sm text-muted-foreground">Net Income</p>
                                <p className={`text-2xl font-bold ${parseFloat(report?.netIncome || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {report ? formatCurrency(report.netIncome) : formatCurrency(0)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="breakdown" className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Revenue Breakdown */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
                          {report && report.revenues.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <RechartPieChart>
                                <Pie
                                  data={Object.entries(revenueGroups).map(([name, accounts]: [string, any], index) => ({
                                    name,
                                    value: calculateGroupTotal(accounts),
                                    fill: `hsl(${index * 40}, 70%, 50%)`
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={true}
                                  outerRadius={80}
                                  dataKey="value"
                                  nameKey="name"
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                  {Object.entries(revenueGroups).map(([name, accounts]: [string, any], index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                              </RechartPieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
                              <p className="text-muted-foreground">No revenue data available</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Expense Breakdown */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
                          {report && report.expenses.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <RechartPieChart>
                                <Pie
                                  data={Object.entries(expenseGroups).map(([name, accounts]: [string, any], index) => ({
                                    name,
                                    value: calculateGroupTotal(accounts),
                                    fill: `hsl(${index * 40}, 70%, 50%)`
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={true}
                                  outerRadius={80}
                                  dataKey="value"
                                  nameKey="name"
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                  {Object.entries(expenseGroups).map(([name, accounts]: [string, any], index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                              </RechartPieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
                              <p className="text-muted-foreground">No expense data available</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}