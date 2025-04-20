import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BookText,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function JournalEntriesList() {
  const [, setLocation] = useLocation();
  
  // Fetch journal entries
  const { data: journalEntries, isLoading: journalEntriesLoading } = useQuery({
    queryKey: ['/api/v1/finance/journal-entries'],
    refetchOnWindowFocus: false,
  });
  
  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Journal Entries</CardTitle>
            <CardDescription>
              View and manage accounting transactions
            </CardDescription>
          </div>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setLocation('/finance/journal-entries/create')}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Journal Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {journalEntriesLoading ? (
          <div className="text-center py-4">Loading journal entries...</div>
        ) : journalEntries && journalEntries.length > 0 ? (
          <Accordion type="multiple" className="space-y-4">
            {journalEntries.map((entry: any) => (
              <AccordionItem 
                key={entry.id} 
                value={entry.id.toString()}
                className="border rounded-md overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-2 hover:bg-slate-50">
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <BookText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{entry.reference}</p>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center space-x-6">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(entry.entryDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">
                          {entry.sourceDocument.toUpperCase()} 
                          {entry.sourceDocumentId ? ` #${entry.sourceDocumentId}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {formatCurrency(entry.totalAmount || 0)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {entry.isPosted ? (
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                        )}
                        <span className="text-sm">
                          {entry.isPosted ? 'Posted' : 'Draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="p-2 text-left font-medium">Account</th>
                          <th className="p-2 text-left font-medium">Description</th>
                          <th className="p-2 text-right font-medium">Debit</th>
                          <th className="p-2 text-right font-medium">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines?.map((line: any) => (
                          <tr key={line.id} className="border-b">
                            <td className="p-2">
                              <div>
                                <p className="font-medium">{line.accountName}</p>
                                <p className="text-xs text-muted-foreground">{line.accountCode}</p>
                              </div>
                            </td>
                            <td className="p-2">{line.description}</td>
                            <td className="p-2 text-right">
                              {parseFloat(line.debitAmount) > 0 ? 
                                formatCurrency(parseFloat(line.debitAmount)) : '-'}
                            </td>
                            <td className="p-2 text-right">
                              {parseFloat(line.creditAmount) > 0 ? 
                                formatCurrency(parseFloat(line.creditAmount)) : '-'}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-medium">
                          <td colSpan={2} className="p-2 text-right">Totals:</td>
                          <td className="p-2 text-right">
                            {formatCurrency(
                              entry.lines?.reduce((acc: number, line: any) => 
                                acc + parseFloat(line.debitAmount || 0), 0) || 0
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency(
                              entry.lines?.reduce((acc: number, line: any) => 
                                acc + parseFloat(line.creditAmount || 0), 0) || 0
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="p-3 bg-slate-50 flex flex-col sm:flex-row sm:justify-between text-sm">
                      <div className="mb-2 sm:mb-0">
                        <span className="font-medium">Created by:</span> {entry.createdByName || 'System'}
                      </div>
                      <div className="mb-2 sm:mb-0">
                        <span className="font-medium">Created on:</span> {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                      </div>
                      {entry.isPosted && entry.postedAt && (
                        <div>
                          <span className="font-medium">Posted on:</span> {format(new Date(entry.postedAt), 'MMM d, yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-8 border rounded-md bg-slate-50">
            <BookText className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium">No Journal Entries</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You haven't created any journal entries yet.
            </p>
            <Button
              onClick={() => setLocation('/finance/journal-entries/create')}
              variant="outline"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Journal Entry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}