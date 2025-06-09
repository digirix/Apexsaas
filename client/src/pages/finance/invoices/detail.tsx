import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Share, Calendar, DollarSign, Building2, User, Copy, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import type { Invoice } from "@shared/schema";

export default function InvoiceDetailPage() {
  const params = useParams();
  const tenantId = params.tenantId ? parseInt(params.tenantId) : null;
  const invoiceNumber = params.invoiceNumber || null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fetch invoice by tenant ID and invoice number
  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["/api/v1/finance/invoices/by-number", tenantId, invoiceNumber],
    enabled: !!tenantId && !!invoiceNumber,
    queryFn: async () => {
      const response = await fetch(`/api/v1/finance/invoices/by-number/${tenantId}/${invoiceNumber}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoice details");
      }
      return response.json();
    }
  });

  // Fetch client details if we have a client ID
  const { data: client } = useQuery({
    queryKey: ["/api/v1/clients", invoice?.clientId],
    enabled: !!invoice?.clientId,
    queryFn: async () => {
      if (!invoice?.clientId) throw new Error("No client ID available");
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
    enabled: !!invoice?.entityId,
    queryFn: async () => {
      if (!invoice?.entityId) throw new Error("No entity ID available");
      const response = await fetch(`/api/v1/entities/${invoice.entityId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch entity details");
      }
      return response.json();
    }
  });

  // Download PDF handler
  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    try {
      const response = await fetch(`/api/v1/finance/invoices/${invoice.id}/pdf`);
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: `Invoice ${invoice.invoiceNumber} has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Share link generator
  const handleGenerateShareLink = async () => {
    if (!invoice) return;
    
    setIsSharing(true);
    try {
      // Generate a public share URL for this invoice
      const baseUrl = window.location.origin;
      const shareLink = `${baseUrl}/pay/${invoice.id}`;
      setShareUrl(shareLink);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareLink);
      
      toast({
        title: "Share Link Generated",
        description: "Payment link copied to clipboard successfully.",
      });
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Failed to generate share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Process payment handler
  const handleProcessPayment = () => {
    if (!invoice) return;
    setLocation(`/pay/${invoice.id}`);
  };

  if (isLoading) {
    return (
      <AppLayout title="Invoice Details">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout title="Invoice Not Found">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Invoice Not Found</h3>
          <p className="text-slate-600">The invoice you're looking for doesn't exist or has been removed.</p>
        </div>
      </AppLayout>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <AppLayout title={`Invoice ${invoice.invoiceNumber}`}>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-slate-600">
              Tenant: {tenantId} • Created {format(new Date(invoice.createdAt), "PPP")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(invoice.status)}>
              {invoice.status?.toUpperCase()}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerateShareLink} disabled={isSharing}>
              {isSharing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
              ) : (
                <Share className="h-4 w-4 mr-2" />
              )}
              {isSharing ? "Generating..." : "Share"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Invoice Number</label>
                    <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Status</label>
                    <div className="mt-1">
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {invoice.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Issue Date</label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {format(new Date(invoice.issueDate), "PPP")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Due Date</label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {format(new Date(invoice.dueDate), "PPP")}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Amount Details */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span>{formatCurrency(Number(invoice.subtotal || 0), invoice.currencyCode)}</span>
                  </div>
                  {Number(invoice.taxAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax:</span>
                      <span>{formatCurrency(Number(invoice.taxAmount || 0), invoice.currencyCode)}</span>
                    </div>
                  )}
                  {Number(invoice.discountAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Discount:</span>
                      <span className="text-red-600">-{formatCurrency(Number(invoice.discountAmount || 0), invoice.currencyCode)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(Number(invoice.totalAmount || 0), invoice.currencyCode)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Amount Paid:</span>
                    <span className="text-green-600">{formatCurrency(Number(invoice.amountPaid || 0), invoice.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Amount Due:</span>
                    <span className="text-orange-600">{formatCurrency(Number(invoice.amountDue || 0), invoice.currencyCode)}</span>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Notes</label>
                      <p className="mt-1 text-slate-700">{invoice.notes}</p>
                    </div>
                  </>
                )}

                {/* Terms and Conditions */}
                {invoice.termsAndConditions && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-slate-500">Terms and Conditions</label>
                      <p className="mt-1 text-slate-700">{invoice.termsAndConditions}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Information */}
            {client && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-slate-500">Client Name</label>
                      <p className="font-medium">{client.name}</p>
                    </div>
                    {client.email && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Email</label>
                        <p>{client.email}</p>
                      </div>
                    )}
                    {client.phone && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Phone</label>
                        <p>{client.phone}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Entity Information */}
            {entity && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Entity Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-slate-500">Entity Name</label>
                      <p className="font-medium">{entity.name}</p>
                    </div>
                    {entity.entityType && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Type</label>
                        <p>{entity.entityType}</p>
                      </div>
                    )}
                    {entity.registrationNumber && (
                      <div>
                        <label className="text-sm font-medium text-slate-500">Registration Number</label>
                        <p>{entity.registrationNumber}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button className="w-full" variant="outline" onClick={handleGenerateShareLink} disabled={isSharing}>
                  {isSharing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                  ) : (
                    <Share className="h-4 w-4 mr-2" />
                  )}
                  {isSharing ? "Generating..." : "Generate Share Link"}
                </Button>
                {invoice.status !== 'paid' && (
                  <Button 
                    className="w-full" 
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                )}
                
                {/* Show share URL if generated */}
                {shareUrl && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Share Link:</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => navigator.clipboard.writeText(shareUrl)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 break-all mt-1">{shareUrl}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}