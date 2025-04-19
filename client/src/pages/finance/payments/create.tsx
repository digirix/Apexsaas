import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { enhancedPaymentSchema } from "@shared/finance-schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/ui/header";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";

// Create a custom schema
const createPaymentSchema = enhancedPaymentSchema.extend({
  invoiceId: z.number({
    required_error: "Invoice is required",
    invalid_type_error: "Please select an invoice",
  }),
  amount: z.union([
    z.string().min(1, "Amount is required"),
    z.number().min(0.01, "Amount must be greater than 0").transform(n => n.toString())
  ]),
  paymentMethod: z.enum([
    "credit_card", "bank_transfer", "direct_debit", 
    "cash", "check", "paypal", "stripe", "other"
  ], {
    required_error: "Payment method is required",
  }),
});

type PaymentFormValues = z.infer<typeof createPaymentSchema>;

export default function CreatePaymentPage() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // Fetch all unpaid invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/v1/finance/invoices"],
    select: (data) => data.filter((invoice: any) => 
      invoice.status !== "paid" && 
      invoice.status !== "void" && 
      invoice.status !== "canceled"
    ),
  });
  
  // Form state
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      amount: "",
      paymentMethod: "bank_transfer",
      referenceNumber: "",
      notes: "",
    },
  });
  
  // Handle invoice selection
  const onInvoiceSelect = (invoiceId: string) => {
    const id = parseInt(invoiceId);
    const invoice = invoices?.find((inv: any) => inv.id === id);
    
    if (invoice) {
      setSelectedInvoice(invoice);
      form.setValue("invoiceId", id);
      form.setValue("amount", invoice.amountDue);
    }
  };
  
  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      // Prepare payment data
      const paymentData = {
        ...data,
        tenantId: user?.tenantId || 1,
        createdBy: user?.id || 1,
      };
      
      // Create the payment - Make sure to await the Promise and return the parsed data
      const response = await apiRequest("POST", "/api/v1/finance/payments", paymentData);
      const responseData = await response.json();
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/payments"] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      navigate("/finance");
    },
    onError: (error) => {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: PaymentFormValues) => {
    createPaymentMutation.mutate(data);
  };
  
  return (
    <AppLayout>
      <div className="container py-6">
        <Header title="Record Payment" subtitle="Record a payment for an invoice" />
        
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="invoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice</FormLabel>
                    <Select
                      onValueChange={(value) => onInvoiceSelect(value)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select invoice" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {invoicesLoading ? (
                          <SelectItem value="loading" disabled>Loading invoices...</SelectItem>
                        ) : invoices && invoices.length > 0 ? (
                          invoices.map((invoice: any) => (
                            <SelectItem key={invoice.id} value={invoice.id.toString()}>
                              {invoice.invoiceNumber} - {invoice.clientName || "Client"} ({formatCurrency(parseFloat(invoice.amountDue))})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No invoices found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {selectedInvoice && (
                <div className="rounded-md border p-4 bg-slate-50">
                  <h3 className="font-medium mb-2">Invoice Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-slate-500">Invoice Number:</span>
                    <span>{selectedInvoice.invoiceNumber}</span>
                    
                    <span className="text-slate-500">Client:</span>
                    <span>{selectedInvoice.clientName || "Unknown"}</span>
                    
                    <span className="text-slate-500">Issue Date:</span>
                    <span>{new Date(selectedInvoice.issueDate).toLocaleDateString()}</span>
                    
                    <span className="text-slate-500">Due Date:</span>
                    <span>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                    
                    <span className="text-slate-500">Total Amount:</span>
                    <span>{formatCurrency(parseFloat(selectedInvoice.totalAmount))}</span>
                    
                    <span className="text-slate-500">Amount Due:</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(selectedInvoice.amountDue))}</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={new Date(field.value)}
                            onSelect={(date) => date && field.onChange(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="direct_debit">Direct Debit</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Transaction ID, check number, etc."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional reference for this payment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes about this payment"
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-between space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/finance")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPaymentMutation.isPending || !selectedInvoice}
              >
                {createPaymentMutation.isPending ? "Processing..." : "Record Payment"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  </AppLayout>
  );
}