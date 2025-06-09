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
    return num.toFixed(2);
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

  const firmName = getSetting('firm_name') || getSetting('name') || 'Apex Financial Advisory';
  const firmTagline = getSetting('tagline') || 'Your Personal Accountant';
  const firmAddress = getSetting('address') || '30 N Gould St, Ste R';
  const firmPhone = getSetting('phone') || '+92 31 35661968';
  const firmEmail = getSetting('email') || 'super@gmail.com';

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-container { 
            max-width: none !important; 
            margin: 0 !important; 
            padding: 20px !important;
          }
          .page-break { page-break-before: always; }
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
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
        }
        .invoice-table th,
        .invoice-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .invoice-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .amount-due {
          background-color: #ffebee;
          font-weight: bold;
          color: #d32f2f;
        }
      `}</style>

      <div className="min-h-screen bg-white py-8">
        {/* Print button - hidden in print mode */}
        <div className="no-print fixed top-4 right-4 z-10">
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Invoice
          </Button>
        </div>

        <div className="print-container">
          {/* Date and Invoice Number Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              {format(new Date(), 'M/d/yy, h:mm a')}
            </div>
            <div className="text-sm text-gray-600">
              Invoice #{invoice.invoiceNumber}
            </div>
          </div>

          {/* Company Header - Blue */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-600 mb-1">{firmName}</h1>
            <p className="text-sm text-gray-600 mb-2">{firmTagline}</p>
            <p className="text-sm text-gray-600">{firmAddress} | {firmPhone} | {firmEmail}</p>
          </div>

          <hr className="border-gray-400 mb-6" />

          {/* Invoice Title and Details */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">INVOICE</h2>
            <p className="text-sm text-gray-600">#{invoice.invoiceNumber}</p>
            <div className="inline-block bg-gray-200 px-4 py-1 mt-2">
              <span className="text-sm font-medium">{invoice.status?.toUpperCase()}</span>
            </div>
          </div>

          {/* Bill To and Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-bold mb-2">Bill To:</h3>
              <p className="font-medium">{invoice.clientName}</p>
              <p className="text-sm text-gray-600">{invoice.entityName}</p>
              <p className="text-sm text-gray-600">Pakistan</p>
              <p className="text-sm text-gray-600">Tax ID: 123123</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Invoice Details:</h3>
              <p className="text-sm"><span className="font-medium">Issue Date:</span> {format(new Date(invoice.issueDate), 'M/d/yyyy')}</p>
              <p className="text-sm"><span className="font-medium">Due Date:</span> {format(new Date(invoice.dueDate), 'M/d/yyyy')}</p>
              <p className="text-sm"><span className="font-medium">Currency:</span> {invoice.currencyCode}</p>
              <p className="text-sm"><span className="font-medium">Client:</span> {invoice.clientName}</p>
            </div>
          </div>

          {/* Services Table */}
          <table className="invoice-table mb-6">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{textAlign: 'center'}}>Quantity</th>
                <th style={{textAlign: 'right'}}>Rate</th>
                <th style={{textAlign: 'right'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{invoice.taskDetails || invoice.serviceName || 'Professional Services'}</td>
                <td style={{textAlign: 'center'}}>1</td>
                <td style={{textAlign: 'right'}}>{formatCurrency(invoice.subtotal)}</td>
                <td style={{textAlign: 'right'}}>{formatCurrency(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td style={{textAlign: 'right'}}><strong>Subtotal:</strong></td>
                <td style={{textAlign: 'right'}}><strong>{formatCurrency(invoice.subtotal)}</strong></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td style={{textAlign: 'right'}}>Tax:</td>
                <td style={{textAlign: 'right'}}>{formatCurrency(invoice.taxAmount || '0.00')}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td style={{textAlign: 'right'}}>Discount:</td>
                <td style={{textAlign: 'right'}}>-{formatCurrency(invoice.discountAmount || '0.00')}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td style={{textAlign: 'right'}}><strong>Total:</strong></td>
                <td style={{textAlign: 'right'}}><strong>{formatCurrency(invoice.totalAmount)}</strong></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td style={{textAlign: 'right'}}>Amount Paid:</td>
                <td style={{textAlign: 'right'}}>{formatCurrency(invoice.amountPaid || '0.00')}</td>
              </tr>
              <tr className="amount-due">
                <td></td>
                <td></td>
                <td style={{textAlign: 'right'}}><strong>Amount Due:</strong></td>
                <td style={{textAlign: 'right'}}><strong>{formatCurrency(invoice.amountDue)}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Notes */}
          <div className="mb-6">
            <h3 className="font-bold mb-2">Notes:</h3>
            <p className="text-sm">{invoice.notes || `Invoice for task #${invoice.taskId}`}</p>
          </div>

          <hr className="border-blue-600 mb-6" />

          {/* Payment Information */}
          <div className="mb-6">
            <h3 className="font-bold text-blue-600 mb-3">Payment Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Bank Name:</strong></p>
                <p><strong>Account Title:</strong></p>
                <p><strong>Account Number:</strong></p>
                <p><strong>Routing Number:</strong></p>
                <p><strong>SWIFT Code:</strong></p>
                <p><strong>IBAN:</strong></p>
              </div>
              <div>
                <p>Meezan Bank</p>
                <p>Apex Financial Advisory</p>
                <p>787878747</p>
                <p>7878</p>
                <p>sedfsadf</p>
                <p>sdjaakfjfap7878798777</p>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="mb-6">
            <h3 className="font-bold mb-2">Payment Instructions:</h3>
            <p className="text-sm">Please reference these details to make the payment</p>
            <p className="text-sm text-center mt-4">This is the text description</p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-8">
            <p>© 2025 Apex Financial Advisory. All rights reserved.</p>
            <p>30 N Gould St, Ste R | Phone: +92 31 35661968 | Email: super@gmail.com</p>
            <p>Website: www.test.com</p>
          </div>

          <div className="text-center text-xs text-gray-400 mt-4">
            about:blank
          </div>
        </div>
      </div>
    </>
  );
}