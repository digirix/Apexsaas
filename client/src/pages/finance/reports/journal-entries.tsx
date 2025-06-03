import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Plus, Edit, Trash2, Download, Eye, Calendar, Filter, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { apiRequest } from "@/lib/queryClient";

interface JournalEntry {
  id: number;
  tenantId: number;
  entryDate: string;
  reference: string;
  entryType: string;
  description: string;
  isPosted: boolean;
  isDeleted: boolean;
  postedAt: string | null;
  createdBy: number;
  updatedBy: number | null;
  sourceDocument: string;
  sourceDocumentId: number | null;
  createdAt: string;
  updatedAt: string | null;
  lines: JournalEntryLine[];
}

interface JournalEntryLine {
  id: number;
  accountId: number;
  accountName: string;
  accountCode: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  lineOrder: number;
}

export default function JournalEntriesReportPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  // Modal states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  // Fetch journal entries
  const { data: journalEntries, isLoading } = useQuery({
    queryKey: ['/api/v1/finance/journal-entries'],
    refetchOnWindowFocus: false,
  });

  // Fetch chart of accounts for account hierarchy information
  const { data: chartOfAccounts } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
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
      setEntryToDelete(null);
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

  // Filter and search journal entries
  const filteredEntries = useMemo(() => {
    if (!journalEntries) return [];
    
    return journalEntries.filter((entry: JournalEntry) => {
      // Date range filter
      if (startDate && new Date(entry.entryDate) < startDate) return false;
      if (endDate && new Date(entry.entryDate) > endDate) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          entry.reference.toLowerCase().includes(searchLower) ||
          entry.description.toLowerCase().includes(searchLower) ||
          entry.entryType.toLowerCase().includes(searchLower) ||
          entry.lines?.some(line => 
            line.accountName.toLowerCase().includes(searchLower) ||
            line.accountCode.toLowerCase().includes(searchLower) ||
            line.description.toLowerCase().includes(searchLower)
          );
        if (!matchesSearch) return false;
      }
      
      // Entry type filter
      if (entryTypeFilter !== "all" && entry.entryType !== entryTypeFilter) return false;
      
      // Status filter
      if (statusFilter === "posted" && !entry.isPosted) return false;
      if (statusFilter === "draft" && entry.isPosted) return false;
      
      return true;
    });
  }, [journalEntries, startDate, endDate, searchTerm, entryTypeFilter, statusFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredEntries) return { totalDebits: 0, totalCredits: 0 };
    
    return filteredEntries.reduce((acc, entry) => {
      const entryDebits = entry.lines?.reduce((sum, line) => sum + parseFloat(line.debitAmount || "0"), 0) || 0;
      const entryCredits = entry.lines?.reduce((sum, line) => sum + parseFloat(line.creditAmount || "0"), 0) || 0;
      
      return {
        totalDebits: acc.totalDebits + entryDebits,
        totalCredits: acc.totalCredits + entryCredits
      };
    }, { totalDebits: 0, totalCredits: 0 });
  }, [filteredEntries]);

  // Create account hierarchy lookup function
  const getAccountHierarchy = (accountId: number) => {
    if (!chartOfAccounts) return {
      mainGroup: '',
      elementGroup: '',
      subElementGroup: '',
      detailedGroup: ''
    };

    const account = chartOfAccounts.find((acc: any) => acc.id === accountId);
    return {
      mainGroup: account?.mainGroupName || '',
      elementGroup: account?.elementGroupName || '',
      subElementGroup: account?.subElementGroupName === 'custom' ? (account?.subElementGroupCustomName || '') : (account?.subElementGroupName || ''),
      detailedGroup: account?.detailedGroupName === 'custom' ? (account?.detailedGroupCustomName || '') : (account?.detailedGroupName || '')
    };
  };

  // Export to CSV function
  const exportToCSV = () => {
    if (!filteredEntries || filteredEntries.length === 0) {
      toast({
        title: "No data to export",
        description: "Please ensure there are journal entries to export.",
        variant: "destructive",
      });
      return;
    }

    const csvData = [];
    
    // Add header with account hierarchy columns
    csvData.push([
      "Entry ID",
      "Date",
      "Reference",
      "Entry Type",
      "Description",
      "Status",
      "Account Code",
      "Account Name",
      "Main Group",
      "Element Group",
      "Sub Element Group",
      "Detailed Group",
      "Line Description",
      "Debit Amount",
      "Credit Amount",
      "Source Document",
      "Created At",
      "Posted At"
    ]);

    // Add data rows
    filteredEntries.forEach((entry: JournalEntry) => {
      if (entry.lines && entry.lines.length > 0) {
        entry.lines.forEach((line: JournalEntryLine) => {
          const hierarchy = getAccountHierarchy(line.accountId);
          
          csvData.push([
            entry.id.toString(),
            format(new Date(entry.entryDate), "yyyy-MM-dd"),
            entry.reference,
            entry.entryType,
            entry.description,
            entry.isPosted ? "Posted" : "Draft",
            line.accountCode,
            line.accountName,
            hierarchy.mainGroup,
            hierarchy.elementGroup,
            hierarchy.subElementGroup,
            hierarchy.detailedGroup,
            line.description,
            line.debitAmount,
            line.creditAmount,
            entry.sourceDocument,
            format(new Date(entry.createdAt), "yyyy-MM-dd HH:mm:ss"),
            entry.postedAt ? format(new Date(entry.postedAt), "yyyy-MM-dd HH:mm:ss") : ""
          ]);
        });
      } else {
        // Entry without lines
        csvData.push([
          entry.id.toString(),
          format(new Date(entry.entryDate), "yyyy-MM-dd"),
          entry.reference,
          entry.entryType,
          entry.description,
          entry.isPosted ? "Posted" : "Draft",
          "",
          "",
          "",
          "",
          "",
          entry.sourceDocument,
          format(new Date(entry.createdAt), "yyyy-MM-dd HH:mm:ss"),
          entry.postedAt ? format(new Date(entry.postedAt), "yyyy-MM-dd HH:mm:ss") : ""
        ]);
      }
    });

    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `journal_entries_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${filteredEntries.length} journal entries to CSV.`,
    });
  };

  // Helper function to format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Toggle expanded entry
  const toggleExpandEntry = (entryId: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  // Handle delete entry
  const handleDeleteEntry = (entry: JournalEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteJournalEntryMutation.mutate(entryToDelete.id);
    }
  };

  return (
    <AppLayout title="Journal Entries Report">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/finance/reports")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Journal Entries Report</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={!filteredEntries || filteredEntries.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setLocation("/finance/journal-entries/create")}>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Compact Filters and Summary */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            {/* Filters Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
              {/* Date Range */}
              <div className="col-span-1">
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left font-normal text-xs"
                    >
                      <Calendar className="mr-1 h-3 w-3" />
                      {startDate ? format(startDate, "MMM dd") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        setStartDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="col-span-1">
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left font-normal text-xs"
                    >
                      <Calendar className="mr-1 h-3 w-3" />
                      {endDate ? format(endDate, "MMM dd") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        setEndDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Search */}
              <div className="col-span-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Entry Type Filter */}
              <div className="col-span-1">
                <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="INVAP">Invoice Applied</SelectItem>
                    <SelectItem value="PAYAP">Payment Applied</SelectItem>
                    <SelectItem value="MANUAL">Manual Entry</SelectItem>
                    <SelectItem value="ADJ">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="col-span-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="col-span-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setSearchTerm("");
                    setEntryTypeFilter("all");
                    setStatusFilter("all");
                  }}
                  className="w-full h-8 text-xs"
                >
                  <Filter className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div className="text-center">
                <div className="text-lg font-bold">{filteredEntries?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total Entries</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(totals.totalDebits)}
                </div>
                <p className="text-xs text-muted-foreground">Total Debits</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(totals.totalCredits)}
                </div>
                <p className="text-xs text-muted-foreground">Total Credits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Journal Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries</CardTitle>
            <CardDescription>
              {filteredEntries?.length ? `Showing ${filteredEntries.length} entries` : "No entries found"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Debit</TableHead>
                      <TableHead>Total Credit</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries?.map((entry: JournalEntry) => {
                      const entryTotalDebit = entry.lines?.reduce((sum, line) => sum + parseFloat(line.debitAmount || "0"), 0) || 0;
                      const entryTotalCredit = entry.lines?.reduce((sum, line) => sum + parseFloat(line.creditAmount || "0"), 0) || 0;
                      const isExpanded = expandedEntries.has(entry.id);
                      
                      return (
                        <>
                          <TableRow key={entry.id} className="hover:bg-muted/50">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpandEntry(entry.id)}
                                className="h-6 w-6 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {format(new Date(entry.entryDate), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="font-mono">
                              {entry.reference}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {entry.entryType}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {entry.description}
                            </TableCell>
                            <TableCell>
                              <Badge variant={entry.isPosted ? "default" : "secondary"}>
                                {entry.isPosted ? "Posted" : "Draft"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(entryTotalDebit)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(entryTotalCredit)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setLocation(`/finance/journal-entries/view/${entry.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setLocation(`/finance/journal-entries/edit/${entry.id}`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteEntry(entry)}
                                  disabled={deleteJournalEntryMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded journal entry lines */}
                          {isExpanded && entry.lines && entry.lines.length > 0 && (
                            <TableRow key={`${entry.id}-lines`}>
                              <TableCell colSpan={9} className="p-0">
                                <div className="bg-muted/20 border-l-4 border-l-primary/30">
                                  <div className="p-4">
                                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                                      Journal Entry Lines
                                    </h4>
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-b-muted">
                                            <TableHead className="text-xs">Account Code</TableHead>
                                            <TableHead className="text-xs">Account Name</TableHead>
                                            <TableHead className="text-xs">Description</TableHead>
                                            <TableHead className="text-xs text-right">Debit</TableHead>
                                            <TableHead className="text-xs text-right">Credit</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {entry.lines.map((line: JournalEntryLine) => (
                                            <TableRow key={line.id} className="border-b-muted/50">
                                              <TableCell className="font-mono text-xs py-2">
                                                {line.accountCode}
                                              </TableCell>
                                              <TableCell className="text-xs py-2">
                                                {line.accountName}
                                              </TableCell>
                                              <TableCell className="text-xs py-2 max-w-xs truncate">
                                                {line.description}
                                              </TableCell>
                                              <TableCell className="text-xs text-right font-mono py-2">
                                                {line.debitAmount && parseFloat(line.debitAmount) > 0 
                                                  ? formatCurrency(line.debitAmount)
                                                  : "-"
                                                }
                                              </TableCell>
                                              <TableCell className="text-xs text-right font-mono py-2">
                                                {line.creditAmount && parseFloat(line.creditAmount) > 0 
                                                  ? formatCurrency(line.creditAmount)
                                                  : "-"
                                                }
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                          
                                          {/* Line totals */}
                                          <TableRow className="border-t-2 border-muted bg-muted/30">
                                            <TableCell colSpan={3} className="font-medium text-xs py-2">
                                              <strong>Line Totals:</strong>
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-mono font-bold py-2">
                                              {formatCurrency(entryTotalDebit)}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-mono font-bold py-2">
                                              {formatCurrency(entryTotalCredit)}
                                            </TableCell>
                                          </TableRow>
                                        </TableBody>
                                      </Table>
                                    </div>
                                    
                                    {/* Entry metadata */}
                                    <div className="mt-3 pt-3 border-t border-muted/50">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                        <div>
                                          <span className="font-medium">Source:</span> {entry.sourceDocument}
                                        </div>
                                        <div>
                                          <span className="font-medium">Created:</span> {format(new Date(entry.createdAt), "MMM dd, yyyy HH:mm")}
                                        </div>
                                        {entry.postedAt && (
                                          <div>
                                            <span className="font-medium">Posted:</span> {format(new Date(entry.postedAt), "MMM dd, yyyy HH:mm")}
                                          </div>
                                        )}
                                        {entry.updatedAt && (
                                          <div>
                                            <span className="font-medium">Updated:</span> {format(new Date(entry.updatedAt), "MMM dd, yyyy HH:mm")}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          
                          {/* Show message if no lines */}
                          {isExpanded && (!entry.lines || entry.lines.length === 0) && (
                            <TableRow key={`${entry.id}-no-lines`}>
                              <TableCell colSpan={9} className="p-0">
                                <div className="bg-muted/20 border-l-4 border-l-yellow-500/30 p-4">
                                  <p className="text-sm text-muted-foreground text-center">
                                    No journal entry lines found for this entry.
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {(!filteredEntries || filteredEntries.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No journal entries found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete journal entry "{entryToDelete?.reference}"? 
                This will soft delete the entry and exclude it from financial reports.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}