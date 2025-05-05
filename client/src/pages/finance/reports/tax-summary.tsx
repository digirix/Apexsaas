import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  FileText
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

export default function TaxSummaryPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1)); // Jan 1st of current year
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Fetch tax summary report
  const { data: report, isLoading } = useQuery({
    queryKey: [
      '/api/v1/finance/reports/tax-summary',
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

  // Group tax items by jurisdiction
  const taxJurisdictionGroups = report?.taxItems ? 
    report.taxItems.reduce((groups: any, item: any) => {
      const groupName = item.jurisdiction?.name || 'Other';
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
    <AppLayout title="Tax Summary">
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
            <h1 className="text-2xl font-bold">Tax Summary</h1>
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
              Tax Summary Report
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
                {/* Tax Summary Table */}
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tax Item</TableHead>
                        <TableHead>Jurisdiction</TableHead>
                        <TableHead>Rate (%)</TableHead>
                        <TableHead>Tax Base</TableHead>
                        <TableHead className="text-right">Tax Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(taxJurisdictionGroups).map(([jurisdictionName, items]: [string, any]) => (
                        <React.Fragment key={jurisdictionName}>
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-medium" colSpan={4}>{jurisdictionName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(calculateGroupTotal(items))}
                            </TableCell>
                          </TableRow>
                          {items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="pl-8">
                                {item.description}
                              </TableCell>
                              <TableCell>
                                {item.jurisdiction?.name}
                              </TableCell>
                              <TableCell>
                                {item.taxRate}%
                              </TableCell>
                              <TableCell>
                                {formatCurrency(item.taxBase)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell colSpan={4}>Total Tax Liability</TableCell>
                        <TableCell className="text-right">
                          {report ? formatCurrency(report.totalTaxLiability) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Tax Payments Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tax Payments</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report?.taxPayments?.length ? (
                        <>
                          {report.taxPayments.map((payment: any) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {format(new Date(payment.date), "PP")}
                              </TableCell>
                              <TableCell>
                                {payment.description}
                              </TableCell>
                              <TableCell>
                                {payment.reference}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold">
                            <TableCell colSpan={3}>Total Tax Payments</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totalTaxPayments)}
                            </TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No tax payments recorded for this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Net Tax Position */}
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md">
                  <h3 className="text-xl font-bold">Net Tax Position</h3>
                  <div className={`text-xl font-bold ${parseFloat(report?.netTaxPosition || "0") <= 0 ? "text-green-600" : "text-red-600"}`}>
                    {report ? formatCurrency(report.netTaxPosition) : formatCurrency(0)}
                  </div>
                </div>

                <div className="bg-muted/10 p-4 rounded-md">
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Tax Filing Deadlines</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Next filing due: {report?.nextFilingDate ? format(new Date(report.nextFilingDate), "PP") : "N/A"}
                      </p>
                    </div>
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