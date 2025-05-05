import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import JournalEntriesList from "@/components/finance/journal-entries-list";
import { InvoiceActions } from "@/components/finance/invoice-actions";
import { 
  DollarSign, 
  FileText, 
  CreditCard, 
  BookOpen, 
  BarChart4, 
  Plus, 
  ReceiptText,
  ArrowUpDown,
  Calendar,
  User,
  Clock,
  Receipt,
  BookText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function FinancePage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Parse URL query parameters to get the tab value
  const getTabFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    
    // If tab parameter is 'journalEntries', return 'journal-entries' for proper tab selection
    if (tabParam === 'journalEntries') {
      return 'journal-entries';
    }
    
    // Default to invoices if no tab param or invalid value
    return 'invoices';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromUrl());
  const [invoiceTab, setInvoiceTab] = useState("active");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [activeCurrentPage, setActiveCurrentPage] = useState(1);
  const [paidCurrentPage, setPaidCurrentPage] = useState(1);
  const [canceledCurrentPage, setCanceledCurrentPage] = useState(1);
  const [allCurrentPage, setAllCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Reset pagination when tab changes
  useEffect(() => {
    setActiveCurrentPage(1);
    setPaidCurrentPage(1);
    setCanceledCurrentPage(1);
    setAllCurrentPage(1);
  }, [invoiceTab]);
  
  // Update the URL when activeTab changes
  useEffect(() => {
    if (activeTab === 'journal-entries') {
      const newUrl = '/finance?tab=journalEntries';
      // Only update if URL is different to avoid unnecessary history entries
      if (location !== newUrl) {
        window.history.replaceState(null, '', newUrl);
      }
    } else {
      // Remove tab parameter if on invoices tab (default)
      if (window.location.search.includes('tab=')) {
        window.history.replaceState(null, '', '/finance');
      }
    }
  }, [activeTab, location]);
  
  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/v1/finance/invoices"],
  });
  
  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/v1/finance/payments"],
  });
  
  // Calculate financial metrics
  const financialMetrics = {
    totalInvoiced: !invoicesLoading ? (invoices as any[]).reduce((sum: number, invoice: any) => 
      sum + parseFloat(invoice.totalAmount || 0), 0) : 0,
    totalReceived: !paymentsLoading ? (payments as any[]).reduce((sum: number, payment: any) => 
      sum + parseFloat(payment.amount || 0), 0) : 0,
    totalOutstanding: !invoicesLoading ? (invoices as any[]).reduce((sum: number, invoice: any) => 
      sum + parseFloat(invoice.amountDue || 0), 0) : 0,
  };
  
  // Filter invoices by status
  const filterInvoices = (statuses: string[]) => {
    if (!invoices || !Array.isArray(invoices)) return [];
    return (invoices as any[]).filter((invoice: any) => statuses.includes(invoice.status));
  };
  
  // Render invoice table with filtered data
  const renderInvoiceTable = (filteredInvoices: any[], currentPageState: number, setCurrentPageState: React.Dispatch<React.SetStateAction<number>>) => {
    if (invoicesLoading) {
      return <div className="text-center py-4">Loading invoices...</div>;
    }
    
    if (!filteredInvoices || filteredInvoices.length === 0) {
      return (
        <div className="text-center py-8 border rounded-md bg-slate-50">
          <ReceiptText className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-lg font-medium">No Invoices</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No invoices match the selected filter.
          </p>
          <Button
            onClick={() => setLocation("/finance/invoices/create")}
            variant="outline"
            className="mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create an Invoice
          </Button>
        </div>
      );
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
    
    // Get current page's invoices
    const currentInvoices = filteredInvoices.slice(
      (currentPageState - 1) * ITEMS_PER_PAGE,
      currentPageState * ITEMS_PER_PAGE
    );
    
    return (
      <div>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-2 text-left font-medium">Invoice #</th>
                <th className="p-2 text-left font-medium">Client</th>
                <th className="p-2 text-left font-medium">Issue Date</th>
                <th className="p-2 text-left font-medium">Due Date</th>
                <th className="p-2 text-left font-medium">Amount</th>
                <th className="p-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentInvoices.map((invoice: any) => (
                <tr key={invoice.id} className="border-b hover:bg-slate-50">
                  <td className="p-2">
                    <a href="#" className="font-medium hover:underline">
                      {invoice.invoiceNumber}
                    </a>
                  </td>
                  <td className="p-2">{invoice.clientName || "Client"}</td>
                  <td className="p-2">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                  <td className="p-2">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td className="p-2">{formatCurrency(parseFloat(invoice.totalAmount))}</td>
                  <td className="p-2">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                        ${invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' : ''}
                        ${invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' : ''}
                        ${invoice.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : ''}
                        ${invoice.status === 'overdue' ? 'bg-red-100 text-red-800' : ''}
                        ${invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${invoice.status === 'canceled' || invoice.status === 'void' ? 'bg-gray-100 text-gray-800' : ''}
                      `}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                      <InvoiceActions invoice={invoice} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        {filteredInvoices.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(filteredInvoices.length, ((currentPageState - 1) * ITEMS_PER_PAGE) + 1)}-{Math.min(filteredInvoices.length, currentPageState * ITEMS_PER_PAGE)} of {filteredInvoices.length} invoices
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPageState(page => Math.max(1, page - 1))}
                disabled={currentPageState === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPageState(page => Math.min(totalPages, page + 1))}
                disabled={currentPageState === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <AppLayout title="Finance">
      <div className="container py-6">
        
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invoicesLoading ? "..." : formatCurrency(financialMetrics.totalInvoiced)}
              </div>
              <p className="text-xs text-muted-foreground">
                From all active invoices
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentsLoading ? "..." : formatCurrency(financialMetrics.totalReceived)}
              </div>
              <p className="text-xs text-muted-foreground">
                All payments received
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invoicesLoading ? "..." : formatCurrency(financialMetrics.totalOutstanding)}
              </div>
              <p className="text-xs text-muted-foreground">
                Unpaid invoice amounts
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/finance/reports")}
          >
            <BarChart4 className="h-4 w-4 mr-2" />
            Financial Reports
          </Button>
        </div>
        
        <div className="mt-6">
          <Tabs 
            defaultValue={getTabFromUrl()} 
            onValueChange={setActiveTab}
            value={activeTab}
          >
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="invoices" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="journal-entries" className="flex items-center">
                  <BookText className="h-4 w-4 mr-2" />
                  Journal Entries
                </TabsTrigger>
              </TabsList>
              
              {/* Removed "New Invoice" button as invoices are now created only from tasks */}
              


              
              {activeTab === "journal-entries" && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setLocation("/finance/journal-entries/create")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Journal Entry
                </Button>
              )}
            </div>
            
            <TabsContent value="invoices" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>
                    View and manage client invoices
                  </CardDescription>
                  <div className="pt-2">
                    <Tabs 
                      defaultValue="active" 
                      value={invoiceTab}
                      onValueChange={setInvoiceTab}
                    >
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="paid">Paid</TabsTrigger>
                        <TabsTrigger value="canceled">Canceled</TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="active" className="pt-4">
                        {renderInvoiceTable(filterInvoices(['draft', 'sent', 'approved', 'partially_paid', 'overdue']), activeCurrentPage, setActiveCurrentPage)}
                      </TabsContent>
                      
                      <TabsContent value="paid" className="pt-4">
                        {renderInvoiceTable(filterInvoices(['paid']), paidCurrentPage, setPaidCurrentPage)}
                      </TabsContent>
                      
                      <TabsContent value="canceled" className="pt-4">
                        {renderInvoiceTable(filterInvoices(['canceled', 'void']), canceledCurrentPage, setCanceledCurrentPage)}
                      </TabsContent>
                      
                      <TabsContent value="all" className="pt-4">
                        {renderInvoiceTable(invoices as any[], allCurrentPage, setAllCurrentPage)}
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardHeader>
              </Card>
            </TabsContent>
            


            
            <TabsContent value="journal-entries" className="mt-6">
              <JournalEntriesList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}