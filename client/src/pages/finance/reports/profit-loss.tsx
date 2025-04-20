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
  startDate: z.date(),
  endDate: z.date(),
  comparisonPeriod: z.enum(['none', 'previous_year', 'previous_period']).default('none'),
});

export default function ProfitLossStatementPage() {
  const { toast } = useToast();
  const [isSearched, setIsSearched] = useState(false);
  
  // Form
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      startDate: new Date(new Date().getFullYear(), 0, 1), // Jan 1st of current year
      endDate: new Date(),
      comparisonPeriod: 'none',
    },
  });
  
  // Get profit and loss data
  const { data: profitLossData, isLoading } = useQuery({
    queryKey: [
      '/api/v1/finance/reports/profit-loss',
      {
        startDate: form.watch('startDate'),
        endDate: form.watch('endDate'),
        comparisonPeriod: form.watch('comparisonPeriod'),
      },
    ],
    enabled: isSearched,
    refetchOnWindowFocus: false,
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof searchSchema>) => {
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
  
  // Determine if we're showing comparison data
  const showComparison = form.watch('comparisonPeriod') !== 'none';
  
  return (
    <AppLayout title="Profit & Loss">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
          <CardDescription>
            View your company's income, expenses, and profitability for a specific period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
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
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
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
                  name="comparisonPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comparison</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select comparison" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Comparison</SelectItem>
                          <SelectItem value="previous_year">Previous Year</SelectItem>
                          <SelectItem value="previous_period">Previous Period</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    Profit & Loss Statement
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {format(form.watch('startDate'), 'PPP')} to {format(form.watch('endDate'), 'PPP')}
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
                  {/* Revenue Section */}
                  <Card>
                    <CardHeader className="bg-muted py-2">
                      <CardTitle>Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50%]">Account</TableHead>
                            <TableHead className="text-right">Current Period</TableHead>
                            {showComparison && (
                              <>
                                <TableHead className="text-right">Previous Period</TableHead>
                                <TableHead className="text-right">Change %</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profitLossData?.revenue?.accounts?.map((account: any) => (
                            <TableRow key={account.id}>
                              <TableCell>{account.name}</TableCell>
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
                          ))}
                          <TableRow className="font-medium">
                            <TableCell>Total Revenue</TableCell>
                            <TableCell className="text-right">{formatAmount(profitLossData?.revenue?.total || 0)}</TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(profitLossData?.revenue?.previousTotal || 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    profitLossData?.revenue?.total || 0, 
                                    profitLossData?.revenue?.previousTotal || 0
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  {/* Expenses Section */}
                  <Card>
                    <CardHeader className="bg-muted py-2">
                      <CardTitle>Expenses</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50%]">Account</TableHead>
                            <TableHead className="text-right">Current Period</TableHead>
                            {showComparison && (
                              <>
                                <TableHead className="text-right">Previous Period</TableHead>
                                <TableHead className="text-right">Change %</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profitLossData?.expenses?.accounts?.map((account: any) => (
                            <TableRow key={account.id}>
                              <TableCell>{account.name}</TableCell>
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
                          ))}
                          <TableRow className="font-medium">
                            <TableCell>Total Expenses</TableCell>
                            <TableCell className="text-right">{formatAmount(profitLossData?.expenses?.total || 0)}</TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(profitLossData?.expenses?.previousTotal || 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    profitLossData?.expenses?.total || 0, 
                                    profitLossData?.expenses?.previousTotal || 0
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
                          <TableRow className="font-medium">
                            <TableCell>Gross Profit</TableCell>
                            <TableCell className="text-right">
                              {formatAmount((profitLossData?.revenue?.total || 0) - (profitLossData?.expenses?.total || 0))}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {formatAmount(
                                    (profitLossData?.revenue?.previousTotal || 0) - 
                                    (profitLossData?.expenses?.previousTotal || 0)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {`${calculateChange(
                                    (profitLossData?.revenue?.total || 0) - (profitLossData?.expenses?.total || 0), 
                                    (profitLossData?.revenue?.previousTotal || 0) - (profitLossData?.expenses?.previousTotal || 0)
                                  )?.toFixed(2)}%`}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                          
                          <TableRow className="font-medium">
                            <TableCell>Profit Margin</TableCell>
                            <TableCell className="text-right">
                              {profitLossData?.revenue?.total ? 
                                `${(((profitLossData?.revenue?.total - profitLossData?.expenses?.total) / 
                                   profitLossData?.revenue?.total) * 100).toFixed(2)}%` : 
                                'N/A'}
                            </TableCell>
                            {showComparison && (
                              <>
                                <TableCell className="text-right">
                                  {profitLossData?.revenue?.previousTotal ? 
                                    `${(((profitLossData?.revenue?.previousTotal - profitLossData?.expenses?.previousTotal) / 
                                       profitLossData?.revenue?.previousTotal) * 100).toFixed(2)}%` : 
                                    'N/A'}
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
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