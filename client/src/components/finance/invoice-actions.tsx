import React from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, CheckCircle, File, FileText, Trash, Ban, Send } from 'lucide-react';

interface InvoiceActionsProps {
  invoice: {
    id: number;
    status: string;
    invoiceNumber: string;
  };
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for updating invoice status
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest('POST', `/api/v1/finance/invoices/${invoice.id}/status`, { status });
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
      toast({
        title: 'Error updating invoice',
        description: error.message || 'Failed to update invoice status. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Helper to check if a status change is allowed
  const canChangeStatus = (fromStatus: string, toStatus: string): boolean => {
    // Define allowed status transitions
    const allowedTransitions: Record<string, string[]> = {
      'draft': ['approved', 'sent', 'canceled', 'void'],
      'sent': ['approved', 'paid', 'partially_paid', 'overdue', 'canceled', 'void'],
      'approved': ['paid', 'partially_paid', 'overdue', 'canceled', 'void'],
      'partially_paid': ['paid', 'overdue', 'void'],
      'overdue': ['paid', 'partially_paid', 'void'],
      'paid': ['void'],
      'canceled': ['draft'],
      'void': [],
    };

    return allowedTransitions[fromStatus]?.includes(toStatus) || false;
  };

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    updateInvoiceStatusMutation.mutate(newStatus);
  };

  return (
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
          <DropdownMenuItem onClick={() => handleStatusChange('approved')}>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            <span>Mark as Approved</span>
          </DropdownMenuItem>
        )}
        
        {canChangeStatus(invoice.status, 'sent') && (
          <DropdownMenuItem onClick={() => handleStatusChange('sent')}>
            <Send className="mr-2 h-4 w-4 text-blue-600" />
            <span>Mark as Sent</span>
          </DropdownMenuItem>
        )}
        
        {canChangeStatus(invoice.status, 'paid') && (
          <DropdownMenuItem onClick={() => handleStatusChange('paid')}>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            <span>Mark as Paid</span>
          </DropdownMenuItem>
        )}
        
        {canChangeStatus(invoice.status, 'canceled') && (
          <DropdownMenuItem onClick={() => handleStatusChange('canceled')}>
            <Ban className="mr-2 h-4 w-4 text-red-600" />
            <span>Cancel Invoice</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}