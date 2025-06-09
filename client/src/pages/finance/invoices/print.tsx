import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Eye } from "lucide-react";

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [debugMode, setDebugMode] = useState(false);

  // Fetch invoice data with client and task information
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: [`/api/v1/finance/invoices/${id}`],
    enabled: !!id,
  });

  // Fetch tenant settings for firm branding
  const { data: tenantSettings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ["/api/v1/tenant/settings"],
    enabled: !!id,
  });

  // Fetch client data if invoice has clientId
  const { data: client } = useQuery({
    queryKey: [`/api/v1/clients/${invoice?.clientId}`],
    enabled: !!invoice?.clientId,
  });

  // Fetch entity data if invoice has entityId
  const { data: entity } = useQuery({
    queryKey: [`/api/v1/entities/${invoice?.entityId}`],
    enabled: !!invoice?.entityId,
  });

  // Fetch task data if invoice has taskId
  const { data: task } = useQuery({
    queryKey: [`/api/v1/tasks/${invoice?.taskId}`],
    enabled: !!invoice?.taskId,
  });

  // Debug logging
  useEffect(() => {
    console.log('Print page debug:', {
      id,
      invoice,
      isLoading,
      error,
      tenantSettings,
      settingsLoading,
      settingsError
    });
  }, [id, invoice, isLoading, error, tenantSettings, settingsLoading, settingsError]);

  // Helper function to get tenant setting
  const getSetting = (key: string) => {
    if (!tenantSettings || !Array.isArray(tenantSettings)) return '';
    const setting = tenantSettings.find((s: any) => s.key === key);
    return setting?.value || '';
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return 'PKR 0.00';
    const currencyCode = currentInvoice?.currencyCode || 'PKR';
    return `${currencyCode} ${num.toFixed(2)}`;
  };

  // Loading state
  if (isLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading invoice...</p>
          <div className="mt-4 text-xs text-slate-500">
            <p>Invoice: {isLoading ? 'Loading...' : 'Loaded'}</p>
            <p>Settings: {settingsLoading ? 'Loading...' : 'Loaded'}</p>
            <p>Invoice ID: {id}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show content even if there are some errors, just with debug info
  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="no-print bg-red-50 border border-red-200 p-4 mb-6 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">Debug: Invoice Loading Failed</h3>
            <p className="text-red-600">Invoice ID: {id}</p>
            <p className="text-red-600 text-sm">Error: {error ? String(error) : 'Invoice not found'}</p>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Use actual invoice data or show loading message
  const currentInvoice = invoice || null;
  
  // Get firm branding from settings with professional defaults
  const firmName = getSetting('firm_name') || getSetting('company_name') || 'Apex Financial Advisory';
  const firmTagline = getSetting('tagline') || getSetting('firm_tagline') || 'Your Personal Accountant';
  const firmAddress = getSetting('address') || getSetting('firm_address') || '123 Business Street, Karachi, Pakistan';
  const firmPhone = getSetting('phone') || getSetting('firm_phone') || '+92 (21) 123-4567';
  const firmEmail = getSetting('email') || getSetting('firm_email') || 'info@apexfinancial.com';
  const firmWebsite = getSetting('website') || getSetting('firm_website') || 'www.apexfinancial.com';
  
  // Bank payment details from settings
  const bankName = getSetting('bank_name') || 'Standard Chartered Bank';
  const accountTitle = getSetting('account_title') || getSetting('bank_account_title') || 'Apex Financial Advisory';
  const accountNumber = getSetting('account_number') || getSetting('bank_account_number') || '0123456789';
  const routingNumber = getSetting('routing_number') || getSetting('bank_routing_number') || 'SCBLPKKA';
  const swiftCode = getSetting('swift_code') || getSetting('bank_swift_code') || 'SCBLPKKA';

  return (
    <>
      {/* Optimized Print Styles for Single Page */}
      <style jsx>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            font-size: 10px !important;
            line-height: 1.2 !important;
            font-family: 'Segoe UI', Arial, sans-serif !important;
          }
          .no-print { display: none !important; }
          .print-container { 
            max-width: none !important; 
            margin: 0 !important; 
            padding: 12px !important;
            page-break-inside: avoid !important;
          }
          .compact-mb { margin-bottom: 8px !important; }
          .compact-mb-sm { margin-bottom: 4px !important; }
          .compact-mb-xs { margin-bottom: 2px !important; }
          .compact-text-lg { font-size: 12px !important; font-weight: bold !important; }
          .compact-text-xl { font-size: 14px !important; font-weight: bold !important; }
          .compact-text-2xl { font-size: 16px !important; font-weight: bold !important; }
          .compact-text-sm { font-size: 8px !important; }
          .compact-text-xs { font-size: 7px !important; }
          .compact-space-y > * + * { margin-top: 1px !important; }
          .compact-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .compact-p { padding: 4px !important; }
          .compact-px { padding-left: 4px !important; padding-right: 4px !important; }
          .compact-py { padding-top: 2px !important; padding-bottom: 2px !important; }
          @page {
            margin: 0.4in !important;
            size: A4 !important;
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
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        .invoice-table th,
        .invoice-table td {
          border: 1px solid #e2e8f0;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        .invoice-table th {
          background-color: #f8fafc;
          font-weight: 600;
          font-size: 11px;
        }
        .text-right {
          text-align: right;
        }
        @media print {
          .invoice-table {
            margin: 6px 0 !important;
            font-size: 9px !important;
          }
          .invoice-table th,
          .invoice-table td {
            padding: 3px 4px !important;
            border: 1px solid #333 !important;
            font-size: 9px !important;
          }
          .invoice-table th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      <div className="print-container bg-white">
        {/* Debug Panel - Only visible on screen */}
        <div className="no-print bg-yellow-50 border border-yellow-200 p-4 mb-6 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-yellow-800">Invoice Print Debug Panel</h3>
            <div className="space-x-2">
              <Button 
                onClick={() => window.print()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice
              </Button>
              <Button 
                onClick={() => setDebugMode(!debugMode)}
                variant="outline"
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                {debugMode ? 'Hide' : 'Show'} Data
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-yellow-700">
            <div>
              <p>Invoice ID: {id}</p>
              <p>Invoice Number: {currentInvoice?.invoiceNumber || 'Not found'}</p>
              <p>Client: {client?.displayName || 'Loading...'}</p>
              <p>Entity: {entity?.name || 'Loading...'}</p>
            </div>
            <div>
              <p>Firm: {firmName}</p>
              <p>Bank: {bankName}</p>
              <p>Settings: {tenantSettings ? `${tenantSettings.length} loaded` : 'Loading...'}</p>
              <p>Task: {task?.taskType || 'None'}</p>
            </div>
          </div>
          {debugMode && (
            <div className="mt-4 text-xs bg-yellow-100 p-3 rounded">
              <p><strong>Raw Data:</strong></p>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify({ invoice: currentInvoice, client, entity, task }, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Invoice Header - Compact */}
        <div className="compact-grid compact-mb">
          {/* Firm Information */}
          <div>
            <h1 className="compact-text-2xl text-slate-900 compact-mb-xs">{firmName}</h1>
            <p className="compact-text-sm text-slate-600 compact-mb-sm">{firmTagline}</p>
            <div className="compact-text-xs text-slate-700 compact-space-y">
              <p>{firmAddress}</p>
              <p>Phone: {firmPhone}</p>
              <p>Email: {firmEmail}</p>
              <p>Website: {firmWebsite}</p>
            </div>
          </div>
          
          {/* Invoice Details */}
          <div className="text-right">
            <h2 className="compact-text-xl text-slate-900 compact-mb-xs">INVOICE</h2>
            <div className="compact-text-xs text-slate-700 compact-space-y">
              <p><span className="font-medium">Invoice #:</span> {currentInvoice?.invoiceNumber || 'INV-001'}</p>
              <p><span className="font-medium">Date:</span> {currentInvoice?.issueDate ? format(new Date(currentInvoice.issueDate), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</p>
              <p><span className="font-medium">Due Date:</span> {currentInvoice?.dueDate ? format(new Date(currentInvoice.dueDate), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</p>
              <p><span className="font-medium">Status:</span> <span className="capitalize">{currentInvoice?.status || 'draft'}</span></p>
            </div>
          </div>
        </div>

        {/* Client Information - Compact */}
        <div className="compact-mb">
          <h3 className="compact-text-lg text-slate-900 compact-mb-xs">Bill To:</h3>
          <div className="text-slate-700 compact-text-sm">
            <p className="font-medium">{client?.displayName || 'Client Name'}</p>
            <p>{entity?.name || 'Entity Name'}</p>
            {entity?.address && <p>{entity.address}</p>}
          </div>
        </div>

        {/* Invoice Items Table - Compact */}
        <div className="compact-mb">
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Description</th>
                <th style={{ width: '15%' }} className="text-center">Qty</th>
                <th style={{ width: '15%' }} className="text-right">Rate</th>
                <th style={{ width: '20%' }} className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="font-medium">{task?.taskType || 'Professional Services'}</div>
                  {task?.taskDetails && (
                    <div className="compact-text-xs text-slate-600 mt-1">{task.taskDetails}</div>
                  )}
                </td>
                <td className="text-center">1</td>
                <td className="text-right">{formatCurrency(currentInvoice?.subtotal || 0)}</td>
                <td className="text-right font-medium">{formatCurrency(currentInvoice?.subtotal || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Section - Compact */}
        <div className="flex justify-end compact-mb">
          <div style={{ width: '280px' }}>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 compact-px compact-py border-b">
                <h4 className="font-semibold text-slate-900 compact-text-sm">Invoice Summary</h4>
              </div>
              <div className="compact-p compact-space-y">
                <div className="flex justify-between compact-text-xs">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(currentInvoice?.subtotal || 0)}</span>
                </div>
                {parseFloat(currentInvoice?.taxAmount || '0') > 0 && (
                  <div className="flex justify-between compact-text-xs">
                    <span className="text-slate-600">Tax ({currentInvoice?.taxPercent || 0}%):</span>
                    <span className="font-medium">{formatCurrency(currentInvoice?.taxAmount || 0)}</span>
                  </div>
                )}
                {parseFloat(currentInvoice?.discountAmount || '0') > 0 && (
                  <div className="flex justify-between compact-text-xs">
                    <span className="text-slate-600">Discount:</span>
                    <span className="font-medium">-{formatCurrency(currentInvoice?.discountAmount || 0)}</span>
                  </div>
                )}
                <div className="border-t pt-1">
                  <div className="flex justify-between compact-text-sm">
                    <span className="font-semibold text-slate-900">Total Amount:</span>
                    <span className="font-bold">{formatCurrency(currentInvoice?.totalAmount || 0)}</span>
                  </div>
                </div>
                {parseFloat(currentInvoice?.amountPaid || '0') > 0 && (
                  <div className="flex justify-between compact-text-xs">
                    <span className="text-slate-600">Amount Paid:</span>
                    <span className="font-medium">{formatCurrency(currentInvoice?.amountPaid || 0)}</span>
                  </div>
                )}
                {parseFloat(currentInvoice?.amountDue || '0') > 0 && (
                  <div className="border-t pt-1">
                    <div className="flex justify-between compact-text-xs">
                      <span className="font-semibold text-red-700">Amount Due:</span>
                      <span className="font-bold text-red-700">{formatCurrency(currentInvoice?.amountDue || 0)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information - Compact */}
        {(bankName || accountTitle || accountNumber) && (
          <div className="compact-mb">
            <h3 className="compact-text-lg font-semibold text-slate-900 compact-mb-xs">Payment Information</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg compact-p">
              <div className="grid grid-cols-2 gap-2 compact-text-xs">
                {bankName && (
                  <div>
                    <span className="font-medium text-slate-600">Bank Name:</span>
                    <p className="text-slate-900">{bankName}</p>
                  </div>
                )}
                {accountTitle && (
                  <div>
                    <span className="font-medium text-slate-600">Account Title:</span>
                    <p className="text-slate-900">{accountTitle}</p>
                  </div>
                )}
                {accountNumber && (
                  <div>
                    <span className="font-medium text-slate-600">Account Number:</span>
                    <p className="text-slate-900">{accountNumber}</p>
                  </div>
                )}
                {routingNumber && (
                  <div>
                    <span className="font-medium text-slate-600">Routing Number:</span>
                    <p className="text-slate-900">{routingNumber}</p>
                  </div>
                )}
                {swiftCode && (
                  <div>
                    <span className="font-medium text-slate-600">SWIFT Code:</span>
                    <p className="text-slate-900">{swiftCode}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes and Terms - Compact */}
        <div className="compact-space-y compact-mb">
          {currentInvoice?.notes && (
            <div>
              <h4 className="font-semibold text-slate-900 compact-mb-xs compact-text-sm">Notes:</h4>
              <p className="text-slate-700 compact-text-xs">{currentInvoice.notes}</p>
            </div>
          )}
          
          {currentInvoice?.termsAndConditions && (
            <div>
              <h4 className="font-semibold text-slate-900 compact-mb-xs compact-text-sm">Terms and Conditions:</h4>
              <p className="text-slate-700 compact-text-xs">{currentInvoice.termsAndConditions}</p>
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="border-t pt-2 mt-4">
          <div className="text-center compact-text-xs text-slate-500">
            <p>Thank you for your business!</p>
            <p>Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>
      </div>
    </>
  );
}