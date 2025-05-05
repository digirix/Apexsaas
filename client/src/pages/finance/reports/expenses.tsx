import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  Filter
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpenseReportPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1)); // Jan 1st of current year
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  // Fetch expense categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['/api/v1/finance/expense-categories'],
    refetchOnWindowFocus: false,
  });

  // Fetch expense report
  const { data: report, isLoading } = useQuery({
    queryKey: [
      '/api/v1/finance/reports/expenses',
      {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        categoryId
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

  // Group expenses by category
  const expenseGroups = report?.expenses ? 
    report.expenses.reduce((groups: any, expense: any) => {
      const groupName = expense.category?.name || 'Uncategorized';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(expense);
      return groups;
    }, {}) : {};

  // Helper to calculate group totals
  const calculateGroupTotal = (expenses: any[]) => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  };

  return (
    <AppLayout title="Expense Report">
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
            <h1 className="text-2xl font-bold">Expense Report</h1>
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

            <Select value={categoryId?.toString()} onValueChange={(value) => setCategoryId(value ? parseInt(value) : undefined)}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>{categoryId ? 'Filter Applied' : 'All Categories'}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories?.map((category: any) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">
              Expense Report
            </CardTitle>
            <CardDescription>
              {startDate && endDate
                ? `For the period ${format(startDate, "PP")} to ${format(endDate, "PP")}`
                : "For the current period"}
              {categoryId ? ' (Filtered by category)' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || loadingCategories ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Expenses Table */}
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(expenseGroups).map(([groupName, expenses]: [string, any]) => (
                        <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-medium" colSpan={3}>{groupName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateGroupTotal(expenses))}
                            </TableCell>
                          </TableRow>
                          {expenses.map((expense: any) => (
                            <TableRow key={expense.id}>
                              <TableCell className="pl-8">
                                {expense.description}
                              </TableCell>
                              <TableCell>
                                {format(new Date(expense.date), "PP")}
                              </TableCell>
                              <TableCell>
                                {expense.reference}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(expense.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>Total Expenses</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.totalExpenses) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Summary Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Summary by Category</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(expenseGroups).map(([groupName, expenses]: [string, any]) => (
                      <Card key={groupName} className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{groupName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl font-bold">
                            {formatCurrency(calculateGroupTotal(expenses))}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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