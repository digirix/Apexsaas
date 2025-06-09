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

  // Remove auto-print for debugging - users can manually print with Ctrl+P
  // useEffect(() => {
  //   if (invoice && !isLoading && tenantSettings) {
  //     setTimeout(() => {
  //       window.print();
  //     }, 1000);
  //   }
  // }, [invoice, isLoading, tenantSettings]);

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
      {/* Print styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; font-size: 12px; }
          .no-print { display: none !important; }
          .print-container { 
            max-width: none !important; 
            margin: 0 !important; 
            padding: 40px !important;
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
          margin: 20px 0;
        }
        .invoice-table th,
        .invoice-table td {
          border: 1px solid #e2e8f0;
          padding: 12px;
          text-align: left;
        }
        .invoice-table th {
          background-color: #f8fafc;
          font-weight: 600;
        }
        .text-right {
          text-align: right;
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
          
          {debugMode && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">Invoice Data:</h4>
                <div className="bg-white p-2 rounded border text-xs">
                  <p><strong>ID:</strong> {invoice?.id}</p>
                  <p><strong>Number:</strong> {invoice?.invoiceNumber}</p>
                  <p><strong>Client:</strong> {invoice?.clientName}</p>
                  <p><strong>Entity:</strong> {invoice?.entityName}</p>
                  <p><strong>Service:</strong> {invoice?.serviceName}</p>
                  <p><strong>Amount:</strong> {invoice?.totalAmount}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">Firm Settings:</h4>
                <div className="bg-white p-2 rounded border text-xs">
                  <p><strong>Firm Name:</strong> {getSetting('firm_name') || 'Not Set'}</p>
                  <p><strong>Tagline:</strong> {getSetting('tagline') || 'Not Set'}</p>
                  <p><strong>Address:</strong> {getSetting('address') || 'Not Set'}</p>
                  <p><strong>Phone:</strong> {getSetting('phone') || 'Not Set'}</p>
                  <p><strong>Email:</strong> {getSetting('email') || 'Not Set'}</p>
                  <p><strong>Bank Name:</strong> {getSetting('bank_name') || 'Not Set'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{firmName}</h1>
            <p className="text-lg text-slate-600 mb-4">{firmTagline}</p>
            <div className="text-sm text-slate-600 space-y-1">
              {firmAddress && <p>{firmAddress}</p>}
              {firmPhone && <p>Phone: {firmPhone}</p>}
              {firmEmail && <p>Email: {firmEmail}</p>}
              {firmWebsite && <p>Website: {firmWebsite}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">INVOICE</h2>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong>Invoice #:</strong> {currentInvoice?.invoiceNumber || 'Loading...'}</p>
              <p><strong>Date:</strong> {currentInvoice?.issueDate ? format(new Date(currentInvoice.issueDate), 'MMMM dd, yyyy') : 'Loading...'}</p>
              <p><strong>Due Date:</strong> {currentInvoice?.dueDate ? format(new Date(currentInvoice.dueDate), 'MMMM dd, yyyy') : 'Loading...'}</p>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Bill To:</h3>
          <div className="text-slate-700">
            <p className="font-medium">{client?.displayName || 'Client Name'}</p>
            <p>{entity?.name || 'Entity Name'}</p>
            {entity?.address && <p>{entity.address}</p>}
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="mb-8">
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Description</th>
                <th style={{ width: '15%' }} className="text-center">Quantity</th>
                <th style={{ width: '15%' }} className="text-right">Rate</th>
                <th style={{ width: '20%' }} className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="font-medium">{task?.taskType || 'Professional Services'}</div>
                  {task?.taskDetails && (
                    <div className="text-sm text-slate-600 mt-1">{task.taskDetails}</div>
                  )}
                </td>
                <td className="text-center">1</td>
                <td className="text-right">{formatCurrency(currentInvoice?.subtotal || 0)}</td>
                <td className="text-right font-medium">{formatCurrency(currentInvoice?.subtotal || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b">
                <h4 className="font-semibold text-slate-900">Invoice Summary</h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(currentInvoice?.subtotal || 0)}</span>
                </div>
                {parseFloat(currentInvoice?.taxAmount || '0') > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax ({currentInvoice?.taxPercent || 0}%):</span>
                    <span className="font-medium">{formatCurrency(currentInvoice?.taxAmount || 0)}</span>
                  </div>
                )}
                {parseFloat(currentInvoice?.discountAmount || '0') > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Discount:</span>
                    <span className="font-medium">-{formatCurrency(currentInvoice?.discountAmount || 0)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900">Total Amount:</span>
                    <span className="font-bold text-lg">{formatCurrency(currentInvoice?.totalAmount || 0)}</span>
                  </div>
                </div>
                {parseFloat(currentInvoice?.amountPaid || '0') > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Amount Paid:</span>
                    <span className="font-medium">{formatCurrency(currentInvoice?.amountPaid || 0)}</span>
                  </div>
                )}
                {parseFloat(currentInvoice?.amountDue || '0') > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-red-700">Amount Due:</span>
                      <span className="font-bold text-red-700">{formatCurrency(currentInvoice?.amountDue || 0)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {(bankName || accountTitle || accountNumber) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Payment Information</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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

        {/* Notes and Terms */}
        <div className="space-y-6 mb-8">
          {currentInvoice?.notes && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Notes:</h4>
              <p className="text-slate-700 text-sm">{currentInvoice.notes}</p>
            </div>
          )}
          
          {currentInvoice?.termsAndConditions && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Terms and Conditions:</h4>
              <p className="text-slate-700 text-sm">{currentInvoice.termsAndConditions}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-6 mt-8">
          <div className="text-center text-sm text-slate-500">
            <p className="mb-2">Thank you for your business!</p>
            <p>
              {firmName} | Invoice #{invoice.invoiceNumber} | Generated on {format(new Date(), 'MMMM dd, yyyy')}
            </p>
            <div className="text-center text-xs text-gray-400 mt-4">
              about:blank
            </div>
          </div>
        </div>
      </div>
    </>
  );
}