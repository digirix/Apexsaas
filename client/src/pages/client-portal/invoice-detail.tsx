import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ClientPortalLayout } from "@/components/client-portal/client-portal-layout";
import { PaymentInterface } from "@/components/client-portal/payment-interface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Calendar, DollarSign, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import type { Invoice } from "@shared/schema";

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id ? parseInt(params.id) : null;
  const [paymentSuccessDialogOpen, setPaymentSuccessDialogOpen] = useState(false);

  // Fetch invoice details
  const { data: invoice, isLoading, refetch } = useQuery<Invoice & { lineItems: any[] }>({
    queryKey: ["/api/v1/client-portal/invoices", invoiceId],
    enabled: !!invoiceId,
    refetchOnWindowFocus: false
  });

  const handlePaymentSuccess = () => {
    setPaymentSuccessDialogOpen(true);
    refetch(); // Refresh invoice data
  };

  const downloadPDF = () => {
    // Open the print view in a new window
    const printUrl = `/finance/invoices/${invoiceId}/print`;
    window.open(printUrl, '_blank', 'width=800,height=600');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'approved':
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const isOverdue = invoice && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid';

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </ClientPortalLayout>
    );
  }

  if (!invoice) {
    return (
      <ClientPortalLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Invoice Not Found</h3>
                <p className="text-muted-foreground">The requested invoice could not be found.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Invoice #{invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground">
              Issued on {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={`${getStatusColor(invoice.status)} flex items-center gap-1`}
            >
              {getStatusIcon(invoice.status)}
              {invoice.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Button variant="outline" onClick={downloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Overdue Alert */}
        {isOverdue && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This invoice is overdue. Payment was due on {new Date(invoice.dueDate).toLocaleDateString()}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                    <p className="font-semibold">{invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Issue Date</p>
                    <p className="font-semibold">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                    <p className="font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment Terms</p>
                    <p className="font-semibold">{invoice.paymentTerms || "Net 30"}</p>
                  </div>
                </div>

                {/* Service Description Section */}
                {((invoice as any).serviceName || (invoice as any).taskDetails) && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-2">Service Description</p>
                    {(invoice as any).serviceName && (
                      <p className="font-semibold text-blue-800 mb-2">{(invoice as any).serviceName}</p>
                    )}
                    {(invoice as any).taskDetails && (
                      <p className="text-blue-700 leading-relaxed">{(invoice as any).taskDetails}</p>
                    )}
                  </div>
                )}

                {invoice.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Additional Notes</p>
                    <p className="mt-1">{invoice.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoice.lineItems && invoice.lineItems.length > 0 ? (
                    <>
                      {invoice.lineItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b last:border-b-0">
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            {item.details && (
                              <p className="text-sm text-muted-foreground">{item.details}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${parseFloat(item.lineTotal).toFixed(2)}</p>
                            {item.quantity && item.unitPrice && (
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${parseFloat(invoice.subtotal || "0").toFixed(2)}</span>
                        </div>
                        {parseFloat(invoice.taxAmount || "0") > 0 && (
                          <div className="flex justify-between">
                            <span>Tax</span>
                            <span>${parseFloat(invoice.taxAmount).toFixed(2)}</span>
                          </div>
                        )}
                        {parseFloat(invoice.discountAmount || "0") > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-${parseFloat(invoice.discountAmount).toFixed(2)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>${parseFloat(invoice.totalAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No line items available for this invoice.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            {/* Amount Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Amount Due
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold">${parseFloat(invoice.totalAmount).toFixed(2)}</p>
                  <p className="text-muted-foreground mt-2">
                    Due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                  {isOverdue && (
                    <p className="text-red-600 text-sm mt-1 font-medium">
                      {Math.ceil((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Interface */}
            <PaymentInterface 
              invoice={invoice} 
              onPaymentSuccess={handlePaymentSuccess}
            />
          </div>
        </div>

        {/* Payment Success Dialog */}
        <Dialog open={paymentSuccessDialogOpen} onOpenChange={setPaymentSuccessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Payment Successful
              </DialogTitle>
              <DialogDescription>
                Your payment has been processed successfully. This invoice has been marked as paid.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button onClick={() => setPaymentSuccessDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ClientPortalLayout>
  );
}