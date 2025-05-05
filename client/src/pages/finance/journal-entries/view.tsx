import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Printer,
  FileEdit,
  Trash2,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  BookText,
  DollarSign,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function JournalEntryView() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const entryId = params.id;
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // Define journal entry type to handle the response data
  interface JournalEntry {
    id: number;
    reference: string;
    description: string;
    entryDate: string;
    entryType: string;
    entryTypeName: string;
    sourceDocument?: string;
    sourceDocumentId?: string;
    isPosted: boolean;
    postedAt?: string;
    createdAt: string;
    createdByName?: string;
    notes?: string;
    lines: Array<{
      id: number;
      accountId: number;
      accountName: string;
      accountCode: string;
      description: string;
      debitAmount: string;
      creditAmount: string;
    }>;
    totalAmount: number;
  }

  // Fetch journal entry details
  const { data: journalEntry, isLoading, refetch } = useQuery({
    queryKey: ['/api/v1/finance/journal-entries', entryId],
    queryFn: async () => {
      // Use direct fetch to ensure we get the latest data
      const response = await fetch(`/api/v1/finance/journal-entries/${entryId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch journal entry');
      }
      const data = await response.json();
      console.log('Fetched journal entry:', data);
      
      // Ensure line details are complete
      if (data.lines) {
        data.lines = data.lines.map((line: any) => ({
          ...line,
          // Provide fallbacks in case these are missing
          accountName: line.accountName || 'Unknown Account',
          accountCode: line.accountCode || 'N/A',
          debitAmount: line.debitAmount || '0.00',
          creditAmount: line.creditAmount || '0.00',
        }));
      }
      
      return data as unknown as JournalEntry;
    },
    enabled: !!entryId,
  });

  // Toggle journal entry status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isPosted }: { id: number, isPosted: boolean }) => {
      const response = await apiRequest('PUT', `/api/v1/finance/journal-entries/${id}`, { isPosted });
      return response as unknown as { isPosted: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries', entryId] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries'] });
      toast({
        title: data.isPosted ? "Journal entry posted" : "Journal entry set to draft",
        description: data.isPosted 
          ? "The journal entry has been successfully posted." 
          : "The journal entry has been set to draft status.",
      });
    },
    onError: (error: any) => {
      console.error('Error toggling journal entry status:', error);
      toast({
        title: "Error changing status",
        description: error.message || "An error occurred while changing the journal entry status.",
        variant: "destructive",
      });
    },
  });

  // Delete journal entry mutation
  const deleteJournalEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/v1/finance/journal-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries'] });
      toast({
        title: "Journal entry deleted",
        description: "The journal entry has been successfully deleted.",
      });
      setLocation('/finance?tab=journalEntries');
    },
    onError: (error: any) => {
      console.error('Error deleting journal entry:', error);
      toast({
        title: "Error deleting journal entry",
        description: error.message || "An error occurred while deleting the journal entry.",
        variant: "destructive",
      });
    },
  });

  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handle toggling journal entry status
  const handleToggleStatus = () => {
    if (journalEntry) {
      toggleStatusMutation.mutate({
        id: parseInt(entryId as string),
        isPosted: !journalEntry.isPosted
      });
    }
  };
  
  // Force set to draft status without validation
  const setToDraftMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/v1/finance/journal-entries/${id}/set-draft`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries', entryId] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries'] });
      toast({
        title: "Status updated",
        description: "Journal entry has been set to draft status.",
      });
      // Refresh the journal entry data
      refetch();
    },
    onError: (error: any) => {
      console.error('Error setting journal entry to draft:', error);
      toast({
        title: "Error updating status",
        description: error.message || "An error occurred while updating the journal entry status.",
        variant: "destructive",
      });
    },
  });
  
  // Handle force setting to draft
  const handleForceDraft = () => {
    if (journalEntry && journalEntry.isPosted) {
      setToDraftMutation.mutate(parseInt(entryId as string));
    }
  };

  // Handle edit
  const handleEdit = () => {
    setLocation(`/finance/journal-entries/edit/${entryId}`);
  };

  // Handle delete
  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    deleteJournalEntryMutation.mutate(parseInt(entryId as string));
  };

  // Handle back
  const handleBack = () => {
    setLocation('/finance?tab=journalEntries');
  };
  
  // Handle print functionality
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <div className="animate-pulse h-6 w-1/3 bg-slate-200 mx-auto mb-4 rounded"></div>
            <div className="animate-pulse h-4 w-1/2 bg-slate-200 mx-auto mb-6 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!journalEntry) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <h2 className="text-lg font-medium mb-2">Journal Entry Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested journal entry could not be found.</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Journal Entries
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalDebit = journalEntry.lines?.reduce((acc: number, line: any) => 
    acc + parseFloat(line.debitAmount || 0), 0) || 0;
  
  const totalCredit = journalEntry.lines?.reduce((acc: number, line: any) => 
    acc + parseFloat(line.creditAmount || 0), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Journal Entry {journalEntry.reference}</CardTitle>
              <Badge variant={journalEntry.isPosted ? "success" : "outline"}>
                {journalEntry.isPosted ? 'Posted' : 'Draft'}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              {journalEntry.description}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Entry Type</div>
            <div className="font-medium">{journalEntry.entryTypeName || 'Standard Entry'}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Date</div>
            <div className="font-medium">
              {journalEntry.entryDate ? 
                format(new Date(journalEntry.entryDate), 'MMMM d, yyyy') : 
                'No date provided'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Source Document</div>
            <div className="font-medium">
              {journalEntry.sourceDocument?.toUpperCase() || 'Manual Entry'} 
              {journalEntry.sourceDocumentId ? ` #${journalEntry.sourceDocumentId}` : ''}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Journal Entry Lines</h3>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="p-3 text-left font-medium">Account</th>
                  <th className="p-3 text-left font-medium">Description</th>
                  <th className="p-3 text-right font-medium">Debit</th>
                  <th className="p-3 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {journalEntry.lines?.map((line: any) => (
                  <tr key={line.id} className="border-b">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{line.accountName}</p>
                        <p className="text-xs text-muted-foreground">{line.accountCode}</p>
                      </div>
                    </td>
                    <td className="p-3">{line.description}</td>
                    <td className="p-3 text-right">
                      {parseFloat(line.debitAmount) > 0 ? 
                        formatCurrency(parseFloat(line.debitAmount)) : '-'}
                    </td>
                    <td className="p-3 text-right">
                      {parseFloat(line.creditAmount) > 0 ? 
                        formatCurrency(parseFloat(line.creditAmount)) : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-medium">
                  <td colSpan={2} className="p-3 text-right">Totals:</td>
                  <td className="p-3 text-right">
                    {formatCurrency(totalDebit)}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(totalCredit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium">Journal Entry Details</h4>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Created by:</span> {journalEntry.createdByName || 'System'}
              </div>
              <div>
                <span className="font-medium">Created on:</span> {journalEntry.createdAt ? format(new Date(journalEntry.createdAt), 'MMM d, yyyy HH:mm') : 'Unknown'}
              </div>
              {journalEntry.isPosted && journalEntry.postedAt && (
                <div>
                  <span className="font-medium">Posted on:</span> {
                    journalEntry.postedAt ? 
                      format(new Date(journalEntry.postedAt), 'MMM d, yyyy HH:mm') : 
                      'Unknown'
                  }
                </div>
              )}
              {journalEntry.notes && (
                <div className="mt-2">
                  <span className="font-medium">Notes:</span>
                  <p className="mt-1">{journalEntry.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>

              {!journalEntry.isPosted && (
                <>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <FileEdit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}

              {journalEntry.isPosted ? (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleForceDraft}
                  title="Set to draft without validation (for troubleshooting)"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Set to Draft
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleToggleStatus}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Post Entry
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this journal entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the journal entry and all of its associated lines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}