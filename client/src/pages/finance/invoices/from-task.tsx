import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Header } from "@/components/ui/header";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, ChevronDown, Loader2, Plus, Trash } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Line item type for the invoice
type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountRate: number;
  totalAmount?: number;
};

// Create invoice schema
const createInvoiceSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  entityId: z.number().min(1, "Entity is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  status: z.enum(["draft", "sent", "partially_paid", "paid", "overdue", "canceled", "void"]),
  issueDate: z.date(),
  dueDate: z.date(),
  currencyCode: z.string().min(1, "Currency is required"),
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string(),
  discountAmount: z.string(),
  totalAmount: z.string().min(1, "Total amount is required"),
  amountPaid: z.string(),
  amountDue: z.string().min(1, "Amount due is required"),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  isDeleted: z.boolean().default(false),
  taskId: z.number().optional(),
});

type InvoiceFormValues = z.infer<typeof createInvoiceSchema>;

const CreateInvoiceFromTaskPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discountRate: 0 }
  ]);
  
  // Get taskId from URL
  const searchParams = new URLSearchParams(window.location.search);
  const taskId = searchParams.get("taskId") ? parseInt(searchParams.get("taskId")!) : null;
  
  // Fetch task details if taskId is provided
  const { data: task, isLoading: isLoadingTask } = useQuery({
    queryKey: ["/api/v1/tasks", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const response = await fetch(`/api/v1/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch task details");
      }
      return response.json();
    },
    enabled: !!taskId,
  });
  
  // Fetch clients for the dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/v1/clients"],
  });
  
  // Default form values from task
  const defaultValues: Partial<InvoiceFormValues> = {
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
  };
  
  // Form state for invoice
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues,
  });
  
  // Fetch entities when a client is selected
  const selectedClientId = form.watch("clientId");
  const { data: entities, isLoading: entitiesLoading } = useQuery({
    queryKey: ["/api/v1/clients", selectedClientId, "entities"],
    enabled: !!selectedClientId,
  });
  
  // Fetch currencies
  const { data: currencies, isLoading: currenciesLoading } = useQuery({
    queryKey: ["/api/v1/setup/currencies"],
  });
  
  // Update form with task data when task is loaded
  useEffect(() => {
    if (task && !task.isAdmin) {
      // Set client and entity from task
      form.setValue("clientId", task.clientId);
      form.setValue("entityId", task.entityId);
      form.setValue("taskId", task.id);
      
      // Set currency from task if available
      if (task.currency) {
        form.setValue("currencyCode", task.currency);
      }
      
      // Create line item from task service
      if (task.serviceTypeId && task.serviceRate) {
        const serviceLineItem: LineItem = {
          description: task.serviceType?.name || "Service",
          quantity: 1,
          unitPrice: task.serviceRate,
          taxRate: 0,
          discountRate: 0
        };
        setLineItems([serviceLineItem]);
        updateTotals([serviceLineItem]);
      }
    }
  }, [task, form]);
  
  // Calculate totals based on line items
  const updateTotals = (items: LineItem[]) => {
    const calculatedItems = items.map(item => {
      const totalBeforeDiscounts = item.quantity * item.unitPrice;
      const discountAmount = totalBeforeDiscounts * (item.discountRate / 100);
      const subtotalAfterDiscount = totalBeforeDiscounts - discountAmount;
      const taxAmount = subtotalAfterDiscount * (item.taxRate / 100);
      const totalAmount = subtotalAfterDiscount + taxAmount;
      
      return {
        ...item,
        totalAmount
      };
    });
    
    const subtotal = calculatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = calculatedItems.reduce((sum, item) => {
      const totalBeforeDiscounts = item.quantity * item.unitPrice;
      const discountAmount = totalBeforeDiscounts * (item.discountRate / 100);
      const subtotalAfterDiscount = totalBeforeDiscounts - discountAmount;
      return sum + (subtotalAfterDiscount * (item.taxRate / 100));
    }, 0);
    const discountAmount = calculatedItems.reduce((sum, item) => {
      const totalBeforeDiscounts = item.quantity * item.unitPrice;
      return sum + (totalBeforeDiscounts * (item.discountRate / 100));
    }, 0);
    const totalAmount = subtotal + taxAmount - discountAmount;
    
    form.setValue("subtotal", subtotal.toFixed(2));
    form.setValue("taxAmount", taxAmount.toFixed(2));
    form.setValue("discountAmount", discountAmount.toFixed(2));
    form.setValue("totalAmount", totalAmount.toFixed(2));
    form.setValue("amountDue", totalAmount.toFixed(2));
    
    // Update line items with calculated totals
    setLineItems(calculatedItems);
  };
  
  // Handle line item changes
  const handleLineItemChange = (index: number, field: keyof LineItem, value: number | string) => {
    const updatedLineItems = [...lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: typeof value === 'string' && field !== 'description' ? parseFloat(value) || 0 : value
    };
    setLineItems(updatedLineItems);
    updateTotals(updatedLineItems);
  };
  
  // Add a new line item
  const addLineItem = () => {
    const newLineItems = [...lineItems, { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discountRate: 0 }];
    setLineItems(newLineItems);
    updateTotals(newLineItems);
  };
  
  // Remove a line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      const updatedLineItems = lineItems.filter((_, i) => i !== index);
      setLineItems(updatedLineItems);
      updateTotals(updatedLineItems);
    }
  };
  
  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/v1/finance/invoices", {
        ...data,
        lineItems: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          taxRate: item.taxRate.toString(),
          discountRate: item.discountRate.toString(),
          totalAmount: (item.totalAmount || 0).toString()
        }))
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices"] });
      navigate("/finance");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Submit handler
  const onSubmit = (data: InvoiceFormValues) => {
    createInvoiceMutation.mutate(data);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: form.watch("currencyCode") || 'USD',
    }).format(amount);
  };
  
  return (
    <AppLayout title="Create Invoice from Task">
      <div className="container py-6">
        <Header 
          title="Create Invoice from Task" 
          subtitle="Generate an invoice based on a completed revenue task" 
        />
        
        {isLoadingTask ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !task ? (
          <Card className="mt-4">
            <CardContent className="py-8 text-center">
              <p className="text-slate-500 mb-4">No task selected or task not found.</p>
              <Button onClick={() => navigate("/finance")}>Go Back</Button>
            </CardContent>
          </Card>
        ) : task.isAdmin ? (
          <Card className="mt-4">
            <CardContent className="py-8 text-center">
              <p className="text-slate-500 mb-4">Cannot create invoice from administrative task.</p>
              <Button onClick={() => navigate("/finance")}>Go Back</Button>
            </CardContent>
          </Card>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoice Details</CardTitle>
                      <CardDescription>
                        Create an invoice from task: <Badge variant="outline">{task.taskDetails}</Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Client selection */}
                        <FormField
                          control={form.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client</FormLabel>
                              <Select
                                disabled={true} // Disabled because it comes from task
                                value={field.value?.toString()}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                                <SelectContent>
                                  {clientsLoading ? (
                                    <div className="text-center py-2">Loading...</div>
                                  ) : clients?.map((client: any) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                      {client.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Entity selection */}
                        <FormField
                          control={form.control}
                          name="entityId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entity</FormLabel>
                              <Select
                                disabled={true} // Disabled because it comes from task
                                value={field.value?.toString()}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select entity" />
                                </SelectTrigger>
                                <SelectContent>
                                  {entitiesLoading ? (
                                    <div className="text-center py-2">Loading...</div>
                                  ) : entities?.map((entity: any) => (
                                    <SelectItem key={entity.id} value={entity.id.toString()}>
                                      {entity.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Invoice Number */}
                        <FormField
                          control={form.control}
                          name="invoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Number</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Currency */}
                        <FormField
                          control={form.control}
                          name="currencyCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currenciesLoading ? (
                                    <div className="text-center py-2">Loading...</div>
                                  ) : currencies?.map((currency: any) => (
                                    <SelectItem key={currency.id} value={currency.code}>
                                      {currency.code} - {currency.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Issue Date */}
                        <FormField
                          control={form.control}
                          name="issueDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Issue Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Due Date */}
                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Due Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Separator />
                      
                      {/* Line Items */}
                      <div>
                        <h3 className="text-base font-medium mb-4">Line Items</h3>
                        <ScrollArea className="h-auto max-h-[500px]">
                          <div className="space-y-3">
                            {lineItems.map((item, index) => (
                              <div 
                                key={index} 
                                className="grid grid-cols-12 gap-3 p-3 border rounded-md bg-slate-50"
                              >
                                <div className="col-span-12 md:col-span-4">
                                  <FormLabel className="text-xs">Description</FormLabel>
                                  <Input
                                    value={item.description}
                                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                    placeholder="Service description"
                                    className="mt-1"
                                  />
                                </div>
                                <div className="col-span-4 md:col-span-1">
                                  <FormLabel className="text-xs">Qty</FormLabel>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                                    min="1"
                                    className="mt-1"
                                  />
                                </div>
                                <div className="col-span-8 md:col-span-2">
                                  <FormLabel className="text-xs">Unit Price</FormLabel>
                                  <Input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="mt-1"
                                  />
                                </div>
                                <div className="col-span-4 md:col-span-1">
                                  <FormLabel className="text-xs">Tax %</FormLabel>
                                  <Input
                                    type="number"
                                    value={item.taxRate}
                                    onChange={(e) => handleLineItemChange(index, 'taxRate', e.target.value)}
                                    min="0"
                                    max="100"
                                    className="mt-1"
                                  />
                                </div>
                                <div className="col-span-4 md:col-span-1">
                                  <FormLabel className="text-xs">Disc %</FormLabel>
                                  <Input
                                    type="number"
                                    value={item.discountRate}
                                    onChange={(e) => handleLineItemChange(index, 'discountRate', e.target.value)}
                                    min="0"
                                    max="100"
                                    className="mt-1"
                                  />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                  <FormLabel className="text-xs">Total</FormLabel>
                                  <div className="h-10 mt-1 flex items-center px-3 border rounded-md bg-slate-100">
                                    {formatCurrency(item.totalAmount || 0)}
                                  </div>
                                </div>
                                <div className="col-span-12 md:col-span-1 flex items-end justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeLineItem(index)}
                                    disabled={lineItems.length === 1}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addLineItem}
                          className="mt-3"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Line Item
                        </Button>
                      </div>
                      
                      <Separator />
                      
                      {/* Notes and Terms */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Any notes for the client"
                                  rows={4}
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
                              <FormLabel>Terms and Conditions</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Terms and conditions for the invoice"
                                  rows={4}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Summary panel */}
                <div>
                  <Card className="sticky top-6">
                    <CardHeader>
                      <CardTitle>Invoice Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {/* Status selection */}
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="sent">Sent</SelectItem>
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
                        
                        <div className="mt-6 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Subtotal</span>
                            <span>{formatCurrency(parseFloat(form.watch("subtotal") || "0"))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Tax</span>
                            <span>{formatCurrency(parseFloat(form.watch("taxAmount") || "0"))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Discount</span>
                            <span>-{formatCurrency(parseFloat(form.watch("discountAmount") || "0"))}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>{formatCurrency(parseFloat(form.watch("totalAmount") || "0"))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Amount Paid</span>
                            <span>{formatCurrency(parseFloat(form.watch("amountPaid") || "0"))}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-bold">
                            <span>Balance Due</span>
                            <span>{formatCurrency(parseFloat(form.watch("amountDue") || "0"))}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/finance")}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createInvoiceMutation.isPending}
                      >
                        {createInvoiceMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : "Create Invoice"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </form>
          </Form>
        )}
      </div>
    </AppLayout>
  );
};

export default CreateInvoiceFromTaskPage;