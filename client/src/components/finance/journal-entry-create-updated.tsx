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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

// Updated schema without sourceDocument and with entryType
const journalEntrySchema = z.object({
  entryDate: z.string().min(1, "Entry date is required"),
  reference: z.string().optional(), // Now auto-generated
  entryType: z.string().min(1, "Entry type is required"),
  description: z.string().min(1, "Description is required"),
  lines: z.array(z.object({
    accountId: z.number().min(1, "Account is required"),
    description: z.string(),
    debitAmount: z.string().default("0"),
    creditAmount: z.string().default("0"),
  })).min(2, "At least two lines are required for a journal entry"),
});

// Schema for new entry types
const entryTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
});

export default function JournalEntryCreateUpdated() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for the add new entry type dialog
  const [showNewEntryTypeDialog, setShowNewEntryTypeDialog] = useState(false);
  
  // Generate a unique reference number
  const [referenceNumber, setReferenceNumber] = useState('');
  
  // Track if debit or credit is being edited for each line
  const [activeAmountFields, setActiveAmountFields] = useState<{[key: number]: 'debit' | 'credit' | null}>({});
  
  // Fetch accounts for selection
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    refetchOnWindowFocus: false,
  });
  
  // Fetch existing entry types
  const { data: entryTypes, isLoading: entryTypesLoading } = useQuery({
    queryKey: ['/api/v1/finance/journal-entry-types'],
    refetchOnWindowFocus: false,
  });
  
  // Form for adding new entry types
  const newEntryTypeForm = useForm<z.infer<typeof entryTypeSchema>>({
    resolver: zodResolver(entryTypeSchema),
    defaultValues: {
      name: '',
      code: '',
    },
  });
  
  // Generate reference number on load
  useEffect(() => {
    const date = new Date();
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const newRef = `JV-${year}${month}${day}-${randomNum}`;
    setReferenceNumber(newRef);
  }, []);
  
  const form = useForm<z.infer<typeof journalEntrySchema>>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entryDate: format(new Date(), 'yyyy-MM-dd'),
      reference: '',
      entryType: '',
      description: '',
      lines: [
        { accountId: 0, description: '', debitAmount: "0", creditAmount: "0" },
        { accountId: 0, description: '', debitAmount: "0", creditAmount: "0" },
      ],
    },
  });
  
  // Set the reference number once it's generated
  useEffect(() => {
    if (referenceNumber) {
      form.setValue('reference', referenceNumber);
    }
  }, [referenceNumber, form]);
  
  // Watch the main description field to propagate to lines
  const mainDescription = form.watch('description');
  
  // Update all line descriptions when main description changes
  useEffect(() => {
    const lines = form.getValues('lines');
    const updatedLines = lines.map(line => ({
      ...line,
      description: line.description || mainDescription,
    }));
    form.setValue('lines', updatedLines);
  }, [mainDescription, form]);
  
  // Create new entry type mutation
  const createEntryTypeMutation = useMutation({
    mutationFn: async (values: z.infer<typeof entryTypeSchema>) => {
      return apiRequest('POST', '/api/v1/finance/journal-entry-types', values);
    },
    onSuccess: () => {
      toast({
        title: "Entry Type Added",
        description: "The entry type has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entry-types'] });
      setShowNewEntryTypeDialog(false);
      newEntryTypeForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding entry type",
        description: error.message || "Failed to add entry type",
        variant: "destructive",
      });
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
      { accountId: 0, description: mainDescription, debitAmount: "0", creditAmount: "0" }
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
  
  // Handle adding a debit or credit amount and disabling the other field
  const handleAmountChange = (index: number, field: 'debit' | 'credit', value: string) => {
    if (parseFloat(value) > 0) {
      setActiveAmountFields(prev => ({
        ...prev,
        [index]: field
      }));
      
      // If entering debit, clear credit (and vice versa)
      if (field === 'debit') {
        form.setValue(`lines.${index}.creditAmount`, "0");
      } else {
        form.setValue(`lines.${index}.debitAmount`, "0");
      }
    } else {
      setActiveAmountFields(prev => ({
        ...prev,
        [index]: null
      }));
    }
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
  
  // Handle adding a new entry type
  const onAddEntryType = (values: z.infer<typeof entryTypeSchema>) => {
    createEntryTypeMutation.mutate(values);
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
                        <Input placeholder="Auto-generated" {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex space-x-1 items-end">
                  <FormField
                    control={form.control}
                    name="entryType"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Entry Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select entry type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {entryTypes?.map((type: any) => (
                              <SelectItem key={type.id} value={type.code}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mb-1"
                    onClick={() => setShowNewEntryTypeDialog(true)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description (will be applied to all lines)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Journal Entry Lines</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLine}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Account</th>
                        <th className="text-left">Description</th>
                        <th className="text-right">Debit</th>
                        <th className="text-right">Credit</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.watch('lines').map((line, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2 pr-2 w-1/4">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.accountId`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                    value={field.value ? field.value.toString() : ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.entries(groupedAccounts).map(([type, accounts]: [string, any]) => (
                                        <React.Fragment key={type}>
                                          <SelectItem value={`group-${type}`} disabled>
                                            {type.toUpperCase()}
                                          </SelectItem>
                                          {accounts.map((account: any) => (
                                            <SelectItem key={account.id} value={account.id.toString()}>
                                              {account.accountName}
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
                          <td className="py-2 px-2 w-1/4">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Line description" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="py-2 px-2 w-1/6">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.debitAmount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      disabled={activeAmountFields[index] === 'credit'}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleAmountChange(index, 'debit', e.target.value);
                                      }}
                                      className="text-right"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="py-2 px-2 w-1/6">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.creditAmount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      disabled={activeAmountFields[index] === 'debit'}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleAmountChange(index, 'credit', e.target.value);
                                      }}
                                      className="text-right"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="py-2 pl-2 text-center">
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
                      <tr className="border-t border-t-2">
                        <td colSpan={2} className="py-2 text-right font-bold">
                          Totals
                        </td>
                        <td className="py-2 px-2 text-right font-bold">
                          {totalDebit.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold">
                          {totalCredit.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      {!isBalanced && (
                        <tr>
                          <td colSpan={5} className="text-center text-red-500 py-2">
                            <div className="flex items-center justify-center">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Journal entry is not balanced. Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                className="mr-2"
                onClick={() => setLocation('/finance')}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createJournalEntryMutation.isPending || !isBalanced}
              >
                {createJournalEntryMutation.isPending ? (
                  <>
                    <span className="animate-spin mr-2">⣾</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Journal Entry
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      
      {/* Dialog for adding new Entry Type */}
      <Dialog open={showNewEntryTypeDialog} onOpenChange={setShowNewEntryTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Entry Type</DialogTitle>
            <DialogDescription>
              Create a new journal entry type for categorizing transactions.
            </DialogDescription>
          </DialogHeader>
          <Form {...newEntryTypeForm}>
            <form onSubmit={newEntryTypeForm.handleSubmit(onAddEntryType)} className="space-y-4">
              <FormField
                control={newEntryTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Payment Voucher" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newEntryTypeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. PV" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewEntryTypeDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createEntryTypeMutation.isPending}>
                  {createEntryTypeMutation.isPending ? "Adding..." : "Add Entry Type"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}