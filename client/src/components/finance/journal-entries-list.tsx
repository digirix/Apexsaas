import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, FileText, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JournalEntryLine {
  id: number;
  tenantId: number;
  journalEntryId: number;
  accountId: number;
  accountName?: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  lineOrder: number;
  createdAt: Date;
}

interface JournalEntry {
  id: number;
  tenantId: number;
  entryDate: Date;
  reference: string;
  description: string;
  isPosted: boolean;
  postedAt?: Date;
  createdBy: number;
  updatedBy?: number;
  sourceDocument: string;
  sourceDocumentId?: number;
  createdAt: Date;
  updatedAt?: Date;
  lines?: JournalEntryLine[];
}

export function JournalEntriesList() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  
  const { data: journalEntries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['/api/v1/finance/journal-entries'],
  });
  
  const { data: selectedEntryDetails, isLoading: isLoadingDetails } = useQuery<JournalEntry>({
    queryKey: ['/api/v1/finance/journal-entries', selectedEntry?.id],
    enabled: !!selectedEntry?.id,
  });
  
  function handleViewEntry(entry: JournalEntry) {
    setSelectedEntry(entry);
  }
  
  const getSourceIcon = (sourceDocument: string) => {
    switch(sourceDocument) {
      case 'invoice':
        return <FileText className="h-4 w-4 mr-1" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Journal Entries</h2>
      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Ledger</CardTitle>
          <CardDescription>
            All accounting transactions recorded in the general ledger
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries && journalEntries.length > 0 ? (
                  journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.entryDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{entry.reference}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getSourceIcon(entry.sourceDocument)}
                          <span className="capitalize">{entry.sourceDocument}</span>
                        </div>
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>
                        {entry.isPosted ? (
                          <Badge variant="success">Posted</Badge>
                        ) : (
                          <Badge variant="outline">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewEntry(entry)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No journal entries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Details Dialog */}
      <Dialog 
        open={!!selectedEntry} 
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Journal Entry Details</DialogTitle>
            <DialogDescription>
              View the details of this accounting transaction
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedEntryDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Reference</h4>
                  <p className="text-lg font-medium">{selectedEntryDetails.reference}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
                  <p className="text-lg font-medium">
                    {format(new Date(selectedEntryDetails.entryDate), "MMMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Source</h4>
                  <p className="text-lg font-medium capitalize">
                    {selectedEntryDetails.sourceDocument} 
                    {selectedEntryDetails.sourceDocumentId ? ` #${selectedEntryDetails.sourceDocumentId}` : ""}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <p className="text-lg font-medium">
                    {selectedEntryDetails.isPosted ? (
                      <Badge variant="success">Posted</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                <p>{selectedEntryDetails.description}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Journal Entry Lines</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntryDetails.lines && selectedEntryDetails.lines.length > 0 ? (
                      selectedEntryDetails.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.accountName || `Account #${line.accountId}`}</TableCell>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">
                            {parseFloat(line.debitAmount) > 0 
                              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(line.debitAmount)) 
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {parseFloat(line.creditAmount) > 0
                              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(line.creditAmount))
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No journal entry lines found
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Totals row */}
                    {selectedEntryDetails.lines && selectedEntryDetails.lines.length > 0 && (
                      <TableRow className="font-bold">
                        <TableCell colSpan={2} className="text-right">Total</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                            selectedEntryDetails.lines.reduce((sum, line) => sum + parseFloat(line.debitAmount), 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                            selectedEntryDetails.lines.reduce((sum, line) => sum + parseFloat(line.creditAmount), 0)
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedEntry(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">Failed to load journal entry details</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}