import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

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
  CheckCircle2,
  Pencil,
  Trash2,
  MoreHorizontal,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function JournalEntriesList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Fetch journal entries
  const { data: journalEntries, isLoading: journalEntriesLoading } = useQuery({
    queryKey: ['/api/v1/finance/journal-entries'],
    refetchOnWindowFocus: false,
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
      setDeleteDialogOpen(false);
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
  
  // Toggle journal entry status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isPosted }: { id: number, isPosted: boolean }) => {
      const response = await apiRequest('PUT', `/api/v1/finance/journal-entries/${id}`, { isPosted });
      return response as unknown as { isPosted: boolean };
    },
    onSuccess: (data) => {
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
  
  // Force set to draft status without validation
  const setToDraftMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/v1/finance/journal-entries/${id}/set-draft`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/journal-entries'] });
      toast({
        title: "Status updated",
        description: "Journal entry has been set to draft status.",
      });
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
  
  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Handle edit journal entry
  const handleEditEntry = (entry: any) => {
    setLocation(`/finance/journal-entries/edit/${entry.id}`);
  };
  
  // Handle delete journal entry
  const handleDeleteEntry = (entry: any) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };
  
  // Confirm delete journal entry
  const confirmDeleteEntry = () => {
    if (entryToDelete) {
      deleteJournalEntryMutation.mutate(entryToDelete.id);
    }
  };
  
  // Handle toggling journal entry status
  const handleToggleStatus = (entry: any) => {
    toggleStatusMutation.mutate({
      id: entry.id,
      isPosted: !entry.isPosted
    });
  };
  
  // Handle force setting to draft
  const handleForceDraft = (entry: any) => {
    if (entry.isPosted) {
      setToDraftMutation.mutate(entry.id);
    }
  };
  
  // Handle view detail
  const handleViewDetail = (entry: any) => {
    setLocation(`/finance/journal-entries/view/${entry.id}`);
  };
  
  // Pagination functions
  const paginatedEntries = journalEntries ? 
    [...(journalEntries as any[])].slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    ) : [];
    
  const totalPages = journalEntries ? 
    Math.ceil((journalEntries as any[]).length / ITEMS_PER_PAGE) : 0;
    
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
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
        ) : journalEntries && (journalEntries as any[]).length > 0 ? (
          <div>
            <Accordion type="multiple" className="space-y-4">
              {paginatedEntries.map((entry: any) => (
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
                            {entry.sourceDocument?.toUpperCase() || 'MANUAL'} 
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
                      <div className="p-3 bg-slate-50 flex flex-col sm:flex-row justify-between text-sm">
                        <div className="space-y-1 mb-2 sm:mb-0">
                          <div>
                            <span className="font-medium">Created by:</span> {entry.createdByName || 'System'}
                          </div>
                          <div>
                            <span className="font-medium">Created on:</span> {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                          </div>
                          {entry.isPosted && entry.postedAt && (
                            <div>
                              <span className="font-medium">Posted on:</span> {format(new Date(entry.postedAt), 'MMM d, yyyy HH:mm')}
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex space-x-2 items-start">
                          {/* View Detail button (always visible) */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(entry);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Detail
                          </Button>
                          
                          {/* Edit and Delete buttons (only visible for draft entries) */}
                          {!entry.isPosted && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEntry(entry);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEntry(entry);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </>
                          )}
                          
                          {/* Toggle Status button */}
                          <Button
                            variant={entry.isPosted ? "outline" : "default"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(entry);
                            }}
                          >
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            {entry.isPosted ? "Set to Draft" : "Post Entry"}
                          </Button>
                          
                          {/* Force Draft button (only visible for posted entries) */}
                          {entry.isPosted && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForceDraft(entry);
                              }}
                              title="Force set to draft without validation (for troubleshooting)"
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Force Draft
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, (journalEntries as any[]).length)} of {(journalEntries as any[]).length} entries
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="ml-1">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <span className="mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
              onClick={confirmDeleteEntry}
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