import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  DollarSign,
  CircleDollarSign,
  Building2,
  BarChart3,
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
    
  // Prepare data for charts
  const balanceSheetPieData = useMemo(() => {
    if (!report) return [];
    
    return [
      { name: 'Assets', value: parseFloat(report.totalAssets) },
      { name: 'Liabilities', value: parseFloat(report.totalLiabilities) },
      { name: 'Equity', value: parseFloat(report.totalEquity) }
    ];
  }, [report]);
  
  const assetsBarData = useMemo(() => {
    if (!report?.assets) return [];
    
    return Object.entries(assetGroups).map(([name, accounts]: [string, any]) => ({
      name,
      value: calculateGroupTotal(accounts)
    }));
  }, [report, assetGroups]);
  
  const liabilitiesAndEquityData = useMemo(() => {
    if (!report) return [];
    
    const liabilitiesData = Object.entries(liabilityGroups).map(([name, accounts]: [string, any]) => ({
      name,
      value: calculateGroupTotal(accounts),
      category: 'Liabilities'
    }));
    
    const equityData = Object.entries(equityGroups).map(([name, accounts]: [string, any]) => ({
      name,
      value: calculateGroupTotal(accounts),
      category: 'Equity'
    }));
    
    return [...liabilitiesData, ...equityData];
  }, [report, liabilityGroups, equityGroups]);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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
        
        {/* Key Metrics Cards */}
        {!isLoading && report && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Assets</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(report.totalAssets)}</h3>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 dark:bg-amber-950">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Total Liabilities</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(report.totalLiabilities)}</h3>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded-full">
                    <CircleDollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Equity</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(report.totalEquity)}</h3>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="table">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Tabular View
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" /> Charts View
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="table">
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
      </TabsContent>
          
      <TabsContent value="charts">
        <div className="grid grid-cols-1 gap-6">
          {/* Balance Sheet Composition Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet Composition</CardTitle>
              <CardDescription>Distribution of assets, liabilities, and equity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartPieChart>
                    <Pie
                      data={balanceSheetPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {balanceSheetPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </RechartPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Assets Breakdown Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Assets Breakdown</CardTitle>
              <CardDescription>Distribution of assets by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetsBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="value" fill="#0088FE" name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Liabilities and Equity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Liabilities & Equity Breakdown</CardTitle>
              <CardDescription>Distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={liabilitiesAndEquityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="value" fill="#FFBB28" name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}