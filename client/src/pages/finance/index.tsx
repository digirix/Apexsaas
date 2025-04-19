import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Receipt, CreditCard, Wallet, DollarSign, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/ui/header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

// Define invoice status color mapping
const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  sent: "bg-blue-200 text-blue-800",
  partially_paid: "bg-amber-200 text-amber-800",
  paid: "bg-green-200 text-green-800",
  overdue: "bg-red-200 text-red-800",
  canceled: "bg-purple-200 text-purple-800",
  void: "bg-slate-200 text-slate-800"
};

type Invoice = {
  id: number;
  invoiceNumber: string;
  clientId: number;
  entityId: number;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "canceled" | "void";
  totalAmount: string;
  amountDue: string;
  clientName?: string;
  entityName?: string;
};

type Payment = {
  id: number;
  invoiceId: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  invoiceNumber?: string;
  clientName?: string;
};

// Helper component for invoice list item
const InvoiceItem = ({ invoice }: { invoice: Invoice }) => {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <Link to={`/finance/invoices/${invoice.id}`} className="font-medium hover:underline">
          {invoice.invoiceNumber}
        </Link>
        <div className="text-sm text-gray-500">
          {invoice.clientName || "Client"} - Due: {new Date(invoice.dueDate).toLocaleDateString()}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={statusColors[invoice.status] || "bg-gray-200"}>
          {invoice.status.replace("_", " ")}
        </Badge>
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(parseFloat(invoice.totalAmount))}</div>
          {invoice.status !== "paid" && (
            <div className="text-sm text-gray-500">Due: {formatCurrency(parseFloat(invoice.amountDue))}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for payment list item
const PaymentItem = ({ payment }: { payment: Payment }) => {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <div className="font-medium">{payment.reference}</div>
        <div className="text-sm text-gray-500">
          {payment.clientName || "Client"} - {payment.invoiceNumber && `Invoice: ${payment.invoiceNumber}`}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className="bg-blue-100 text-blue-800">
          {payment.paymentMethod.replace("_", " ")}
        </Badge>
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(parseFloat(payment.amount))}</div>
          <div className="text-sm text-gray-500">{new Date(payment.paymentDate).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState("invoices");

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/v1/finance/invoices"],
    enabled: activeTab === "invoices",
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/v1/finance/payments"],
    enabled: activeTab === "payments",
  });

  // Calculate totals
  const invoicesTotal = !invoicesLoading && invoices ? 
    invoices.reduce((sum: number, invoice: Invoice) => sum + parseFloat(invoice.totalAmount), 0) : 0;

  const paymentsTotal = !paymentsLoading && payments ?
    payments.reduce((sum: number, payment: Payment) => sum + parseFloat(payment.amount), 0) : 0;

  const dueTotal = !invoicesLoading && invoices ?
    invoices.reduce((sum: number, invoice: Invoice) => {
      if (invoice.status !== "paid" && invoice.status !== "canceled" && invoice.status !== "void") {
        return sum + parseFloat(invoice.amountDue);
      }
      return sum;
    }, 0) : 0;

  return (
    <div className="container py-6">
      <Header title="Finance" subtitle="Manage invoices, payments, and financial records" />

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <Receipt className="h-6 w-6 text-gray-400" />
              <div className="text-2xl font-bold">{formatCurrency(invoicesTotal)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <CreditCard className="h-6 w-6 text-gray-400" />
              <div className="text-2xl font-bold">{formatCurrency(paymentsTotal)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <Wallet className="h-6 w-6 text-gray-400" />
              <div className="text-2xl font-bold">{formatCurrency(dueTotal)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mt-6"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          </TabsList>
          <div className="flex space-x-2">
            {activeTab === "invoices" && (
              <Button asChild size="sm">
                <Link to="/finance/invoices/create">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Link>
              </Button>
            )}
            {activeTab === "payments" && (
              <Button asChild size="sm">
                <Link to="/finance/payments/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Link>
              </Button>
            )}
            {activeTab === "chart-of-accounts" && (
              <Button asChild size="sm">
                <Link to="/finance/accounts/create">
                  <Plus className="h-4 w-4 mr-2" />
                  New Account
                </Link>
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                View and manage all your invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-3 w-[180px]" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-[70px] rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-[80px]" />
                          <Skeleton className="h-3 w-[60px] mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="divide-y">
                  {invoices.map((invoice: Invoice) => (
                    <InvoiceItem key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="font-medium text-lg">No invoices found</h3>
                  <p className="text-sm text-gray-500 mt-1">Get started by creating a new invoice</p>
                  <Button asChild className="mt-4">
                    <Link to="/finance/invoices/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>
                View and manage all your payment records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-3 w-[180px]" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-[70px] rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-[80px]" />
                          <Skeleton className="h-3 w-[60px] mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="divide-y">
                  {payments.map((payment: Payment) => (
                    <PaymentItem key={payment.id} payment={payment} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <DollarSign className="h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="font-medium text-lg">No payments found</h3>
                  <p className="text-sm text-gray-500 mt-1">Record a payment to get started</p>
                  <Button asChild className="mt-4">
                    <Link to="/finance/payments/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Record Payment
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart-of-accounts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                Manage your financial accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for chart of accounts table */}
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="font-medium text-lg">Coming Soon</h3>
                <p className="text-sm text-gray-500 mt-1">Chart of Accounts functionality will be implemented in the next phase</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}