import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/app-layout";
import { enhancedInvoiceSchema } from "@shared/finance-schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/ui/header";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash } from "lucide-react";

// Create a custom schema that extends the original one
const createInvoiceSchema = enhancedInvoiceSchema.extend({
  // Add client validation rules
  clientId: z.number({
    required_error: "Client is required",
    invalid_type_error: "Please select a client",
  }),
  entityId: z.number({
    required_error: "Entity is required",
    invalid_type_error: "Please select an entity",
  }),
  dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]).refine(date => {
    return date > new Date();
  }, {
    message: "Due date must be in the future",
  }),
});

type InvoiceFormValues = z.infer<typeof createInvoiceSchema>;

// Custom line item schema for the form
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  taxRate: z.number().min(0, "Tax rate must be positive").max(100, "Tax rate cannot exceed 100%").default(0),
  discountRate: z.number().min(0, "Discount rate must be positive").max(100, "Discount rate cannot exceed 100%").default(0),
});

// Define type for line items in the form
type LineItem = z.infer<typeof lineItemSchema>;

export default function CreateInvoicePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discountRate: 0 }
  ]);
  
  // Fetch clients for the dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/v1/clients"],
  });
  
  // Form state for invoice
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      status: "draft",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      currencyCode: "USD",
      subtotal: "0",
      taxAmount: "0",
      discountAmount: "0",
      totalAmount: "0",
      amountPaid: "0",
      amountDue: "0",
      notes: "",
      termsAndConditions: "Terms and conditions apply. Payment due by the date specified.",
      isDeleted: false,
    },
  });
  
  // Fetch entities when a client is selected
  const selectedClientId = form.watch("clientId");
  const { data: entities, isLoading: entitiesLoading } = useQuery({
    queryKey: ["/api/v1/clients", selectedClientId, "entities"],
    enabled: !!selectedClientId,
  });
  
  // Calculate totals based on line items
  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    
    lineItems.forEach(item => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineDiscount = lineSubtotal * (item.discountRate / 100);
      const lineTax = (lineSubtotal - lineDiscount) * (item.taxRate / 100);
      
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      discountAmount += lineDiscount;
    });
    
    const totalAmount = subtotal + taxAmount - discountAmount;
    
    form.setValue("subtotal", subtotal.toString());
    form.setValue("taxAmount", taxAmount.toString());
    form.setValue("discountAmount", discountAmount.toString());
    form.setValue("totalAmount", totalAmount.toString());
    form.setValue("amountDue", totalAmount.toString());
  };
  
  // Add a new line item
  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discountRate: 0 }]);
  };
  
  // Remove a line item
  const removeLineItem = (index: number) => {
    const updatedItems = [...lineItems];
    updatedItems.splice(index, 1);
    setLineItems(updatedItems);
  };
  
  // Update a line item
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setLineItems(updatedItems);
    calculateTotals();
  };
  
  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      // Add tenant ID and created by
      const invoiceData = {
        ...data,
        createdBy: user?.id || 1,
      };
      
      // Create the invoice
      const invoice = await apiRequest<any>("/api/v1/finance/invoices", {
        method: "POST",
        body: JSON.stringify(invoiceData),
      });
      
      // Create line items
      const lineItemPromises = lineItems.map(item => {
        const lineTotal = item.quantity * item.unitPrice;
        const discountAmount = lineTotal * (item.discountRate / 100);
        const taxAmount = (lineTotal - discountAmount) * (item.taxRate / 100);
        
        return apiRequest("/api/v1/finance/invoice-line-items", {
          method: "POST",
          body: JSON.stringify({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            taxRate: item.taxRate.toString(),
            taxAmount: taxAmount.toString(),
            discountRate: item.discountRate.toString(),
            discountAmount: discountAmount.toString(),
            lineTotal: (lineTotal - discountAmount + taxAmount).toString(),
          }),
        });
      });
      
      await Promise.all(lineItemPromises);
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      navigate("/finance");
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: InvoiceFormValues) => {
    // Check if we have at least one line item with valid data
    if (lineItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }
    
    // Check if all line items have a description
    const invalidItems = lineItems.some(item => !item.description.trim());
    if (invalidItems) {
      toast({
        title: "Error",
        description: "All line items must have a description",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the form
    createInvoiceMutation.mutate(data);
  };
  
  return (
    <AppLayout>
      <div className="container py-6">
        <Header title="Create Invoice" subtitle="Create a new invoice for a client" />
        
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input placeholder="INV-2023-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientsLoading ? (
                            <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                          ) : clients && clients.length > 0 ? (
                            clients.map((client: any) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.displayName}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No clients found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="entityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                        disabled={!selectedClientId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedClientId ? "Select entity" : "Select a client first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entitiesLoading ? (
                            <SelectItem value="loading" disabled>Loading entities...</SelectItem>
                          ) : entities && entities.length > 0 ? (
                            entities.map((entity: any) => (
                              <SelectItem key={entity.id} value={entity.id.toString()}>
                                {entity.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No entities found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
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
                
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
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
                
                <FormField
                  control={form.control}
                  name="currencyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Line Items</span>
                <Button 
                  type="button" 
                  onClick={addLineItem} 
                  variant="outline" 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                    <div className="col-span-12 md:col-span-4">
                      <FormLabel className="text-xs">Description</FormLabel>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        placeholder="Service description"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-1">
                      <FormLabel className="text-xs">Qty</FormLabel>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-8 md:col-span-2">
                      <FormLabel className="text-xs">Unit Price</FormLabel>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-1">
                      <FormLabel className="text-xs">Tax %</FormLabel>
                      <Input
                        type="number"
                        value={item.taxRate}
                        onChange={(e) => updateLineItem(index, "taxRate", parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-1">
                      <FormLabel className="text-xs">Discount %</FormLabel>
                      <Input
                        type="number"
                        value={item.discountRate}
                        onChange={(e) => updateLineItem(index, "discountRate", parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <FormLabel className="text-xs">Amount</FormLabel>
                      <div className="p-2 bg-slate-50 rounded text-right border h-10">
                        {((item.quantity * item.unitPrice) * (1 - item.discountRate/100) * (1 + item.taxRate/100)).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Subtotal:</span>
                  <span className="text-sm">{form.getValues("subtotal") || "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Tax:</span>
                  <span className="text-sm">{form.getValues("taxAmount") || "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Discount:</span>
                  <span className="text-sm">{form.getValues("discountAmount") || "0.00"}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">{form.getValues("totalAmount") || "0.00"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional notes or information for the client"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="termsAndConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Terms and conditions for this invoice"
                        className="min-h-[100px]"
                        {...field}
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
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    // Save as draft logic
                    form.setValue("status", "draft");
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
    </AppLayout>
  );
}