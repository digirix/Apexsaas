import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();

  // Fetch invoice data
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["/api/v1/finance/invoices", parseInt(id!)],
    enabled: !!id,
  });

  // Fetch tenant settings for firm branding
  const { data: tenantSettings } = useQuery({
    queryKey: ["/api/v1/tenant/settings"],
    enabled: !!id,
  });

  // Fetch line items
  const { data: lineItems = [] } = useQuery({
    queryKey: ["/api/v1/finance/invoices", parseInt(id!), "line-items"],
    enabled: !!id,
  });

  // Auto-focus print dialog when page loads
  useEffect(() => {
    if (invoice && !isLoading) {
      // Small delay to ensure page is fully rendered
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [invoice, isLoading]);

  // Helper function to get tenant setting
  const getSetting = (key: string) => {
    if (!tenantSettings || !Array.isArray(tenantSettings)) return '';
    const setting = tenantSettings.find((s: any) => s.key === key);
    return setting?.value || '';
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${invoice?.currencyCode || 'USD'} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Invoice not found</p>
        </div>
      </div>
    );
  }

  const firmName = getSetting('firm_name') || getSetting('name') || 'Your Firm';
  const taskDetails = invoice.serviceName || invoice.taskDetails || 'Professional Services';

  return (
    <>
      {/* Print styles */}
      <style jsx>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .print-container { 
            max-width: none !important; 
            margin: 0 !important; 
            padding: 20px !important;
          }
        }
        @media screen {
          .print-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 40px;
            min-height: 11in;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 py-8">
        {/* Print button - hidden in print mode */}
        <div className="no-print fixed top-4 right-4 z-10">
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Invoice
          </Button>
        </div>

        <div className="print-container">
          {/* Invoice Header with Gradient Background */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">INVOICE</h1>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                    invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {invoice.status?.toUpperCase()}
                  </span>
                  {invoice.issueDate && (
                    <span className="text-sm text-slate-600">
                      Issued: {format(new Date(invoice.issueDate), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Invoice Number</p>
                <p className="text-xl font-bold text-slate-900">#{invoice.invoiceNumber || invoice.id}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">From</p>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{firmName}</p>
                  {getSetting('address') && <p className="text-sm text-slate-600">{getSetting('address')}</p>}
                  {getSetting('email') && <p className="text-sm text-slate-600">{getSetting('email')}</p>}
                  {getSetting('phone') && <p className="text-sm text-slate-600">{getSetting('phone')}</p>}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Bill To</p>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{invoice.clientName || "Client"}</p>
                  <p className="text-sm text-slate-600">{invoice.entityName || "Entity"}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Amount</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(invoice.totalAmount || 0)}
                </p>
                {invoice.amountDue && parseFloat(invoice.amountDue) > 0 && (
                  <p className="text-sm text-red-600">
                    Due: {formatCurrency(invoice.amountDue)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Services Provided Section */}
          <div className="bg-white border rounded-lg overflow-hidden mb-8">
            <div className="bg-slate-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-slate-900">Services Provided</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems && lineItems.length > 0 ? (
                    lineItems.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-3 px-4 text-slate-700">{item.description || taskDetails}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{item.quantity || 1}</td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {formatCurrency(item.unitPrice || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          {formatCurrency(item.lineTotal || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-700">{taskDetails}</td>
                      <td className="py-3 px-4 text-center text-slate-700">1</td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {formatCurrency(invoice.totalAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatCurrency(invoice.totalAmount || 0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Totals */}
            <div className="bg-slate-50 px-4 py-3 border-t">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span className="font-medium text-slate-700">Total Amount:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(invoice.totalAmount || 0)}
                    </span>
                  </div>
                  {invoice.amountDue && parseFloat(invoice.amountDue) > 0 && (
                    <div className="flex justify-between py-2 border-t">
                      <span className="font-medium text-red-700">Amount Due:</span>
                      <span className="font-bold text-red-700">
                        {formatCurrency(invoice.amountDue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms and Notes */}
          <div className="space-y-4 mb-8">
            {invoice.dueDate && (
              <div>
                <p className="font-medium text-slate-900 mb-1">Payment Due Date:</p>
                <p className="text-slate-700">{format(new Date(invoice.dueDate), 'MMMM dd, yyyy')}</p>
              </div>
            )}

            {invoice.notes && (
              <div>
                <p className="font-medium text-slate-900 mb-1">Notes:</p>
                <p className="text-slate-700">{invoice.notes}</p>
              </div>
            )}

            {invoice.termsAndConditions && (
              <div>
                <p className="font-medium text-slate-900 mb-1">Terms and Conditions:</p>
                <p className="text-slate-700 text-sm">{invoice.termsAndConditions}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t pt-4 mt-8">
            <div className="text-center text-sm text-slate-500">
              <p>Invoice #{invoice.invoiceNumber} | {firmName} | Generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
              {(getSetting('email') || getSetting('phone') || getSetting('website')) && (
                <p className="mt-1">
                  {[getSetting('email'), getSetting('phone'), getSetting('website')].filter(Boolean).join(' | ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}