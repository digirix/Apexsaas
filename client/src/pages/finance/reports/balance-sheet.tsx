import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, FileDown, Printer, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Search form schema
const searchSchema = z.object({
  asOfDate: z.date(),
  comparisonDate: z.date().optional(),
  showComparison: z.boolean().default(false),
});

export default function BalanceSheetPage() {
  const { toast } = useToast();
  const [isSearched, setIsSearched] = useState(false);
  
  // Form
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      asOfDate: new Date(),
      comparisonDate: undefined,
      showComparison: false,
    },
  });
  
  // Get balance sheet data
  const { data: balanceSheetData, isLoading } = useQuery({
    queryKey: [
      '/api/v1/finance/reports/balance-sheet',
      {
        asOfDate: form.watch('asOfDate'),
        comparisonDate: form.watch('showComparison') ? form.watch('comparisonDate') : undefined,
      },
    ],
    enabled: isSearched,
    refetchOnWindowFocus: false,
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof searchSchema>) => {
    if (values.showComparison && !values.comparisonDate) {
      toast({
        title: "Validation Error",
        description: "Please select a comparison date",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearched(true);
  };
  
  // Format amounts
  const formatAmount = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Calculate percentage change
  const calculateChange = (current: number, previous: number | null) => {
    if (previous === null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  
  // Helper to render section rows
  const renderSectionRows = (accounts: any[], showComparison: boolean) => {
    return accounts?.map((account: any) => (
      <TableRow key={account.id}>
        <TableCell className="pl-8">{account.name}</TableCell>
        <TableCell className="text-right">{formatAmount(account.amount)}</TableCell>
        {showComparison && (
          <>
            <TableCell className="text-right">
              {account.previousAmount !== null ? formatAmount(account.previousAmount) : '-'}
            </TableCell>
            <TableCell className="text-right">
              {account.previousAmount !== null ? 
                `${calculateChange(account.amount, account.previousAmount)?.toFixed(2)}%` : 
                '-'}
            </TableCell>
          </>
        )}
      </TableRow>
    ));
  };
  
  // Determine if we're showing comparison data
  const showComparison = form.watch('showComparison');
  
  return (
    <AppLayout title="Balance Sheet">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
          <CardDescription>
            View your company's assets, liabilities, and equity at a specific point in time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="asOfDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>As of Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="showComparison"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Show Comparison</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                
                {form.watch('showComparison') && (
                  <FormField
                    control={form.control}
                    name="comparisonDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Comparison Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </form>
          </Form>
          
          {isSearched && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    Balance Sheet
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    As of {format(form.watch('asOfDate'), 'PPP')}
                    {showComparison && form.watch('comparisonDate') && (
                      ` compared to ${format(form.watch('comparisonDate'), 'PPP')}`
                    )}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Assets Section */}
                  <Card>
                    <CardHeader className="bg-muted py-2">
                      <CardTitle>Assets</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50%]">Account</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            {showComparison && (
                              <>
                                <TableHead className="text-right">Comparison</TableHead>
                                <TableHead className="text-right">Change %</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Current Assets Section */}
                          <TableRow className="font-medium">
                            <TableCell>Current Assets</TableCell>
                            <TableCell colSpan={showComparison ? 3 : 1}></TableCell>
                          </TableRow>
                          
                          {renderSectionRows(balanceSheetData?.assets?.current?.accounts || [], showComparison)}
                          
                          <TableRow className="font-medium bg-muted/50">
                            <TableCell>Total Current Assets</TableCell>
                            <TableCell className="text-right">
                              {formatAmount(balanceSheetData?.assets?.current?.total || 0)}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(balanceSheetData?.assets?.current?.previousTotal || 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    balanceSheetData?.assets?.current?.total || 0, 
                                    balanceSheetData?.assets?.current?.previousTotal || 0
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                          
                          {/* Non-Current Assets Section */}
                          <TableRow className="font-medium">
                            <TableCell>Non-Current Assets</TableCell>
                            <TableCell colSpan={showComparison ? 3 : 1}></TableCell>
                          </TableRow>
                          
                          {renderSectionRows(balanceSheetData?.assets?.nonCurrent?.accounts || [], showComparison)}
                          
                          <TableRow className="font-medium bg-muted/50">
                            <TableCell>Total Non-Current Assets</TableCell>
                            <TableCell className="text-right">
                              {formatAmount(balanceSheetData?.assets?.nonCurrent?.total || 0)}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(balanceSheetData?.assets?.nonCurrent?.previousTotal || 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    balanceSheetData?.assets?.nonCurrent?.total || 0, 
                                    balanceSheetData?.assets?.nonCurrent?.previousTotal || 0
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                          
                          {/* Total Assets */}
                          <TableRow className="font-medium text-lg">
                            <TableCell>Total Assets</TableCell>
                            <TableCell className="text-right">
                              {formatAmount(
                                (balanceSheetData?.assets?.current?.total || 0) +
                                (balanceSheetData?.assets?.nonCurrent?.total || 0)
                              )}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(
                                    (balanceSheetData?.assets?.current?.previousTotal || 0) +
                                    (balanceSheetData?.assets?.nonCurrent?.previousTotal || 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    (balanceSheetData?.assets?.current?.total || 0) + (balanceSheetData?.assets?.nonCurrent?.total || 0), 
                                    (balanceSheetData?.assets?.current?.previousTotal || 0) + (balanceSheetData?.assets?.nonCurrent?.previousTotal || 0)
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  {/* Liabilities Section */}
                  <Card>
                    <CardHeader className="bg-muted py-2">
                      <CardTitle>Liabilities</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50%]">Account</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            {showComparison && (
                              <>
                                <TableHead className="text-right">Comparison</TableHead>
                                <TableHead className="text-right">Change %</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Current Liabilities Section */}
                          <TableRow className="font-medium">
                            <TableCell>Current Liabilities</TableCell>
                            <TableCell colSpan={showComparison ? 3 : 1}></TableCell>
                          </TableRow>
                          
                          {renderSectionRows(balanceSheetData?.liabilities?.current?.accounts || [], showComparison)}
                          
                          <TableRow className="font-medium bg-muted/50">
                            <TableCell>Total Current Liabilities</TableCell>
                            <TableCell className="text-right">
                              {formatAmount(balanceSheetData?.liabilities?.current?.total || 0)}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(balanceSheetData?.liabilities?.current?.previousTotal || 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    balanceSheetData?.liabilities?.current?.total || 0, 
                                    balanceSheetData?.liabilities?.current?.previousTotal || 0
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                          
                          {/* Non-Current Liabilities Section */}
                          <TableRow className="font-medium">
                            <TableCell>Non-Current Liabilities</TableCell>
                            <TableCell colSpan={showComparison ? 3 : 1}></TableCell>
                          </TableRow>
                          
                          {renderSectionRows(balanceSheetData?.liabilities?.nonCurrent?.accounts || [], showComparison)}
                          
                          <TableRow className="font-medium bg-muted/50">
                            <TableCell>Total Non-Current Liabilities</TableCell>
                            <TableCell className="text-right">
                              {formatAmount(balanceSheetData?.liabilities?.nonCurrent?.total || 0)}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(balanceSheetData?.liabilities?.nonCurrent?.previousTotal || 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    balanceSheetData?.liabilities?.nonCurrent?.total || 0, 
                                    balanceSheetData?.liabilities?.nonCurrent?.previousTotal || 0
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                          
                          {/* Total Liabilities */}
                          <TableRow className="font-medium text-lg">
                            <TableCell>Total Liabilities</TableCell>
                            <TableCell className="text-right">
                              {formatAmount(
                                (balanceSheetData?.liabilities?.current?.total || 0) +
                                (balanceSheetData?.liabilities?.nonCurrent?.total || 0)
                              )}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(
                                    (balanceSheetData?.liabilities?.current?.previousTotal || 0) +
                                    (balanceSheetData?.liabilities?.nonCurrent?.previousTotal || 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    (balanceSheetData?.liabilities?.current?.total || 0) + (balanceSheetData?.liabilities?.nonCurrent?.total || 0), 
                                    (balanceSheetData?.liabilities?.current?.previousTotal || 0) + (balanceSheetData?.liabilities?.nonCurrent?.previousTotal || 0)
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  {/* Equity Section */}
                  <Card>
                    <CardHeader className="bg-muted py-2">
                      <CardTitle>Equity</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50%]">Account</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            {showComparison && (
                              <>
                                <TableHead className="text-right">Comparison</TableHead>
                                <TableHead className="text-right">Change %</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {renderSectionRows(balanceSheetData?.equity?.accounts || [], showComparison)}
                          
                          <TableRow className="font-medium bg-muted/50">
                            <TableCell>Total Equity</TableCell>
                            <TableCell className="text-right">
                              {formatAmount(balanceSheetData?.equity?.total || 0)}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(balanceSheetData?.equity?.previousTotal || 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    balanceSheetData?.equity?.total || 0, 
                                    balanceSheetData?.equity?.previousTotal || 0
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  {/* Summary Section */}
                  <Card>
                    <CardHeader className="bg-muted py-2">
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableBody>
                          <TableRow className="font-medium text-lg">
                            <TableCell>Total Liabilities & Equity</TableCell>
                            <TableCell className="text-right">
                              {formatAmount(
                                (balanceSheetData?.liabilities?.current?.total || 0) +
                                (balanceSheetData?.liabilities?.nonCurrent?.total || 0) +
                                (balanceSheetData?.equity?.total || 0)
                              )}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(
                                    (balanceSheetData?.liabilities?.current?.previousTotal || 0) +
                                    (balanceSheetData?.liabilities?.nonCurrent?.previousTotal || 0) +
                                    (balanceSheetData?.equity?.previousTotal || 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    (balanceSheetData?.liabilities?.current?.total || 0) + 
                                    (balanceSheetData?.liabilities?.nonCurrent?.total || 0) + 
                                    (balanceSheetData?.equity?.total || 0), 
                                    (balanceSheetData?.liabilities?.current?.previousTotal || 0) + 
                                    (balanceSheetData?.liabilities?.nonCurrent?.previousTotal || 0) + 
                                    (balanceSheetData?.equity?.previousTotal || 0)
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}