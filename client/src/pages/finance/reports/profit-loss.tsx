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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { FilteredReportDisplay } from "@/components/finance/filtered-report-display";
import { PrintOnlyProfitLoss } from "@/components/finance/print-only-layout";
import { PrintLayout, PrintHierarchicalReport } from "@/components/finance/print-layout";

export default function ProfitAndLossPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1)); // Jan 1st of current year
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [displayLevel, setDisplayLevel] = useState<string>("all");

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

  // Helper function to flatten hierarchy to specific level
  const flattenToLevel = (hierarchy: any, targetLevel: number): any => {
    if (!hierarchy || typeof hierarchy !== 'object') return {};
    
    const result: any = {};
    
    const traverse = (node: any, currentLevel: number, path: string[] = []) => {
      if (currentLevel === targetLevel) {
        // We've reached the target level, collect this node
        const totalAmount = calculateTotalAmount(node);
        const key = path.join('_') || node.name;
        result[key] = {
          name: node.name,
          amount: totalAmount.toString()
        };
        return;
      }
      
      // Continue traversing deeper
      if (node.children && currentLevel < targetLevel) {
        for (const [childKey, child] of Object.entries(node.children)) {
          traverse(child, currentLevel + 1, [...path, childKey]);
        }
      }
    };
    
    // Start traversal from each top-level node
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

  // Get level number from display level
  const getLevelNumber = (level: string): number => {
    switch (level) {
      case 'main': return 1;
      case 'element': return 2;
      case 'sub_element': return 3;
      case 'detailed': return 4;
      case 'account': return 5;
      default: return 5; // 'all'
    }
  };

  // Filter hierarchies based on selected level
  const filteredRevenueHierarchy = useMemo(() => {
    if (!report?.incomeHierarchy) return {};
    if (displayLevel === 'all') return report.incomeHierarchy;
    const targetLevel = getLevelNumber(displayLevel);
    return flattenToLevel(report.incomeHierarchy, targetLevel);
  }, [report?.incomeHierarchy, displayLevel]);

  const filteredExpenseHierarchy = useMemo(() => {
    if (!report?.expenseHierarchy) return {};
    if (displayLevel === 'all') return report.expenseHierarchy;
    const targetLevel = getLevelNumber(displayLevel);
    return flattenToLevel(report.expenseHierarchy, targetLevel);
  }, [report?.expenseHierarchy, displayLevel]);

  // Charts data preparation - using new hierarchical structure
  const chartData = report ? [
    {
      name: 'Income',
      amount: Math.abs(parseFloat(report.totalIncome || "0")),
      fill: '#22c55e'
    },
    {
      name: 'Expenses', 
      amount: parseFloat(report.totalExpenses || "0"),
      fill: '#ef4444'
    },
    {
      name: 'Net Profit',
      amount: parseFloat(report.netProfit || "0"),
      fill: parseFloat(report.netProfit || "0") >= 0 ? '#3b82f6' : '#f43f5e'
    }
  ] : [];

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

            <div className="flex items-center gap-2">
              <Select value={displayLevel} onValueChange={setDisplayLevel}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels (Account Name)</SelectItem>
                  <SelectItem value="detailed">Detailed Group</SelectItem>
                  <SelectItem value="sub_element">Sub Element Group</SelectItem>
                  <SelectItem value="element">Element Group</SelectItem>
                  <SelectItem value="main">Main Group</SelectItem>
                </SelectContent>
              </Select>

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
                  <DropdownMenuItem
                    onClick={() => window.print()}
                  >
                    Print Preview
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <PrintLayout
          title="Profit & Loss Statement"
          subtitle={startDate && endDate
            ? `For the period ${format(startDate, "PP")} to ${format(endDate, "PP")}`
            : "For the current period"}
          companyName="Accounting Firm"
          reportDate={endDate ? format(endDate, "PP") : format(new Date(), "PP")}
        >
          <Card className="print:shadow-none print:border-none">
          <CardHeader className="pb-2 print:hidden">
            <CardTitle className="text-xl">
              Profit & Loss Statement
            </CardTitle>
            <CardDescription>
              {startDate && endDate
                ? `For the period ${format(startDate, "PP")} to ${format(endDate, "PP")}`
                : "For the current period"}
            </CardDescription>
          </CardHeader>
          <CardContent className="print:p-0">
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
                {/* Income Section */}
                {displayLevel !== 'all' ? (
                  <FilteredReportDisplay
                    data={filteredRevenueHierarchy}
                    title="Income"
                    totalAmount={report?.totalIncome || "0"}
                    displayLevel={displayLevel}
                  />
                ) : filteredRevenueHierarchy && Object.keys(filteredRevenueHierarchy).length > 0 ? (
                  <HierarchicalReport
                    hierarchy={filteredRevenueHierarchy}
                    title="Income"
                    totalAmount={report?.totalIncome || "0"}
                  />
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Income</h3>
                    <p className="text-muted-foreground">No income accounts with balances found.</p>
                  </div>
                )}

                <Separator />

                {/* Expenses Section */}
                {displayLevel !== 'all' ? (
                  <FilteredReportDisplay
                    data={filteredExpenseHierarchy}
                    title="Expenses"
                    totalAmount={report?.totalExpenses || "0"}
                    displayLevel={displayLevel}
                  />
                ) : filteredExpenseHierarchy && Object.keys(filteredExpenseHierarchy).length > 0 ? (
                  <HierarchicalReport
                    hierarchy={filteredExpenseHierarchy}
                    title="Expenses"
                    totalAmount={report?.totalExpenses || "0"}
                  />
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Expenses</h3>
                    <p className="text-muted-foreground">No expense accounts with balances found.</p>
                  </div>
                )}

                <Separator />

                {/* Net Profit */}
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md">
                  <h3 className="text-xl font-bold">Net Profit</h3>
                  <div className={`text-xl font-bold ${parseFloat(report?.netProfit || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {report ? formatCurrency(report.netProfit) : formatCurrency(0)}
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
                      {chartData.length > 0 && (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={chartData}
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
                        {/* Income Breakdown */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Income Breakdown</h3>
                          {report && report.incomeHierarchy && Object.keys(report.incomeHierarchy).length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <RechartPieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Total Income",
                                      value: Math.abs(parseFloat(report.totalIncome || "0")),
                                      fill: "#22c55e"
                                    }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={true}
                                  outerRadius={80}
                                  dataKey="value"
                                  nameKey="name"
                                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                                >
                                  <Cell fill="#22c55e" />
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
                          {report && report.expenseHierarchy && Object.keys(report.expenseHierarchy).length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <RechartPieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Total Expenses",
                                      value: parseFloat(report.totalExpenses || "0"),
                                      fill: "#ef4444"
                                    }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={true}
                                  outerRadius={80}
                                  dataKey="value"
                                  nameKey="name"
                                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                                >
                                  <Cell fill="#ef4444" />
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
        </PrintLayout>

        {/* Print-only layout */}
        {report && (
          <PrintOnlyProfitLoss
            title="Profit & Loss Statement"
            subtitle={startDate && endDate
              ? `For the period from ${format(startDate, "PP")} to ${format(endDate, "PP")}`
              : "For the current period"}
            reportData={report}
            displayLevel={displayLevel}
            companyName="Accounting Firm"
            fromDate={startDate}
            toDate={endDate}
          />
        )}
      </div>
    </AppLayout>
  );
}