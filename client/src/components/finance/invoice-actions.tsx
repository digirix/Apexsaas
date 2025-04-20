import React, { useState } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, CheckCircle, FileText, Ban, Send, AlertTriangle } from 'lucide-react';

interface InvoiceActionsProps {
  invoice: {
    id: number;
    status: string;
    invoiceNumber: string;
  };
}

type ValidationError = {
  message: string;
  details?: {
    missingAccounts?: string[];
    guidance?: string;
  }
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog state for chart of accounts validation errors
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);

  // Mutation for updating invoice status
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest('POST', `/api/v1/finance/invoices/${invoice.id}/status`, { status: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries'] });
      toast({
        title: 'Invoice updated',
        description: `Invoice ${invoice.invoiceNumber} status has been updated.`,
      });
    },
    onError: (error: any) => {
      // Check if this is a chart of accounts validation error
      if (error.data?.details?.missingAccounts) {
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
    updateInvoiceStatusMutation.mutate(newStatus);
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
    </>
  );
}