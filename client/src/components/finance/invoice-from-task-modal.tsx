import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Task, 
  Client, 
  Entity,
  invoiceStatusEnum
} from "@shared/schema";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogHeader, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Share2, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

// Define the form schema
const invoiceFormSchema = z.object({
  clientId: z.coerce.number(),
  entityId: z.coerce.number(),
  invoiceNumber: z.string().min(3, "Invoice number must be at least 3 characters"),
  issueDate: z.string(),
  dueDate: z.string(),
  currencyCode: z.string().min(1, "Currency code is required"),
  status: z.enum(invoiceStatusEnum.enumValues),
  subtotal: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  totalAmount: z.string(),
  amountDue: z.string(),
  notes: z.string().optional().default(""),
  termsAndConditions: z.string().optional().default(""),
  serviceDescription: z.string().min(3, "Service description is required")
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFromTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export function InvoiceFromTaskModal({ isOpen, onClose, task }: InvoiceFromTaskModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: task?.clientId || 0,
      entityId: task?.entityId || 0,
      invoiceNumber: "",
      issueDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: task ? format(new Date(task.dueDate), "yyyy-MM-dd") : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      currencyCode: task?.currency || "USD",
      status: "draft",
      subtotal: task?.serviceRate?.toString() || "0.00",
      taxAmount: "0.00",
      discountAmount: "0.00",
      totalAmount: task?.serviceRate?.toString() || "0.00",
      amountDue: task?.serviceRate?.toString() || "0.00",
      notes: "",
      termsAndConditions: "",
      serviceDescription: task?.taskDetails || ""
    }
  });
  
  // Fetch clients
  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch("/api/v1/clients");
        const data = await response.json();
        setClients(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    }
    
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);
  
  // Fetch entities when client is selected
  useEffect(() => {
    async function fetchEntities() {
      if (!form.getValues("clientId")) return;
      
      try {
        const response = await fetch(`/api/v1/clients/${form.getValues("clientId")}/entities`);
        const data = await response.json();
        setEntities(data);
      } catch (error) {
        console.error("Error fetching entities:", error);
      }
    }
    
    fetchEntities();
  }, [form.watch("clientId")]);
  
  // Generate invoice number
  useEffect(() => {
    if (isOpen && task) {
      // Generate invoice number: INV-{YYYYMMDD}-{TaskID}
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const invoiceNumber = `INV-${year}${month}${day}-${task.id}`;
      
      form.setValue("invoiceNumber", invoiceNumber);
      
      // Set up default values from task
      if (task.clientId) form.setValue("clientId", task.clientId);
      if (task.entityId) form.setValue("entityId", task.entityId);
      if (task.serviceRate) {
        const rate = task.serviceRate.toString();
        form.setValue("subtotal", rate);
        form.setValue("totalAmount", rate);
        form.setValue("amountDue", rate);
      }
      if (task.taskDetails) {
        form.setValue("serviceDescription", task.taskDetails);
      }
    }
  }, [isOpen, task, form]);
  
  // Update total amount when subtotal, tax, or discount changes
  useEffect(() => {
    const calculateTotal = () => {
      const subtotal = parseFloat(form.getValues("subtotal") || "0");
      // Calculate tax as 10% of subtotal if not explicitly set
      const taxAmount = parseFloat(form.getValues("taxAmount") || "0");
      const tax = taxAmount > 0 ? taxAmount : subtotal * 0.1;
      form.setValue("taxAmount", tax.toFixed(2));
      const discount = parseFloat(form.getValues("discountAmount") || "0");
      
      const total = subtotal + tax - discount;
      const formattedTotal = total.toFixed(2);
      
      form.setValue("totalAmount", formattedTotal);
      form.setValue("amountDue", formattedTotal);
    };
    
    calculateTotal();
  }, [form.watch("subtotal"), form.watch("taxAmount"), form.watch("discountAmount")]);
  
  const onSubmit = async (data: InvoiceFormValues) => {
    if (!task) {
      toast({
        title: "Error",
        description: "Task information is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create invoice
      const invoiceData = {
        ...data,
        tenantId: task.tenantId,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        taskId: task.id
      };
      
      const response = await apiRequest("POST", "/api/v1/finance/invoices", invoiceData);
      const result = await response.json();
      
      if (response.ok) {
        setInvoice(result);
        
        // Update task with invoice ID
        await apiRequest("PUT", `/api/v1/tasks/${task.id}`, {
          invoiceId: result.id
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices"] });
        
        toast({
          title: "Invoice Created",
          description: "The invoice has been created successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create invoice. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setInvoice(null);
      onClose();
    }
  };
  
  const generatePdf = async () => {
    if (!invoice) return;
    
    setIsGeneratingPdf(true);
    
    try {
      // Direct fetch for blob response
      const response = await fetch(`/api/v1/finance/invoices/${invoice.id}/pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Generated",
        description: "The invoice PDF has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const generateShareLink = async () => {
    if (!invoice) return;
    
    setIsGeneratingShareLink(true);
    
    try {
      // Direct fetch for share link
      const response = await fetch(`/api/v1/finance/invoices/${invoice.id}/share-link`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }
      
      const result = await response.json();
      
      if (result.shareLink) {
        // Copy to clipboard
        navigator.clipboard.writeText(result.shareLink);
        
        toast({
          title: "Share Link Generated",
          description: "A shareable link has been copied to your clipboard.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate share link. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingShareLink(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {invoice ? "Invoice Created" : "Create Invoice from Task"}
          </DialogTitle>
        </DialogHeader>
        
        {invoice ? (
          <>
            <div className="space-y-4 py-4">
              <div className="bg-green-50 p-4 rounded-md border border-green-200 text-green-800">
                <div className="flex gap-2 items-center mb-2">
                  <FileText className="h-5 w-5" />
                  <h3 className="font-medium">Invoice #{invoice.invoiceNumber} Created</h3>
                </div>
                <p className="text-sm">
                  The invoice has been created successfully. You can now download it as a PDF or generate a shareable link.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium mb-1">Client</p>
                  <p className="text-sm text-slate-600">{clients.find(c => c.id === invoice.clientId)?.displayName || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Entity</p>
                  <p className="text-sm text-slate-600">{entities.find(e => e.id === invoice.entityId)?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Invoice Number</p>
                  <p className="text-sm text-slate-600">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Status</p>
                  <p className="text-sm text-slate-600">{invoice.status}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Issue Date</p>
                  <p className="text-sm text-slate-600">{format(new Date(invoice.issueDate), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Due Date</p>
                  <p className="text-sm text-slate-600">{format(new Date(invoice.dueDate), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Amount</p>
                  <p className="text-sm text-slate-600">{invoice.currencyCode} {parseFloat(invoice.totalAmount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Amount Due</p>
                  <p className="text-sm text-slate-600">{invoice.currencyCode} {parseFloat(invoice.amountDue).toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={generateShareLink}
                  disabled={isGeneratingShareLink}
                >
                  {isGeneratingShareLink ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="mr-2 h-4 w-4" />
                  )}
                  Generate Share Link
                </Button>
                <Button 
                  onClick={generatePdf}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
                {/* Client */}
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                        value={field.value.toString()}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
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
                
                {/* Entity */}
                <FormField
                  control={form.control}
                  name="entityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                        value={field.value.toString()}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entities.map((entity) => (
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
                        <Input {...field} disabled={isSubmitting} />
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
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Issue Date */}
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="passed">Passed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Subtotal */}
                <FormField
                  control={form.control}
                  name="subtotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtotal</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Tax Amount */}
                <FormField
                  control={form.control}
                  name="taxAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Discount Amount */}
                <FormField
                  control={form.control}
                  name="discountAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Total Amount (calculated automatically) */}
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={true} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Amount Due (initially same as total) */}
                <FormField
                  control={form.control}
                  name="amountDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Due</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={true} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Service Description */}
              <FormField
                control={form.control}
                name="serviceDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the service being invoiced"
                        className="h-24"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes for the client"
                        className="h-20"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Terms and Conditions */}
              <FormField
                control={form.control}
                name="termsAndConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms and Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter terms and conditions"
                        className="h-20"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Invoice"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}