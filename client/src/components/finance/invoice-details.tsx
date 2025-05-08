import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Link as LinkIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Invoice Details Modal props
interface InvoiceDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number | null;
  initialTab?: string;
}

export function InvoiceDetails({ isOpen, onClose, invoiceId, initialTab = "details" }: InvoiceDetailsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  
  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  
  // Fetch invoice details
  const { data: invoice, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ["/api/v1/finance/invoices", invoiceId],
    enabled: isOpen && !!invoiceId,
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/v1/finance/invoices/${invoiceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoice details");
      }
      return response.json();
    }
  });
  
  // Fetch client details if we have a client ID
  const { data: client } = useQuery({
    queryKey: ["/api/v1/clients", invoice?.clientId],
    enabled: isOpen && !!invoice?.clientId,
    queryFn: async () => {
      const response = await fetch(`/api/v1/clients/${invoice.clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client details");
      }
      return response.json();
    }
  });
  
  // Fetch entity details if we have an entity ID
  const { data: entity } = useQuery({
    queryKey: ["/api/v1/entities", invoice?.entityId],
    enabled: isOpen && !!invoice?.entityId,
    queryFn: async () => {
      const response = await fetch(`/api/v1/entities/${invoice.entityId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch entity details");
      }
      return response.json();
    }
  });
  
  // Function to download PDF
  const handleDownloadPdf = async () => {
    if (!invoice) return;
    
    setIsGeneratingPdf(true);
    
    try {
      // Open PDF in new tab
      window.open(`/api/v1/finance/invoices/${invoice.id}/pdf`, '_blank');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  // Function to generate share link
  const generateShareLink = async () => {
    if (!invoice) return;
    
    setIsGeneratingShareLink(true);
    
    try {
      // Direct fetch for share link
      const response = await fetch(`/api/v1/finance/invoices/${invoice.id}/share-link`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }
      
      const result = await response.json();
      
      if (result.shareLink) {
        // Copy to clipboard
        navigator.clipboard.writeText(result.shareLink);
        
        toast({
          title: "Share Link Generated",
          description: "A shareable link has been copied to your clipboard.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate share link. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingShareLink(false);
    }
  };
  
  // Get status badge variant by status
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft': return "secondary";
      case 'sent': return "warning";
      case 'paid': return "success";
      case 'approved': return "default";
      case 'overdue': return "destructive";
      case 'canceled': return "outline";
      default: return "outline";
    }
  };
  
  // Format status display name
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  // Format currency with symbol
  const formatCurrency = (amount: number | string, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <FileText className="mr-2 h-5 w-5 text-blue-600" />
            {isInvoiceLoading ? "Loading Invoice..." : `Invoice #${invoice?.invoiceNumber}`}
          </DialogTitle>
          {invoice && (
            <DialogDescription className="flex items-center mt-1">
              <Badge variant={getStatusVariant(invoice.status)} className="mr-2">
                {formatStatus(invoice.status)}
              </Badge>
              <span>
                {client?.displayName ? `${client.displayName}` : ""}
                {entity?.name ? ` - ${entity.name}` : ""}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>
        
        {isInvoiceLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : invoice ? (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Line Items</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1 pr-4">
                <TabsContent value="details" className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500">Issue Date</h3>
                      <p className="mt-1">{format(new Date(invoice.issueDate), "MMM d, yyyy")}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500">Due Date</h3>
                      <p className="mt-1">{format(new Date(invoice.dueDate), "MMM d, yyyy")}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500">Currency</h3>
                      <p className="mt-1">{invoice.currencyCode}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500">Status</h3>
                      <p className="mt-1">
                        <Badge variant={getStatusVariant(invoice.status)}>
                          {formatStatus(invoice.status)}
                        </Badge>
                      </p>
                    </div>
                  </div>
                  
                  <div className="rounded-md border p-4 bg-slate-50">
                    <h3 className="font-medium mb-3">Amount Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal:</span>
                        <span>{formatCurrency(invoice.subtotal, invoice.currencyCode)}</span>
                      </div>
                      {parseFloat(invoice.taxAmount) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tax ({parseFloat(invoice.taxPercent)}%):</span>
                          <span>{formatCurrency(invoice.taxAmount, invoice.currencyCode)}</span>
                        </div>
                      )}
                      {parseFloat(invoice.discountAmount) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Discount:</span>
                          <span>-{formatCurrency(invoice.discountAmount, invoice.currencyCode)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>Total:</span>
                        <span>{formatCurrency(invoice.totalAmount, invoice.currencyCode)}</span>
                      </div>
                      {parseFloat(invoice.amountPaid) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Amount Paid:</span>
                          <span>{formatCurrency(invoice.amountPaid, invoice.currencyCode)}</span>
                        </div>
                      )}
                      {parseFloat(invoice.amountDue) > 0 && (
                        <div className="flex justify-between font-bold">
                          <span>Amount Due:</span>
                          <span>{formatCurrency(invoice.amountDue, invoice.currencyCode)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {invoice.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Notes</h3>
                      <p className="text-sm">{invoice.notes}</p>
                    </div>
                  )}
                  
                  {invoice.termsAndConditions && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Terms and Conditions</h3>
                      <p className="text-sm">{invoice.termsAndConditions}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="items" className="py-4">
                  {invoice.lineItems?.length > 0 ? (
                    <div className="space-y-4">
                      {invoice.lineItems.map((item: any, index: number) => (
                        <div key={index} className="border rounded-md p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{item.description}</h3>
                              {item.details && <p className="text-sm text-slate-600 mt-1">{item.details}</p>}
                            </div>
                            <span className="font-medium">{formatCurrency(item.amount, invoice.currencyCode)}</span>
                          </div>
                          {(item.quantity > 1 || item.rate) && (
                            <div className="text-xs text-slate-500 mt-2">
                              {item.quantity && item.rate ? 
                                `${item.quantity} x ${formatCurrency(item.rate, invoice.currencyCode)}` : 
                                (item.quantity ? `Quantity: ${item.quantity}` : `Rate: ${formatCurrency(item.rate, invoice.currencyCode)}`)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No line items to display
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
            
            <DialogFooter className="pt-4 sm:justify-between">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={generateShareLink}
                  disabled={isGeneratingShareLink}
                >
                  {isGeneratingShareLink ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                  )}
                  Copy Link
                </Button>
                
                <Button 
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">Invoice not found or could not be loaded</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}