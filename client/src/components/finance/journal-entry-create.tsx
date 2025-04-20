import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
  Receipt
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

export default function JournalEntryCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  
  const createJournalEntryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof journalEntrySchema>) => {
      // Convert string amounts to numbers
      const formattedValues = {
        ...values,
        lines: values.lines.map(line => ({
          ...line,
          debitAmount: parseFloat(line.debitAmount || "0"),
          creditAmount: parseFloat(line.creditAmount || "0"),
          sourceDocumentId: values.sourceDocumentId ? parseInt(values.sourceDocumentId) : null
        }))
      };
      
      return apiRequest('POST', '/api/v1/finance/journal-entries', formattedValues);
    },
    onSuccess: () => {
      toast({
        title: "Journal entry created",
        description: "The journal entry has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries'] });
      setLocation('/finance');
    },
    onError: (error: any) => {
      toast({
        title: "Error creating journal entry",
        description: error.message || "Failed to create journal entry",
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
    
    createJournalEntryMutation.mutate(values);
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
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Create Journal Entry</CardTitle>
            <CardDescription>
              Record a new transaction in the general ledger
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/finance')}
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
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-slate-50 font-medium">
                        <td colSpan={2} className="p-2 text-right">Totals:</td>
                        <td className="p-2">{totalDebit.toFixed(2)}</td>
                        <td className="p-2">{totalCredit.toFixed(2)}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {!isBalanced && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="font-medium">Journal entry is not balanced</p>
                      <p className="text-sm mt-1">
                        Total debits ({totalDebit.toFixed(2)}) must equal total credits ({totalCredit.toFixed(2)})
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation('/finance')}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={createJournalEntryMutation.isPending || !isBalanced}
              >
                {createJournalEntryMutation.isPending ? (
                  <>Creating journal entry...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Journal Entry
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}