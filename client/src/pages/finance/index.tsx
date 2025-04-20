import { useState } from "react";
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
  BookText
} from "lucide-react";

export default function FinancePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("invoices");
  
  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/v1/finance/invoices"],
  });
  
  // Fetch payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/v1/finance/payments"],
  });
  
  // Fetch chart of accounts
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/v1/finance/chart-of-accounts"],
  });
  
  // Calculate financial metrics
  const financialMetrics = {
    totalInvoiced: !invoicesLoading && invoices ? invoices.reduce((sum: number, invoice: any) => 
      sum + parseFloat(invoice.totalAmount || 0), 0) : 0,
    totalReceived: !paymentsLoading && payments ? payments.reduce((sum: number, payment: any) => 
      sum + parseFloat(payment.amount || 0), 0) : 0,
    totalOutstanding: !invoicesLoading && invoices ? invoices.reduce((sum: number, invoice: any) => 
      sum + parseFloat(invoice.amountDue || 0), 0) : 0,
  };
  
  // Filter invoices by status
  const filterInvoices = (statuses: string[]) => {
    if (!invoices) return [];
    return invoices.filter((invoice: any) => statuses.includes(invoice.status));
  };
  
  // Render invoice table with filtered data
  const renderInvoiceTable = (filteredInvoices: any[]) => {
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
    
    return (
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
            {filteredInvoices.map((invoice: any) => (
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
        
        <div className="mt-6">
          <Tabs 
            defaultValue="invoices" 
            onValueChange={setActiveTab}
            value={activeTab}
          >
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="invoices" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="chart-of-accounts" className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Chart of Accounts
                </TabsTrigger>
                <TabsTrigger value="journal-entries" className="flex items-center">
                  <BookText className="h-4 w-4 mr-2" />
                  Journal Entries
                </TabsTrigger>
              </TabsList>
              
              {activeTab === "invoices" && (
                <div className="flex space-x-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setLocation("/finance/invoices/create")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </Button>
                </div>
              )}
              

              
              {activeTab === "chart-of-accounts" && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setLocation("/finance/chart-of-accounts/create")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Account
                </Button>
              )}
              
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
                    <Tabs defaultValue="active">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="paid">Paid</TabsTrigger>
                        <TabsTrigger value="canceled">Canceled</TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="active" className="pt-4">
                        {renderInvoiceTable(filterInvoices(['draft', 'sent', 'approved', 'partially_paid', 'overdue']))}
                      </TabsContent>
                      
                      <TabsContent value="paid" className="pt-4">
                        {renderInvoiceTable(filterInvoices(['paid']))}
                      </TabsContent>
                      
                      <TabsContent value="canceled" className="pt-4">
                        {renderInvoiceTable(filterInvoices(['canceled', 'void']))}
                      </TabsContent>
                      
                      <TabsContent value="all" className="pt-4">
                        {renderInvoiceTable(invoices)}
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardHeader>
              </Card>
            </TabsContent>
            

            
            <TabsContent value="chart-of-accounts" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Chart of Accounts</CardTitle>
                  <CardDescription>
                    View and manage your financial account structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="text-center py-4">Loading accounts...</div>
                  ) : accounts && accounts.length > 0 ? (
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="p-2 text-left font-medium">Account Code</th>
                            <th className="p-2 text-left font-medium">Account Name</th>
                            <th className="p-2 text-left font-medium">Type</th>
                            <th className="p-2 text-left font-medium">Description</th>
                            <th className="p-2 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((account: any) => (
                            <tr key={account.id} className="border-b hover:bg-slate-50">
                              <td className="p-2 font-medium">{account.accountCode}</td>
                              <td className="p-2">{account.accountName}</td>
                              <td className="p-2">{account.accountType}</td>
                              <td className="p-2">{account.description || "-"}</td>
                              <td className="p-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                  ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                `}>
                                  {account.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-md bg-slate-50">
                      <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                      <h3 className="text-lg font-medium">No Chart of Accounts</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        You haven't set up your chart of accounts yet.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        disabled
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Set Up Chart of Accounts
                      </Button>
                    </div>
                  )}
                </CardContent>
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