import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  Save, 
  Plus,
  MinusCircle,
  PlusCircle,
  AlertCircle,
  Trash2,
  Receipt,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

const journalEntrySchema = z.object({
  entryDate: z.string().min(1, "Entry date is required"),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().min(1, "Description is required"),
  sourceDocument: z.string().min(1, "Source document is required"),
  sourceDocumentId: z.string().optional(),
  lines: z.array(z.object({
    accountId: z.number().min(1, "Account is required"),
    description: z.string().min(1, "Description is required"),
    debitAmount: z.string().default("0"),
    creditAmount: z.string().default("0"),
  })).min(2, "At least two lines are required for a journal entry"),
});

export default function JournalEntryEdit() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const entryId = parseInt(id);
  
  // Type definition for journal entry
  interface JournalEntryLine {
    id?: number;
    accountId: number;
    accountName?: string;
    accountCode?: string;
    description: string;
    debitAmount: string;
    creditAmount: string;
    lineOrder?: number;
  }

  interface JournalEntry {
    id: number;
    entryDate: string;
    reference: string;
    description: string;
    isPosted: boolean;
    sourceDocument: string;
    sourceDocumentId?: number | null;
    lines: JournalEntryLine[];
    createdAt?: string;
    updatedAt?: string;
    postedAt?: string | null;
    createdByName?: string;
  }

  // Fetch journal entry data
  const { 
    data: journalEntry, 
    isLoading: journalEntryLoading,
    error: journalEntryError
  } = useQuery<JournalEntry>({
    queryKey: ['/api/v1/finance/journal-entries', entryId],
    queryFn: async () => {
      if (!entryId) return null as any;
      try {
        const response = await apiRequest('GET', `/api/v1/finance/journal-entries/${entryId}`);
        console.log('Journal entry fetched:', response);
        if (!response) {
          throw new Error('No journal entry found');
        }
        return response as unknown as JournalEntry;
      } catch (error) {
        console.error('Error fetching journal entry:', error);
        throw error;
      }
    },
    enabled: !!entryId,
  });
  
  // Fetch accounts for selection
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    refetchOnWindowFocus: false,
  });
  
  const form = useForm<z.infer<typeof journalEntrySchema>>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entryDate: format(new Date(), 'yyyy-MM-dd'),
      reference: '',
      description: '',
      sourceDocument: 'manual',
      sourceDocumentId: '',
      lines: [
        { accountId: 0, description: '', debitAmount: "0", creditAmount: "0" },
        { accountId: 0, description: '', debitAmount: "0", creditAmount: "0" },
      ],
    },
  });
  
  // Update form with journal entry data when available
  useEffect(() => {
    if (journalEntry) {
      console.log('Setting up form with journal entry:', journalEntry);
      
      // Safely format the date or use today if there's an issue
      let formattedDate = '';
      try {
        // Check if entryDate exists and is valid
        if (journalEntry.entryDate) {
          const date = new Date(journalEntry.entryDate);
          // Check if the date is valid
          if (!isNaN(date.getTime())) {
            formattedDate = format(date, 'yyyy-MM-dd');
          } else {
            formattedDate = format(new Date(), 'yyyy-MM-dd');
            console.warn('Invalid entry date, using current date instead');
          }
        } else {
          formattedDate = format(new Date(), 'yyyy-MM-dd');
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        formattedDate = format(new Date(), 'yyyy-MM-dd');
      }

      // Log lines data before processing
      console.log('Journal entry lines:', journalEntry.lines);
      
      const formData = {
        entryDate: formattedDate,
        reference: journalEntry.reference || '',
        description: journalEntry.description || '',
        sourceDocument: journalEntry.sourceDocument || 'manual',
        sourceDocumentId: journalEntry.sourceDocumentId ? journalEntry.sourceDocumentId.toString() : '',
        lines: journalEntry.lines?.map((line: any) => ({
          accountId: line.accountId,
          description: line.description || '',
          debitAmount: line.debitAmount ? line.debitAmount.toString() : "0",
          creditAmount: line.creditAmount ? line.creditAmount.toString() : "0",
        })) || [
          { accountId: 0, description: '', debitAmount: "0", creditAmount: "0" },
          { accountId: 0, description: '', debitAmount: "0", creditAmount: "0" },
        ],
      };
      
      console.log('Form data being set:', formData);
      form.reset(formData);
    }
  }, [journalEntry, form]);
  
  // Handle errors with journal entry loading
  useEffect(() => {
    if (journalEntryError) {
      toast({
        title: "Error loading journal entry",
        description: "Could not load the journal entry. It may have been deleted or you don't have access.",
        variant: "destructive",
      });
      setLocation('/finance/journal-entries');
    }
  }, [journalEntryError, toast, setLocation]);
  
  const updateJournalEntryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof journalEntrySchema>) => {
      // Convert string amounts to numbers
      const formattedValues = {
        ...values,
        sourceDocumentId: values.sourceDocumentId && values.sourceDocumentId.trim() !== '' 
          ? parseInt(values.sourceDocumentId) 
          : null,
        lines: values.lines.map(line => ({
          ...line,
          debitAmount: parseFloat(line.debitAmount || "0"),
          creditAmount: parseFloat(line.creditAmount || "0"),
        }))
      };
      
      return apiRequest('PUT', `/api/v1/finance/journal-entries/${entryId}`, formattedValues);
    },
    onSuccess: () => {
      toast({
        title: "Journal entry updated",
        description: "The journal entry has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries', entryId] });
      setLocation('/finance/journal-entries');
    },
    onError: (error: any) => {
      toast({
        title: "Error updating journal entry",
        description: error.message || "Failed to update journal entry",
        variant: "destructive",
      });
    },
  });
  
  // Add a new line to the journal entry
  const addLine = () => {
    const currentLines = form.getValues('lines');
    form.setValue('lines', [
      ...currentLines,
      { accountId: 0, description: '', debitAmount: "0", creditAmount: "0" }
    ]);
  };
  
  // Remove a line from the journal entry
  const removeLine = (index: number) => {
    const currentLines = form.getValues('lines');
    if (currentLines.length <= 2) {
      toast({
        title: "Cannot remove line",
        description: "A journal entry must have at least two lines",
        variant: "destructive",
      });
      return;
    }
    
    const updatedLines = currentLines.filter((_, i) => i !== index);
    form.setValue('lines', updatedLines);
  };
  
  // Calculate totals for debits and credits
  const calculateTotals = () => {
    const lines = form.watch('lines');
    const totalDebit = lines.reduce((acc, line) => acc + parseFloat(line.debitAmount || "0"), 0);
    const totalCredit = lines.reduce((acc, line) => acc + parseFloat(line.creditAmount || "0"), 0);
    
    return { totalDebit, totalCredit };
  };
  
  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof journalEntrySchema>) => {
    if (!isBalanced) {
      toast({
        title: "Journal entry is not balanced",
        description: "Total debits must equal total credits",
        variant: "destructive",
      });
      return;
    }
    
    updateJournalEntryMutation.mutate(values);
  };
  
  // Categorize accounts by type for easier selection
  const groupedAccounts = React.useMemo(() => {
    if (!accounts) return {};
    
    return accounts.reduce((acc: any, account: any) => {
      if (!acc[account.accountType]) {
        acc[account.accountType] = [];
      }
      acc[account.accountType].push(account);
      return acc;
    }, {});
  }, [accounts]);
  
  // Show loading state while fetching journal entry data
  if (journalEntryLoading || accountsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit Journal Entry</CardTitle>
          <CardDescription>Loading journal entry data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Show error if the journal entry is posted
  if (journalEntry && journalEntry.isPosted) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cannot Edit Journal Entry</CardTitle>
              <CardDescription>
                This journal entry has already been posted and cannot be edited.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/finance/journal-entries')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Posted Journal Entries Cannot Be Modified</h3>
              <p className="text-muted-foreground">
                Once a journal entry has been posted, it becomes part of the permanent accounting record and cannot be changed.
                If you need to correct this entry, you'll need to create a new reversing entry.
              </p>
              <Button
                onClick={() => setLocation('/finance/journal-entries')}
                variant="outline"
                className="mt-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Journal Entries
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edit Journal Entry</CardTitle>
            <CardDescription>
              Update this journal entry transaction
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/finance/journal-entries')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="entryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter reference number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sourceDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Document</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source document" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual Journal Entry</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="bank_transaction">Bank Transaction</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {form.watch('sourceDocument') !== 'manual' && (
                <FormField
                  control={form.control}
                  name="sourceDocumentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Document ID</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter document ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter journal entry description"
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Journal Entry Lines</h3>
                  <Button 
                    type="button" 
                    onClick={addLine}
                    size="sm"
                    variant="outline"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>
                
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="p-2 text-left font-medium">Account</th>
                        <th className="p-2 text-left font-medium">Description</th>
                        <th className="p-2 text-left font-medium">Debit</th>
                        <th className="p-2 text-left font-medium">Credit</th>
                        <th className="p-2 text-left font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.watch('lines').map((line, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.accountId`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <Select
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                    value={field.value?.toString() || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select account" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.keys(groupedAccounts).map((type) => (
                                        <React.Fragment key={type}>
                                          <div className="text-xs font-bold px-2 py-1 bg-slate-100 uppercase">
                                            {type}
                                          </div>
                                          {groupedAccounts[type].map((account: any) => (
                                            <SelectItem
                                              key={account.id}
                                              value={account.id.toString()}
                                            >
                                              {account.accountCode} - {account.accountName}
                                            </SelectItem>
                                          ))}
                                        </React.Fragment>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.description`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input placeholder="Line description" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.debitAmount`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        // If debit has a value, clear credit
                                        if (e.target.value && parseFloat(e.target.value) > 0) {
                                          form.setValue(`lines.${index}.creditAmount`, "0");
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.creditAmount`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        // If credit has a value, clear debit
                                        if (e.target.value && parseFloat(e.target.value) > 0) {
                                          form.setValue(`lines.${index}.debitAmount`, "0");
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(index)}
                              className="h-8 w-8"
                            >
                              <MinusCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50">
                        <td colSpan={2} className="p-2 text-right font-medium">Totals</td>
                        <td className="p-2 text-left font-medium">${totalDebit.toFixed(2)}</td>
                        <td className="p-2 text-left font-medium">${totalCredit.toFixed(2)}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Balance status indicator */}
                <div className={`p-2 rounded-md flex items-center ${isBalanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {isBalanced ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      <span>Journal entry is balanced</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>
                        Journal entry is not balanced. Difference: ${Math.abs(totalDebit - totalCredit).toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <CardFooter className="flex justify-between px-0">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  setLocation('/finance/journal-entries');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateJournalEntryMutation.isPending || !isBalanced}
              >
                {updateJournalEntryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Journal Entry
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}