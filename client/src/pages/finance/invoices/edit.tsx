import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
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
import { CalendarIcon, Plus, Trash, Loader2 } from "lucide-react";

// Create a custom schema that extends the original one
const editInvoiceSchema = enhancedInvoiceSchema.extend({
  // Add client validation rules
  clientId: z.number({
    required_error: "Client is required",
    invalid_type_error: "Please select a client",
  }),
  entityId: z.number({
    required_error: "Entity is required",
    invalid_type_error: "Please select an entity",
  }),
  dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
});

type InvoiceFormValues = z.infer<typeof editInvoiceSchema>;

// Custom line item schema for the form
const lineItemSchema = z.object({
  id: z.number().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  taxRate: z.number().min(0, "Tax rate must be positive").max(100, "Tax rate cannot exceed 100%").default(0),
  discountRate: z.number().min(0, "Discount rate must be positive").max(100, "Discount rate cannot exceed 100%").default(0),
});

// Define type for line items in the form
type LineItem = z.infer<typeof lineItemSchema>;

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch invoice details
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["/api/v1/finance/invoices", id],
    enabled: !!id,
  });
  
  // Fetch line items for the invoice
  const { data: fetchedLineItems, isLoading: lineItemsLoading } = useQuery({
    queryKey: ["/api/v1/finance/invoices", id, "line-items"],
    enabled: !!id,
  });
  
  // Fetch clients for the dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/v1/clients"],
  });
  
  // Form state for invoice
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(editInvoiceSchema),
    defaultValues: {
      invoiceNumber: "",
      status: "draft",
      issueDate: new Date(),
      dueDate: new Date(),
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
  
  // Initialize form with invoice data when loaded
  useEffect(() => {
    if (invoice && !invoiceLoading) {
      // Format dates properly
      const formattedIssueDate = new Date(invoice.issueDate);
      const formattedDueDate = new Date(invoice.dueDate);
      
      form.reset({
        ...invoice,
        issueDate: formattedIssueDate,
        dueDate: formattedDueDate,
      });
      
      setIsLoading(false);
    }
  }, [invoice, invoiceLoading, form]);
  
  // Initialize line items when loaded
  useEffect(() => {
    if (fetchedLineItems && !lineItemsLoading) {
      const formattedLineItems = fetchedLineItems.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: parseFloat(item.taxRate),
        discountRate: parseFloat(item.discountRate),
      }));
      
      setLineItems(formattedLineItems);
      calculateTotals(formattedLineItems);
      setIsLoading(false);
    }
  }, [fetchedLineItems, lineItemsLoading]);
  
  // Calculate totals based on line items
  const calculateTotals = (items: LineItem[] = lineItems) => {
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    
    items.forEach(item => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineDiscount = lineSubtotal * (item.discountRate / 100);
      const lineTax = (lineSubtotal - lineDiscount) * (item.taxRate / 100);
      
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      discountAmount += lineDiscount;
    });
    
    const totalAmount = subtotal + taxAmount - discountAmount;
    const amountPaid = form.getValues("amountPaid") || "0";
    const amountDue = (totalAmount - parseFloat(amountPaid)).toString();
    
    form.setValue("subtotal", subtotal.toString());
    form.setValue("taxAmount", taxAmount.toString());
    form.setValue("discountAmount", discountAmount.toString());
    form.setValue("totalAmount", totalAmount.toString());
    form.setValue("amountDue", amountDue);
  };
  
  // Add a new line item
  const addLineItem = () => {
    const newItems = [...lineItems, { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discountRate: 0 }];
    setLineItems(newItems);
    calculateTotals(newItems);
  };
  
  // Remove a line item
  const removeLineItem = (index: number) => {
    const updatedItems = [...lineItems];
    updatedItems.splice(index, 1);
    setLineItems(updatedItems);
    calculateTotals(updatedItems);
  };
  
  // Update a line item
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setLineItems(updatedItems);
    calculateTotals(updatedItems);
  };
  
  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      try {
        // Add tenant ID and updated by
        const invoiceData = {
          ...data,
          updatedBy: user?.id || null,
        };
        
        // Update the invoice
        const response = await apiRequest("PUT", `/api/v1/finance/invoices/${id}`, invoiceData);
        const updatedInvoice = await response.json();
        
        // Handle line items - create, update or delete as needed
        if (fetchedLineItems && fetchedLineItems.length > 0) {
          // Get existing line item IDs
          const existingIds = fetchedLineItems.map((item: any) => item.id);
          
          // Get current line item IDs
          const currentIds = lineItems
            .filter(item => item.id)
            .map(item => item.id);
          
          // Find IDs to delete (in existing but not in current)
          const idsToDelete = existingIds.filter((id: number) => 
            !currentIds.includes(id)
          );
          
          // Delete removed line items
          for (const idToDelete of idsToDelete) {
            await apiRequest("DELETE", `/api/v1/finance/invoice-line-items/${idToDelete}`, null);
          }
        }
        
        // Update or create line items
        for (const item of lineItems) {
          const lineTotal = item.quantity * item.unitPrice;
          const discountAmount = lineTotal * (item.discountRate / 100);
          const taxAmount = (lineTotal - discountAmount) * (item.taxRate / 100);
          
          const lineItemData = {
            invoiceId: parseInt(id),
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            taxRate: item.taxRate.toString(),
            taxAmount: taxAmount.toString(),
            discountRate: item.discountRate.toString(),
            discountAmount: discountAmount.toString(),
            lineTotal: (lineTotal - discountAmount + taxAmount).toString(),
          };
          
          if (item.id) {
            // Update existing line item
            await apiRequest("PUT", `/api/v1/finance/invoice-line-items/${item.id}`, lineItemData);
          } else {
            // Create new line item
            await apiRequest("POST", "/api/v1/finance/invoice-line-items", lineItemData);
          }
        }
        
        return updatedInvoice;
      } catch (error) {
        console.error("Error in invoice update:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices", id, "line-items"] });
      
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      navigate("/finance");
    },
    onError: (error) => {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice. Please try again.",
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
    updateInvoiceMutation.mutate(data);
  };
  
  if (isLoading || invoiceLoading || lineItemsLoading) {
    return (
      <AppLayout>
        <div className="container py-6 flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Loading invoice data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="container py-6">
        <Header 
          title="Edit Invoice" 
          description="Update invoice details and line items" 
          backHref="/finance"
        />
        
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
                          <SelectItem value="passed">Passed</SelectItem>
                          <SelectItem value="partially_paid">Partially Paid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                          <SelectItem value="void">Void</SelectItem>
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
                        value={field.value?.toString()}
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
                        value={field.value?.toString()}
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
                              {field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value) : undefined}
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
                              {field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value) : undefined}
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
                        value={field.value}
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
                          <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
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
              <CardTitle>Invoice Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md">
                  <div className="col-span-12 md:col-span-5">
                    <FormLabel className="text-xs">Description</FormLabel>
                    <Input 
                      value={item.description}
                      onChange={(e) => updateLineItem(index, "description", e.target.value)}
                      placeholder="Service description"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <FormLabel className="text-xs">Qty</FormLabel>
                    <Input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <FormLabel className="text-xs">Unit Price</FormLabel>
                    <Input 
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <FormLabel className="text-xs">Tax %</FormLabel>
                    <Input 
                      type="number"
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(index, "taxRate", parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <FormLabel className="text-xs">Discount %</FormLabel>
                    <Input 
                      type="number"
                      value={item.discountRate}
                      onChange={(e) => updateLineItem(index, "discountRate", parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-1">
                    <Button 
                      type="button"
                      variant="ghost" 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length <= 1}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="col-span-11 md:col-span-1 text-right">
                    <FormLabel className="text-xs">Total</FormLabel>
                    <div className="h-10 flex items-center justify-end p-2 border rounded-md bg-slate-50">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.getValues("currencyCode") || "USD" })
                        .format(item.quantity * item.unitPrice * (1 - item.discountRate / 100) * (1 + item.taxRate / 100))}
                    </div>
                  </div>
                </div>
              ))}
              
              <Button type="button" variant="outline" onClick={addLineItem} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Line Item
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Invoice Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter any notes for the client here..."
                            className="min-h-[150px]"
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
                      <FormItem className="mt-4">
                        <FormLabel>Terms and Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter terms and conditions here..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <div className="border rounded-md p-4 space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.getValues("currencyCode") || "USD" })
                          .format(parseFloat(form.getValues("subtotal") || "0"))}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Tax Amount:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.getValues("currencyCode") || "USD" })
                          .format(parseFloat(form.getValues("taxAmount") || "0"))}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Discount Amount:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.getValues("currencyCode") || "USD" })
                          .format(parseFloat(form.getValues("discountAmount") || "0"))}
                      </span>
                    </div>
                    
                    <div className="border-t pt-4 flex justify-between font-medium">
                      <span>Total:</span>
                      <span>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.getValues("currencyCode") || "USD" })
                          .format(parseFloat(form.getValues("totalAmount") || "0"))}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Amount Paid:</span>
                      <FormField
                        control={form.control}
                        name="amountPaid"
                        render={({ field }) => (
                          <FormItem className="flex-1 ml-4 mb-0">
                            <FormControl>
                              <Input 
                                type="number"
                                {...field}
                                min="0"
                                step="0.01"
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  const totalAmount = parseFloat(form.getValues("totalAmount") || "0");
                                  const amountPaid = parseFloat(e.target.value) || 0;
                                  form.setValue("amountDue", (totalAmount - amountPaid).toString());
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="border-t pt-4 flex justify-between font-bold text-lg">
                      <span>Amount Due:</span>
                      <span>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.getValues("currencyCode") || "USD" })
                          .format(parseFloat(form.getValues("amountDue") || "0"))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t p-6">
              <div className="flex justify-between w-full">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate("/finance")}
                >
                  Cancel
                </Button>
                <div className="space-x-2">
                  <Button 
                    type="submit"
                    disabled={updateInvoiceMutation.isPending}
                  >
                    {updateInvoiceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Invoice
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </form>
        </Form>
      </div>
    </AppLayout>
  );
}