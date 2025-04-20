import React, { useState, useEffect } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  MoreHorizontal, 
  CheckCircle, 
  FileText, 
  Ban, 
  Send, 
  AlertTriangle, 
  Plus, 
  Users, 
  CreditCard 
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface InvoiceActionsProps {
  invoice: {
    id: number;
    status: string;
    invoiceNumber: string;
    clientId?: number;
    clientName?: string;
  };
}

type ValidationError = {
  message: string;
  details?: {
    missingAccounts?: string[];
    guidance?: string;
    missingClientAccount?: boolean;
    clientId?: number;
    clientName?: string;
  }
}

// Form schema for client account creation confirmation
const clientAccountSchema = z.object({
  createClientAccount: z.boolean().default(true),
});

// Form schema for income account selection
const incomeAccountSchema = z.object({
  incomeAccountId: z.string().min(1, "Please select an income account"),
});

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [clientAccountDialogOpen, setClientAccountDialogOpen] = useState(false);
  const [incomeAccountDialogOpen, setIncomeAccountDialogOpen] = useState(false);
  
  // Form for client account creation confirmation
  const clientAccountForm = useForm<z.infer<typeof clientAccountSchema>>({
    resolver: zodResolver(clientAccountSchema),
    defaultValues: {
      createClientAccount: true,
    },
  });

  // Form for income account selection
  const incomeAccountForm = useForm<z.infer<typeof incomeAccountSchema>>({
    resolver: zodResolver(incomeAccountSchema),
    defaultValues: {
      incomeAccountId: "",
    },
  });

  // Query for income accounts (revenue account type)
  const { data: incomeAccounts = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts', { accountType: 'revenue' }],
    enabled: incomeAccountDialogOpen,
  });

  // Mutation for updating invoice status
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async (params: { status: string, createClientAccount?: boolean, incomeAccountId?: string }) => {
      return apiRequest('POST', `/api/v1/finance/invoices/${invoice.id}/status`, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      
      toast({
        title: 'Invoice updated',
        description: `Invoice ${invoice.invoiceNumber} status has been updated.`,
      });

      // Reset and close any open dialogs
      setClientAccountDialogOpen(false);
      setIncomeAccountDialogOpen(false);
    },
    onError: (error: any) => {
      // Different error handling based on the type of error
      if (error.data?.details?.missingClientAccount) {
        // Client account missing, prompt to create it
        setValidationError(error.data);
        setClientAccountDialogOpen(true);
      } else if (error.data?.details?.missingAccounts) {
        // Other accounts missing
        setValidationError(error.data);
        setErrorDialogOpen(true);
      } else {
        toast({
          title: 'Error updating invoice',
          description: error.data?.message || 'Failed to update invoice status. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  // Helper to check if a status change is allowed (all transitions allowed)
  const canChangeStatus = (fromStatus: string, toStatus: string): boolean => {
    // Per user request, allow changing from any status to any other status
    // Don't allow changing to the same status
    return fromStatus !== toStatus;
  };

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    // If changing to approved, prompt for income account first
    if (newStatus === 'approved') {
      setIncomeAccountDialogOpen(true);
    } else {
      // For other status changes, proceed directly
      updateInvoiceStatusMutation.mutate({ status: newStatus });
    }
  };

  // Handle client account creation confirmation
  const handleCreateClientAccount = (values: z.infer<typeof clientAccountSchema>) => {
    if (values.createClientAccount) {
      // User confirmed to create the client account
      // Continue with the previously selected income account
      if (incomeAccountForm.getValues().incomeAccountId) {
        updateInvoiceStatusMutation.mutate({
          status: 'approved',
          createClientAccount: true,
          incomeAccountId: incomeAccountForm.getValues().incomeAccountId
        });
      } else {
        // If somehow we got here without an income account selected, show the dialog again
        setClientAccountDialogOpen(false);
        setIncomeAccountDialogOpen(true);
      }
    } else {
      // User declined to create the client account
      setClientAccountDialogOpen(false);
      toast({
        title: 'Approval canceled',
        description: 'Invoice approval was cancelled. Client account is required for accounting entries.',
        variant: 'destructive',
      });
    }
  };

  // Handle income account selection
  const handleIncomeAccountSelection = (values: z.infer<typeof incomeAccountSchema>) => {
    // Process with the selected income account
    updateInvoiceStatusMutation.mutate({
      status: 'approved',
      incomeAccountId: values.incomeAccountId
    });
  };

  // Navigate to Chart of Accounts page
  const handleGoToChartOfAccounts = () => {
    window.location.href = '/finance/chart-of-accounts';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {/* View/Download PDF */}
          <DropdownMenuItem 
            onClick={() => window.open(`/api/v1/finance/invoices/${invoice.id}/pdf`, '_blank')}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>Download PDF</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          {/* Status Change Options */}
          {canChangeStatus(invoice.status, 'approved') && (
            <DropdownMenuItem 
              onClick={() => handleStatusChange('approved')}
              disabled={updateInvoiceStatusMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              <span>Mark as Approved</span>
            </DropdownMenuItem>
          )}
          
          {canChangeStatus(invoice.status, 'sent') && (
            <DropdownMenuItem 
              onClick={() => handleStatusChange('sent')}
              disabled={updateInvoiceStatusMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4 text-blue-600" />
              <span>Mark as Sent</span>
            </DropdownMenuItem>
          )}
          
          {canChangeStatus(invoice.status, 'paid') && (
            <DropdownMenuItem 
              onClick={() => handleStatusChange('paid')}
              disabled={updateInvoiceStatusMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              <span>Mark as Paid</span>
            </DropdownMenuItem>
          )}
          
          {canChangeStatus(invoice.status, 'canceled') && (
            <DropdownMenuItem 
              onClick={() => handleStatusChange('canceled')}
              disabled={updateInvoiceStatusMutation.isPending}
            >
              <Ban className="mr-2 h-4 w-4 text-red-600" />
              <span>Cancel Invoice</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Chart of Accounts Validation Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-amber-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Chart of Accounts Setup Required
            </DialogTitle>
            <DialogDescription>
              {validationError?.message}
            </DialogDescription>
          </DialogHeader>
          
          {validationError?.details?.missingAccounts && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Missing Accounts:</h4>
              <ul className="list-disc pl-5 space-y-1">
                {validationError.details.missingAccounts.map((account, index) => (
                  <li key={index} className="text-sm">{account}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationError?.details?.guidance && (
            <div className="mt-4 bg-blue-50 p-3 rounded-md text-blue-800 text-sm">
              <p className="font-semibold mb-1">Guidance:</p>
              <p>{validationError.details.guidance}</p>
            </div>
          )}
          
          <DialogFooter className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={() => setErrorDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGoToChartOfAccounts}
            >
              Go to Chart of Accounts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Account Creation Dialog */}
      <Dialog open={clientAccountDialogOpen} onOpenChange={setClientAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-blue-600">
              <Users className="h-5 w-5 mr-2" />
              Client Account Creation
            </DialogTitle>
            <DialogDescription>
              This invoice needs a client account in the Chart of Accounts to record accounting entries.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-2">
            <div className="bg-amber-50 p-3 rounded-md text-amber-800 text-sm mb-4">
              <p className="font-semibold mb-1">Client Information:</p>
              <p>Client: <span className="font-medium">{validationError?.details?.clientName || 'Unknown'}</span></p>
              <p className="mt-2">We need to create an account in your chart of accounts for this client to record financial transactions correctly.</p>
            </div>

            <Form {...clientAccountForm}>
              <form onSubmit={clientAccountForm.handleSubmit(handleCreateClientAccount)}>
                <FormField
                  control={clientAccountForm.control}
                  name="createClientAccount"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Create client account automatically</FormLabel>
                        <FormDescription>
                          This will create an account in Trade Debtors for this client
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="mt-6">
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setClientAccountDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateInvoiceStatusMutation.isPending}
                  >
                    {updateInvoiceStatusMutation.isPending ? 'Creating...' : 'Create Account & Approve Invoice'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Income Account Selection Dialog */}
      <Dialog open={incomeAccountDialogOpen} onOpenChange={setIncomeAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CreditCard className="h-5 w-5 mr-2" />
              Select Income Account
            </DialogTitle>
            <DialogDescription>
              Please select an income account to credit for this invoice. This will create the appropriate double-entry accounting entries.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...incomeAccountForm}>
            <form onSubmit={incomeAccountForm.handleSubmit(handleIncomeAccountSelection)}>
              <FormField
                control={incomeAccountForm.control}
                name="incomeAccountId"
                render={({ field }) => (
                  <FormItem className="py-2">
                    <FormLabel>Income Account</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an income account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incomeAccounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.accountCode} - {account.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This account will be credited with the income from this invoice
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => setIncomeAccountDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateInvoiceStatusMutation.isPending || incomeAccounts.length === 0}
                >
                  {updateInvoiceStatusMutation.isPending ? 'Processing...' : 'Select Account & Approve Invoice'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}