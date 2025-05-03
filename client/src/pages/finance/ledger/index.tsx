import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search, 
  BookText, 
  ArrowLeft, 
  ArrowRight,
  Download,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Account {
  id: number;
  accountCode: string;
  accountName: string;
}

interface JournalEntryLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  entryDate: string;
  description: string;
  reference: string;
  debitAmount: string;
  creditAmount: string;
}

export default function LedgerReport() {
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const pageSize = 10;

  // Fetch accounts for the dropdown
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/v1/finance/ledger-accounts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/finance/ledger-accounts');
      return Array.isArray(response) ? response : [];
    },
  });

  // Fetch ledger entries for the selected account
  const { data: ledgerEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['/api/v1/finance/ledger', selectedAccount, currentPage, startDate, endDate],
    queryFn: async () => {
      if (!selectedAccount) return null;
      
      // Format dates for API request
      const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : '';
      const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : '';
      
      const response = await apiRequest(
        'GET', 
        `/api/v1/finance/ledger/${selectedAccount}?page=${currentPage}&pageSize=${pageSize}${formattedStartDate ? `&startDate=${formattedStartDate}` : ''}${formattedEndDate ? `&endDate=${formattedEndDate}` : ''}`
      );
      
      return response as {
        entries: JournalEntryLine[];
        totalCount: number;
        openingBalance: string;
        closingBalance: string;
        accountDetails: {
          id: number;
          accountCode: string;
          accountName: string;
        }
      };
    },
    enabled: !!selectedAccount,
  });

  // Format currency values
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Calculate total pages
  const totalPages = ledgerEntries ? Math.ceil(ledgerEntries.totalCount / pageSize) : 0;

  // Handle pagination
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center">
              <BookText className="mr-2 h-6 w-6" />
              General Ledger
            </CardTitle>
            <CardDescription>
              View account transaction history and balances
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <Label htmlFor="account-select">Select Account</Label>
            <Select 
              value={selectedAccount?.toString() || ''} 
              onValueChange={(value) => {
                setSelectedAccount(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger id="account-select" className="w-full">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accountsLoading ? (
                  <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                ) : (
                  accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.accountName} ({account.accountCode})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Start Date Picker */}
          <div className="w-full md:w-1/4">
            <Label htmlFor="start-date">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Select start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* End Date Picker */}
          <div className="w-full md:w-1/4">
            <Label htmlFor="end-date">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Select end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="w-full md:w-auto">
            <Button onClick={() => setCurrentPage(1)}>
              Apply Filters
            </Button>
          </div>
        </div>

        {selectedAccount && (
          <>
            <div className="mb-4 bg-slate-50 p-4 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Account</h3>
                  <p className="font-medium">
                    {ledgerEntries?.accountDetails ? (
                      <>
                        {ledgerEntries.accountDetails.accountName}
                        <span className="text-sm ml-2 text-slate-500">
                          ({ledgerEntries.accountDetails.accountCode})
                        </span>
                      </>
                    ) : (
                      <>
                        {accounts?.find(a => a.id === selectedAccount)?.accountName} 
                        <span className="text-sm ml-2 text-slate-500">
                          ({accounts?.find(a => a.id === selectedAccount)?.accountCode})
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-medium text-slate-500">Current Balance</h3>
                  <p className="font-medium text-lg">
                    {ledgerEntries ? formatCurrency(ledgerEntries.closingBalance) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {entriesLoading ? (
              <div className="py-10 text-center">
                <div className="animate-pulse h-6 w-1/3 bg-slate-200 mx-auto mb-4 rounded"></div>
                <div className="animate-pulse h-4 w-1/2 bg-slate-200 mx-auto mb-6 rounded"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse h-12 bg-slate-200 rounded"></div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-slate-50">
                      <TableCell colSpan={5} className="font-medium">Opening Balance</TableCell>
                      <TableCell className="text-right font-medium">
                        {ledgerEntries && formatCurrency(ledgerEntries.openingBalance)}
                      </TableCell>
                    </TableRow>

                    {ledgerEntries && ledgerEntries.entries.length > 0 ? (
                      ledgerEntries.entries.map((entry, index) => {
                        // Calculate running balance
                        const previousEntries = ledgerEntries.entries.slice(0, index);
                        const previousDebits = previousEntries.reduce(
                          (sum, e) => sum + parseFloat(e.debitAmount || '0'), 0
                        );
                        const previousCredits = previousEntries.reduce(
                          (sum, e) => sum + parseFloat(e.creditAmount || '0'), 0
                        );
                        const currentDebit = parseFloat(entry.debitAmount || '0');
                        const currentCredit = parseFloat(entry.creditAmount || '0');
                        
                        // For simplicity, assuming debits increase and credits decrease for assets
                        // This may need adjustment based on account type
                        const openingBalance = parseFloat(ledgerEntries.openingBalance);
                        const runningBalance = openingBalance + 
                          (previousDebits - previousCredits) + 
                          (currentDebit - currentCredit);

                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {format(new Date(entry.entryDate), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{entry.reference}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right">
                              {parseFloat(entry.debitAmount) > 0 
                                ? formatCurrency(entry.debitAmount) 
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {parseFloat(entry.creditAmount) > 0 
                                ? formatCurrency(entry.creditAmount) 
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(runningBalance)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No transactions found for this account
                        </TableCell>
                      </TableRow>
                    )}

                    <TableRow className="bg-slate-50">
                      <TableCell colSpan={5} className="font-medium">Closing Balance</TableCell>
                      <TableCell className="text-right font-medium">
                        {ledgerEntries && formatCurrency(ledgerEntries.closingBalance)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Pagination */}
                {ledgerEntries && ledgerEntries.totalCount > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-slate-500">
                      Showing {Math.min((currentPage - 1) * pageSize + 1, ledgerEntries.totalCount)} to {Math.min(currentPage * pageSize, ledgerEntries.totalCount)} of {ledgerEntries.totalCount} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                      >
                        Next <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!selectedAccount && (
          <div className="py-20 text-center text-slate-500">
            <BookText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium mb-2">Select an account to view its ledger</h3>
            <p>View transaction history, debits, credits and running balances</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}