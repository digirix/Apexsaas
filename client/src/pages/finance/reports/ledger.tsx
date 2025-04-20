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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarIcon, FileDown, Printer, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Search form schema
const searchSchema = z.object({
  accountId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export default function LedgerReportPage() {
  const { toast } = useToast();
  const [isSearched, setIsSearched] = useState(false);
  
  // Form
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      accountId: undefined,
      startDate: new Date(new Date().getFullYear(), 0, 1), // Jan 1st of current year
      endDate: new Date(),
    },
  });
  
  // Get all accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    refetchOnWindowFocus: false,
  });
  
  // Get ledger entries based on filter criteria
  const { data: ledgerEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: [
      '/api/v1/finance/reports/ledger',
      {
        accountId: form.watch('accountId'),
        startDate: form.watch('startDate'),
        endDate: form.watch('endDate'),
      },
    ],
    enabled: isSearched,
    refetchOnWindowFocus: false,
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof searchSchema>) => {
    setIsSearched(true);
  };
  
  // Calculate running balance
  const calculateRunningBalance = (entries: any[], startBalance: number) => {
    let balance = startBalance;
    return entries.map((entry: any) => {
      if (entry.debitAmount) {
        balance += parseFloat(entry.debitAmount);
      }
      if (entry.creditAmount) {
        balance -= parseFloat(entry.creditAmount);
      }
      return {
        ...entry,
        runningBalance: balance,
      };
    });
  };
  
  // Get opening balance
  const openingBalance = isSearched && ledgerEntries?.openingBalance ? parseFloat(ledgerEntries.openingBalance) : 0;
  
  // Process entries with running balance
  const processedEntries = isSearched && ledgerEntries?.entries 
    ? calculateRunningBalance(ledgerEntries.entries, openingBalance)
    : [];
  
  // Get selected account info
  const selectedAccount = accounts.find((account: any) => 
    account.id.toString() === form.watch('accountId')
  );
  
  // Format date display
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'PPP');
  };
  
  return (
    <AppLayout title="Ledger Report">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>General Ledger</CardTitle>
          <CardDescription>
            View detailed ledger entries for specific accounts within a date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.accountCode} - {account.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </form>
          </Form>
          
          {isSearched && selectedAccount && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedAccount.accountCode} - {selectedAccount.accountName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(form.watch('startDate'))} to {formatDate(form.watch('endDate'))}
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
              
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Opening Balance Row */}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={5} className="font-medium">
                        Opening Balance as of {formatDate(form.watch('startDate'))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {openingBalance.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        })}
                      </TableCell>
                    </TableRow>
                    
                    {entriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : processedEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No entries found for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      processedEntries.map((entry: any, index: number) => (
                        <TableRow key={entry.id || index}>
                          <TableCell>{format(new Date(entry.date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>
                            <div className="font-medium">{entry.reference}</div>
                            <div className="text-xs text-muted-foreground">{entry.entryType}</div>
                          </TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className="text-right">
                            {entry.debitAmount ? parseFloat(entry.debitAmount).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.creditAmount ? parseFloat(entry.creditAmount).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.runningBalance.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    
                    {/* Closing Balance Row */}
                    {processedEntries.length > 0 && (
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="font-medium">
                          Closing Balance as of {formatDate(form.watch('endDate'))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {processedEntries[processedEntries.length - 1].runningBalance.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Total Debits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {processedEntries.reduce((sum: number, entry: any) => 
                        sum + (entry.debitAmount ? parseFloat(entry.debitAmount) : 0), 0
                      ).toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Total Credits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {processedEntries.reduce((sum: number, entry: any) => 
                        sum + (entry.creditAmount ? parseFloat(entry.creditAmount) : 0), 0
                      ).toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Net Change</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(processedEntries.reduce((sum: number, entry: any) => 
                        sum + (entry.debitAmount ? parseFloat(entry.debitAmount) : 0), 0) - 
                      processedEntries.reduce((sum: number, entry: any) => 
                        sum + (entry.creditAmount ? parseFloat(entry.creditAmount) : 0), 0)
                      ).toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}