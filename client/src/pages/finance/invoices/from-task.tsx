import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/app-layout";
import { enhancedInvoiceSchema } from "@shared/finance-schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/ui/header";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, ListChecks } from "lucide-react";

// Create a custom schema that extends the original one for invoice from task
const createInvoiceFromTaskSchema = enhancedInvoiceSchema.extend({
  taskId: z.number({
    required_error: "Task is required",
    invalid_type_error: "Please select a task",
  }),
  dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]).refine(date => {
    return date > new Date();
  }, {
    message: "Due date must be in the future",
  }),
});

type InvoiceFormValues = z.infer<typeof createInvoiceFromTaskSchema>;

export default function CreateInvoiceFromTaskPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // Fetch completed revenue tasks that haven't been invoiced
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/v1/tasks"],
    select: (data) => data.filter((task: any) => 
      // Get only revenue tasks
      !task.isAdminTask && 
      // Only completed tasks
      task.statusId === 3 && 
      // Only tasks that haven't been invoiced yet
      !task.invoiceId
    )
  });
  
  // Form state for invoice
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(createInvoiceFromTaskSchema),
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
  
  // When a task is selected, update form values
  const selectedTaskId = form.watch("taskId");
  
  useEffect(() => {
    if (selectedTaskId && tasks) {
      const task = tasks.find((t: any) => t.id === selectedTaskId);
      if (task) {
        setSelectedTask(task);
        
        // Get client and entity details
        form.setValue("clientId", task.clientId);
        form.setValue("entityId", task.entityId);
        
        // Set currency and rate from the task
        if (task.currencyCode) {
          form.setValue("currencyCode", task.currencyCode);
        }
        
        // For notes, use task details
        if (task.details) {
          form.setValue("notes", `Task: ${task.details}`);
        }
        
        // Calculate invoice amount based on task service rate
        const serviceRate = parseFloat(task.serviceRate || "0");
        form.setValue("subtotal", serviceRate.toString());
        form.setValue("totalAmount", serviceRate.toString());
        form.setValue("amountDue", serviceRate.toString());
      }
    }
  }, [selectedTaskId, tasks, form]);
  
  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      try {
        // Add tenant ID and created by
        const invoiceData = {
          ...data,
          createdBy: user?.id || 1,
        };
        
        // Create the invoice - await and parse each response
        const invoiceResponse = await apiRequest("POST", "/api/v1/finance/invoices", invoiceData);
        const invoice = await invoiceResponse.json();
        
        // Create invoice line item for the task
        const lineItemData = {
          invoiceId: invoice.id,
          description: `${selectedTask.serviceName || 'Service'} - ${selectedTask.details || 'Task'}`,
          quantity: "1",
          unitPrice: selectedTask.serviceRate || "0",
          taxRate: "0",
          taxAmount: "0",
          discountRate: "0",
          discountAmount: "0",
          lineTotal: selectedTask.serviceRate || "0",
        };
        
        const lineItemResponse = await apiRequest("POST", "/api/v1/finance/invoice-line-items", lineItemData);
        await lineItemResponse.json(); // Consume the promise
        
        // Update the task with invoice ID reference
        const taskUpdateResponse = await apiRequest("PATCH", `/api/v1/tasks/${selectedTask.id}`, {
          invoiceId: invoice.id
        });
        await taskUpdateResponse.json(); // Consume the promise
        
        return invoice;
      } catch (error) {
        console.error("Error in invoice creation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      toast({
        title: "Success",
        description: "Invoice created successfully from task",
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
    if (!selectedTask) {
      toast({
        title: "Error",
        description: "Please select a task",
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
        <Header 
          title="Create Invoice from Task" 
          subtitle="Generate an invoice based on a completed revenue task" 
        />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="taskId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Completed Task</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a completed task" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tasksLoading ? (
                            <SelectItem value="loading" disabled>Loading tasks...</SelectItem>
                          ) : tasks && tasks.length > 0 ? (
                            tasks.map((task: any) => (
                              <SelectItem key={task.id} value={task.id.toString()}>
                                {task.title || `Task #${task.id}`} - {task.clientName || 'Client'}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No completed tasks found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedTask && (
                  <div className="mt-4 p-4 border rounded-md bg-slate-50">
                    <h3 className="font-medium">Task Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <div>
                        <span className="text-sm font-medium">Client:</span>
                        <span className="text-sm ml-2">{selectedTask.clientName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Entity:</span>
                        <span className="text-sm ml-2">{selectedTask.entityName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Service:</span>
                        <span className="text-sm ml-2">{selectedTask.serviceName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Rate:</span>
                        <span className="text-sm ml-2">{selectedTask.currencyCode || 'USD'} {selectedTask.serviceRate || '0'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-medium">Details:</span>
                        <span className="text-sm ml-2">{selectedTask.details || 'No details available'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
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
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="subtotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtotal</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Amount</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} readOnly />
                        </FormControl>
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
                          placeholder="Additional notes or details about this invoice" 
                          className="min-h-32" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <div className="flex justify-end space-x-2">
              <Button type="submit" variant="default" disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create Invoice
                  </span>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/finance")}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}