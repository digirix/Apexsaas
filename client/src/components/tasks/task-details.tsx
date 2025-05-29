// Import necessary components and hooks
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, addYears, addQuarters } from "date-fns";
import { Receipt } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

// Import UI components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Import icons
import {
  Loader2,
  CalendarIcon,
  CheckCircle,
  Clock,
  FileText,
  Building,
  User,
  Tag,
  Banknote,
  Calendar as CalendarIcon2,
} from "lucide-react";

// Import utils and API client
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Import custom components
import { TaskStatusWorkflow } from "./task-status-workflow";

// Task form validation schemas
const adminTaskSchema = z.object({
  taskDetails: z.string().min(3, "Task details must be at least 3 characters"),
  assigneeId: z.string().min(1, "Please select an assignee"),
  statusId: z.string().min(1, "Please select a status"),
  dueDate: z.date({
    required_error: "Please select a due date",
  }),
  categoryId: z.string().min(1, "Please select a category"),
  taskType: z.string().min(1, "Please select a task type"),
  notes: z.string().optional(),
  complianceDeadline: z.date().optional(),
});

const revenueTaskSchema = z.object({
  taskDetails: z.string().min(3, "Task details must be at least 3 characters"),
  assigneeId: z.string().min(1, "Please select an assignee"),
  statusId: z.string().min(1, "Please select a status"),
  dueDate: z.date({
    required_error: "Please select a due date",
  }),
  categoryId: z.string().min(1, "Please select a category"),
  taskType: z.string().min(1, "Please select a task type"),
  notes: z.string().optional(),
  clientId: z.string().min(1, "Please select a client"),
  entityId: z.string().min(1, "Please select an entity"),
  serviceRate: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().min(0).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  currency: z.string().optional(),
  complianceFrequency: z.string().optional(),
  complianceYear: z.string()
    .optional()
    .superRefine((val, ctx) => {
        if (!val) return; // Allow empty values
        
        // Since we can't reliably access other form values in superRefine,
        // we'll just do basic validation here

        // First check if it's a single 4-digit year
        if (/^\d{4}$/.test(val)) {
          // Valid single year format
          return;
        }
        
        // Next, check if it's comma-separated years
        const years = val.split(",").map((y: string) => y.trim());
        const isValid = years.every((year: string) => /^\d{4}$/.test(year));
        
        if (!isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Years must be in 4-digit format (e.g., 2024)"
          });
          return;
        }
        
        // Valid format, but we can't check if the number matches the frequency
        // That will be handled in the UI with helpful messages
    }),
  complianceDuration: z.string().optional(),
  complianceStartDate: z.date().optional(),
  complianceEndDate: z.date().optional(),
  complianceDeadline: z.date().optional(),
  isRecurring: z.boolean().default(false),
  createUpdateInvoice: z.boolean().default(false), // Used to track if we should create/update invoice
});

interface TaskDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
  initialTab?: string;
  initialEditingState?: boolean;
}

type AdminTaskFormValues = z.infer<typeof adminTaskSchema>;
type RevenueTaskFormValues = z.infer<typeof revenueTaskSchema>;

export function TaskDetails({ isOpen, onClose, taskId, initialTab = "details", initialEditingState = false }: TaskDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(initialEditingState);
  const [activeTab, setActiveTab] = useState(initialTab);
  
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
    enabled: !!taskId && isOpen,
  });
  
  // Fetch available users for assignee selection
  const { data: users = [] } = useQuery({
    queryKey: ["/api/v1/users"],
    enabled: isOpen,
  });
  
  // Fetch task statuses
  const { data: taskStatuses = [] } = useQuery({
    queryKey: ["/api/v1/setup/task-statuses"],
    enabled: isOpen,
  });
  
  // Fetch task categories based on task type
  const { data: taskCategories = [] } = useQuery({
    queryKey: ["/api/v1/setup/task-categories", { isAdmin: task?.isAdmin }],
    enabled: isOpen && task !== undefined,
  });
  
  // Fetch clients for revenue tasks
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/v1/clients"],
    enabled: isOpen && task && !task.isAdmin,
  });
  
  // Fetch currencies from setup module
  const { data: currencies = [] } = useQuery({
    queryKey: ["/api/v1/setup/currencies"],
    enabled: isOpen && task && !task.isAdmin,
  });
  
  // Fetch entities for selected client
  const { data: entities = [] } = useQuery({
    queryKey: ["/api/v1/clients", task?.clientId, "entities"],
    queryFn: async () => {
      if (!task?.clientId) return [];
      const response = await fetch(`/api/v1/clients/${task.clientId}/entities`);
      if (!response.ok) {
        throw new Error("Failed to fetch client entities");
      }
      return response.json();
    },
    enabled: isOpen && task && !task.isAdmin && !!task.clientId,
  });
  
  // Initialize admin task form
  const adminTaskForm = useForm<AdminTaskFormValues>({
    resolver: zodResolver(adminTaskSchema),
    defaultValues: {
      taskDetails: "",
      assigneeId: "",
      statusId: "",
      dueDate: new Date(),
      categoryId: "",
      taskType: "Regular",
      notes: "",
    },
  });
  
  // Initialize revenue task form
  const revenueTaskForm = useForm<RevenueTaskFormValues>({
    resolver: zodResolver(revenueTaskSchema),
    defaultValues: {
      taskDetails: "",
      assigneeId: "",
      statusId: "",
      dueDate: new Date(),
      categoryId: "",
      taskType: "Regular",
      notes: "",
      clientId: "",
      entityId: "",
      serviceRate: 0,
      discountAmount: 0,
      taxPercent: 0,
      currency: "USD",
      complianceFrequency: undefined,
      complianceYear: "",
      complianceDuration: undefined,
      complianceStartDate: undefined,
      complianceEndDate: undefined,
      isRecurring: false,
      createUpdateInvoice: false,
    },
  });
  
  // Fetch invoice details if task has an invoice
  const { data: invoiceData } = useQuery({
    queryKey: ["/api/v1/finance/invoices", task?.invoiceId],
    queryFn: async () => {
      if (!task?.invoiceId) return null;
      const response = await fetch(`/api/v1/finance/invoices/${task.invoiceId}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    enabled: !!task?.invoiceId && isOpen,
  });

  // Update form values when task data is loaded
  useEffect(() => {
    if (task && isEditing) {
      console.log("Resetting form with task data:", {
        taskId: task.id,
        complianceDeadline: task.complianceDeadline,
        isAdmin: task.isAdmin,
        fullTaskData: task
      });
      
      if (task.isAdmin) {
        const formData = {
          taskDetails: task.taskDetails,
          assigneeId: task.assigneeId?.toString(),
          statusId: task.statusId?.toString(),
          dueDate: new Date(task.dueDate),
          categoryId: task.taskCategoryId?.toString(), // Map taskCategoryId from database to categoryId for form
          taskType: task.taskType,
          notes: task.notes || "",
          complianceDeadline: task.complianceDeadline ? new Date(task.complianceDeadline) : undefined,
        };
        console.log("Admin form data:", formData);
        adminTaskForm.reset(formData);
      } else {
        // Get discount and tax values from the invoice if available
        // Note: Tasks don't have discountAmount or taxPercent fields, only invoices do
        const discountAmount = invoiceData?.discountAmount ? parseFloat(invoiceData.discountAmount) : 0;
        const taxPercent = invoiceData?.taxPercent ? parseFloat(invoiceData.taxPercent) : 0;
        
        console.log("Invoice data for task:", { 
          taskId: task.id,
          invoiceId: task.invoiceId,
          // Show raw values from the API response
          rawInvoiceData: invoiceData,
          // Show the values being used
          discountAmount,
          taxPercent,
          taskCategory: task.taskCategoryId
        });
        
        const revenueFormData = {
          taskDetails: task.taskDetails,
          assigneeId: task.assigneeId?.toString(),
          statusId: task.statusId?.toString(),
          dueDate: new Date(task.dueDate),
          categoryId: task.taskCategoryId?.toString(), // Map taskCategoryId from database to categoryId for form
          taskType: task.taskType,
          notes: task.notes || "",
          clientId: task.clientId?.toString(),
          entityId: task.entityId?.toString(),
          serviceRate: task.serviceRate || 0,
          discountAmount: discountAmount,
          taxPercent: taxPercent,
          currency: task.currency || "USD",
          complianceFrequency: task.complianceFrequency,
          complianceYear: task.complianceYear || "",
          complianceDuration: task.complianceDuration,
          complianceStartDate: task.complianceStartDate ? new Date(task.complianceStartDate) : undefined,
          complianceEndDate: task.complianceEndDate ? new Date(task.complianceEndDate) : undefined,
          complianceDeadline: task.complianceDeadline ? new Date(task.complianceDeadline) : undefined,
          isRecurring: task.isRecurring || false,
          createUpdateInvoice: activeTab === "invoice", // Set to true if we're in the invoice tab
        };
        console.log("Revenue form data:", revenueFormData);
        revenueTaskForm.reset(revenueFormData);
      }
    }
  }, [task, invoiceData, isEditing, adminTaskForm, revenueTaskForm, activeTab]);
  
  // If the activeTab is "invoice" and isEditing is true, set createUpdateInvoice to true
  useEffect(() => {
    if (activeTab === "invoice" && isEditing && task && !task.isAdmin) {
      revenueTaskForm.setValue("createUpdateInvoice", true);
    }
  }, [activeTab, isEditing, task, revenueTaskForm]);
  
  // Watch for client ID changes in revenue task form to reset entity selection
  useEffect(() => {
    const subscription = revenueTaskForm.watch((value, { name }) => {
      if (name === "clientId") {
        revenueTaskForm.setValue("entityId", "");
      }
      
      // Calculate compliance end date based on frequency and start date
      if (name === "complianceFrequency" || name === "complianceStartDate") {
        const frequency = revenueTaskForm.getValues("complianceFrequency");
        const startDate = revenueTaskForm.getValues("complianceStartDate");
        
        if (frequency && startDate) {
          let endDate: Date;
          
          // Make a copy of the start date to avoid modifying the original
          const startDateCopy = new Date(startDate);
          const year = startDateCopy.getFullYear();
          const month = startDateCopy.getMonth();
          const day = startDateCopy.getDate();
          
          switch (frequency) {
            case "5 Years":
              // Last day of the 5th year
              endDate = new Date(year + 5, month, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case "4 Years":
              // Last day of the 4th year
              endDate = new Date(year + 4, month, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case "3 Years":
              // Last day of the 3rd year
              endDate = new Date(year + 3, month, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case "2 Years":
              // Last day of the 2nd year
              endDate = new Date(year + 2, month, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case "Annual":
              // Last day of the year
              endDate = new Date(year + 1, month, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case "Bi-Annually":
              // Last day of the 6th month
              endDate = new Date(year, month + 6, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case "Quarterly":
              // Last day of the quarter
              endDate = new Date(year, month + 3, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case "Monthly":
              // Last day of the month
              endDate = new Date(year, month + 1, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            default: // "One Time"
              // Same date but with end of day time
              endDate = new Date(startDateCopy);
              endDate.setHours(23, 59, 59, 999);
              break;
          }
          
          revenueTaskForm.setValue("complianceEndDate", endDate);
          
          // Set duration based on frequency
          revenueTaskForm.setValue("complianceDuration", frequency);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [revenueTaskForm]);
  
  // Update admin task mutation
  const updateAdminTaskMutation = useMutation({
    mutationFn: async (data: AdminTaskFormValues) => {
      if (!taskId) throw new Error("Task ID is required");
      
      // Ensure we map categoryId to taskCategoryId
      const payload = {
        taskDetails: data.taskDetails,
        assigneeId: parseInt(data.assigneeId),
        statusId: parseInt(data.statusId),
        dueDate: data.dueDate.toISOString(),
        taskCategoryId: parseInt(data.categoryId), // Convert categoryId to taskCategoryId for backend
        taskType: data.taskType,
        notes: data.notes || null,
        isAdmin: true,
        complianceDeadline: data.complianceDeadline?.toISOString(),
      };
      
      const response = await apiRequest("PUT", `/api/v1/tasks/${taskId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks", taskId] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });
  
  // Update revenue task mutation
  const updateRevenueTaskMutation = useMutation({
    mutationFn: async (data: RevenueTaskFormValues) => {
      if (!taskId) throw new Error("Task ID is required");
      
      // Ensure we map categoryId to taskCategoryId for revenue tasks
      const payload = {
        taskDetails: data.taskDetails,
        assigneeId: parseInt(data.assigneeId),
        statusId: parseInt(data.statusId),
        dueDate: data.dueDate.toISOString(),
        taskCategoryId: parseInt(data.categoryId), // Convert categoryId to taskCategoryId for backend
        taskType: data.taskType,
        notes: data.notes || null,
        isAdmin: false,
        clientId: parseInt(data.clientId),
        entityId: parseInt(data.entityId),
        serviceRate: data.serviceRate,
        currency: data.currency,
        complianceFrequency: data.complianceFrequency,
        complianceYear: data.complianceYear,
        complianceDuration: data.complianceDuration,
        complianceStartDate: data.complianceStartDate?.toISOString(),
        complianceEndDate: data.complianceEndDate?.toISOString(),
        complianceDeadline: data.complianceDeadline?.toISOString(),
        isRecurring: data.isRecurring,
      };
      
      const response = await apiRequest("PUT", `/api/v1/tasks/${taskId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks", taskId] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });
  
  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error("Task ID is required");
      
      // Find the "Completed" status (rank 3)
      const completedStatus = taskStatuses.find(s => s.rank === 3);
      if (!completedStatus) throw new Error("Completed status not found");
      
      const payload = {
        statusId: completedStatus.id
      };
      
      const response = await apiRequest("PUT", `/api/v1/tasks/${taskId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks", taskId] });
      toast({
        title: "Success",
        description: "Task marked as completed",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive",
      });
    },
  });
  
  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error("Task ID is required");
      
      await apiRequest("DELETE", `/api/v1/tasks/${taskId}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });
  
  // Handle admin task form submission
  function onAdminTaskSubmit(data: AdminTaskFormValues) {
    updateAdminTaskMutation.mutate(data);
  }
  
  // Create/update invoice mutation
  const createUpdateInvoiceMutation = useMutation({
    mutationFn: async (data: {
      taskId: number;
      clientId: number;
      entityId: number;
      serviceRate: number;
      discountAmount: number;
      taxPercent: number;
      currency: string;
    }) => {
      // Calculate subtotal, discount, tax, and total
      const subtotal = data.serviceRate;
      const discount = data.discountAmount;
      const taxAmount = ((subtotal - discount) * data.taxPercent) / 100;
      const total = subtotal - discount + taxAmount;
      
      console.log("Creating/updating invoice with data:", {
        ...data,
        subtotal,
        taxAmount,
        total
      });
      
      // Generate invoice number: INV-{YYYYMMDD}-{TaskID}
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const invoiceNumber = `INV-${year}${month}${day}-${data.taskId}`;
      
      // Set due date to 30 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      // Build the payload for creating/updating an invoice
      const payload = {
        taskId: data.taskId,
        clientId: data.clientId,
        entityId: data.entityId,
        invoiceNumber: invoiceNumber,
        issueDate: today.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        amount: data.serviceRate,
        currency: data.currency,
        currencyCode: data.currency,
        discountAmount: data.discountAmount,
        taxPercent: data.taxPercent,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: total.toString(),
        amountDue: total.toString(),
        amountPaid: "0.00",
        status: "draft", // Always set to draft for created/updated invoices
        notes: `Invoice for task #${data.taskId}`,
        termsAndConditions: "Standard terms and conditions apply."
      };
      
      // Check if invoice exists for this task
      let existingInvoice = null;
      
      // First check if we already know the invoice ID from the task
      if (task?.invoiceId) {
        try {
          const invoiceResponse = await fetch(`/api/v1/finance/invoices/${task.invoiceId}`);
          if (invoiceResponse.ok) {
            existingInvoice = await invoiceResponse.json();
          }
        } catch (err) {
          console.error("Error fetching invoice by ID:", err);
        }
      }
      
      // If not found by ID, try finding by task ID
      if (!existingInvoice) {
        try {
          const checkResponse = await fetch(`/api/v1/finance/invoices?taskId=${data.taskId}`);
          const existingInvoices = await checkResponse.json();
          if (existingInvoices.length > 0) {
            existingInvoice = existingInvoices[0];
          }
        } catch (err) {
          console.error("Error fetching invoice by task ID:", err);
        }
      }
      
      let response;
      if (existingInvoice) {
        console.log("Updating existing invoice:", existingInvoice.id);
        // Update existing invoice
        response = await apiRequest(
          "PUT", 
          `/api/v1/finance/invoices/${existingInvoice.id}`, 
          payload
        );
      } else {
        console.log("Creating new invoice for task:", data.taskId);
        // Create new invoice
        response = await apiRequest(
          "POST", 
          "/api/v1/finance/invoices", 
          payload
        );
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // If this is a new invoice (task has no invoiceId yet)
      if (task && !task.invoiceId && data.id) {
        console.log("Updating task with new invoice ID:", data.id);
        
        // Update the task with the invoice ID
        try {
          await apiRequest("PUT", `/api/v1/tasks/${taskId}`, {
            invoiceId: data.id
          });
        } catch (err) {
          console.error("Error updating task with invoice ID:", err);
        }
      }
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks", taskId] });
      
      // Invalidate finance module queries (both paths for compatibility)
      queryClient.invalidateQueries({ queryKey: ["/api/v1/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices"] });
      
      // Also invalidate specific invoice queries
      if (task?.invoiceId) {
        queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices", task.invoiceId] });
      }
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/invoices", data.id] });
      }
      
      // Invalidate finance module dashboard data and other potential invoice references
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/payments"] });
      
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      
      // Close the editing mode
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create/update invoice",
        variant: "destructive",
      });
    },
  });

  // Handle revenue task form submission
  function onRevenueTaskSubmit(data: RevenueTaskFormValues) {
    // First update the task
    updateRevenueTaskMutation.mutate(data, {
      onSuccess: (updatedTask) => {
        // If createUpdateInvoice flag is set, create/update the invoice
        if (data.createUpdateInvoice) {
          createUpdateInvoiceMutation.mutate({
            taskId: updatedTask.id,
            clientId: parseInt(data.clientId),
            entityId: parseInt(data.entityId),
            serviceRate: data.serviceRate || 0,
            discountAmount: data.discountAmount || 0,
            taxPercent: data.taxPercent || 0,
            currency: data.currency || "USD"
          });
        } else {
          // Ensure we close editing mode even if we don't create an invoice
          setIsEditing(false);
        }
      }
    });
  }
  
  // Get current task status
  const taskStatus = task?.statusId ? taskStatuses.find(s => s.id === task.statusId) : null;
  
  // Get assignee name
  const assignee = task?.assigneeId ? users.find(u => u.id === task.assigneeId) : null;
  
  // Get category name
  const category = task?.categoryId ? taskCategories.find(c => c.id === task.categoryId) : null;
  
  // Get client name
  const client = task?.clientId ? clients.find(c => c.id === task.clientId) : null;
  
  // Get entity name
  const entity = task?.entityId ? entities.find(e => e.id === task.entityId) : null;
  
  // Format dates
  const formattedDueDate = task?.dueDate ? format(new Date(task.dueDate), "PPP") : "";
  const formattedComplianceStartDate = task?.complianceStartDate ? format(new Date(task.complianceStartDate), "PPP") : "";
  const formattedComplianceEndDate = task?.complianceEndDate ? format(new Date(task.complianceEndDate), "PPP") : "";
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose();
          setIsEditing(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              View and manage task information
            </DialogDescription>
          </DialogHeader>
        
        {isLoadingTask ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !task ? (
          <div className="py-4 text-center text-slate-500">
            No task found or the task has been deleted.
          </div>
        ) : (
          <>
            {!isEditing ? (
              <>
                <div className="flex flex-col gap-6">
                  {/* Basic task information */}
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{task.taskDetails}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant={task.isAdmin ? "outline" : "default"}>
                        {task.isAdmin ? "Administrative Task" : "Revenue Task"}
                      </Badge>
                      
                      {/* Replace static status badge with interactive TaskStatusWorkflow */}
                      {task.statusId && (
                        <TaskStatusWorkflow 
                          taskId={task.id} 
                          currentStatusId={task.statusId} 
                          variant="icon"
                        />
                      )}
                      
                      <Badge variant="outline">{task.taskType}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <User className="h-5 w-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-500">Assignee</p>
                          <p>{assignee?.displayName || "Unassigned"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <CalendarIcon2 className="h-5 w-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-500">Due Date</p>
                          <p>{formattedDueDate}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Tag className="h-5 w-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-500">Category</p>
                          <p>{category?.name || "Uncategorized"}</p>
                        </div>
                      </div>
                      
                      {!task.isAdmin && (
                        <div className="flex items-start gap-2">
                          <Building className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-500">Client</p>
                            <p>{client?.displayName || "None"}</p>
                          </div>
                        </div>
                      )}
                      
                      {!task.isAdmin && task.entityId && (
                        <div className="flex items-start gap-2">
                          <Building className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-500">Entity</p>
                            <p>{entity?.name || "None"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {task.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Notes</h4>
                      <div className="bg-slate-50 p-3 rounded-md text-slate-800 whitespace-pre-wrap">
                        {task.notes}
                      </div>
                    </div>
                  )}
                  
                  {/* Compliance information for revenue tasks */}
                  {!task.isAdmin && task.complianceFrequency && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-3">Compliance Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md">
                        <div>
                          <p className="text-sm font-medium">Frequency</p>
                          <p>{task.complianceFrequency}</p>
                        </div>
                        
                        {task.complianceYear && (
                          <div>
                            <p className="text-sm font-medium">Year(s)</p>
                            <p>{task.complianceYear}</p>
                          </div>
                        )}
                        
                        {task.complianceStartDate && (
                          <div>
                            <p className="text-sm font-medium">Start Date</p>
                            <p>{formattedComplianceStartDate}</p>
                          </div>
                        )}
                        
                        {task.complianceEndDate && (
                          <div>
                            <p className="text-sm font-medium">End Date</p>
                            <p>{formattedComplianceEndDate}</p>
                          </div>
                        )}
                        
                        {task.complianceDeadline && (
                          <div>
                            <p className="text-sm font-medium">Compliance Deadline</p>
                            <p>{format(new Date(task.complianceDeadline), "PPP")}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-sm font-medium">Recurring</p>
                          <p>{task.isRecurring ? "Yes" : "No"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Billing information for revenue tasks */}
                  {!task.isAdmin && (task.serviceRate || task.currency) && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-3">Billing Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md">
                        {task.serviceRate !== undefined && task.serviceRate !== null && (
                          <div>
                            <p className="text-sm font-medium">Service Rate</p>
                            <p>{task.serviceRate} {task.currency}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Edit mode - form for the task */}
                {task.isAdmin ? (
                  <Form {...adminTaskForm}>
                    <form onSubmit={adminTaskForm.handleSubmit(onAdminTaskSubmit)}>
                      <div className="space-y-4 pb-4">
                        <FormField
                          control={adminTaskForm.control}
                          name="taskDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Task Details</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter task details" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={adminTaskForm.control}
                            name="assigneeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assignee</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select an assignee" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {users.map((user) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.displayName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={adminTaskForm.control}
                            name="statusId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {taskStatuses.map((status) => (
                                      <SelectItem key={status.id} value={status.id.toString()}>
                                        {status.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={adminTaskForm.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Due Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className="pl-3 text-left font-normal"
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
                          
                          <FormField
                            control={adminTaskForm.control}
                            name="categoryId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {taskCategories.map((category) => (
                                      <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={adminTaskForm.control}
                          name="taskType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Task Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a task type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Regular">Regular</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="Urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Choose the priority level for this task
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={adminTaskForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add any additional notes here"
                                  className="min-h-[120px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateAdminTaskMutation.isPending}>
                          {updateAdminTaskMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                ) : (
                  <Form {...revenueTaskForm}>
                    <form onSubmit={revenueTaskForm.handleSubmit(onRevenueTaskSubmit)}>
                      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-3 mb-4">
                          <TabsTrigger value="details">Basic Details</TabsTrigger>
                          <TabsTrigger value="compliance">Compliance</TabsTrigger>
                          <TabsTrigger value="invoice">Billing</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="details" className="space-y-4 pt-4">
                          <FormField
                            control={revenueTaskForm.control}
                            name="taskDetails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Task Details</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter task details" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={revenueTaskForm.control}
                              name="clientId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Client</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a client" />
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
                            
                            <FormField
                              control={revenueTaskForm.control}
                              name="entityId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Entity</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={!revenueTaskForm.watch("clientId")}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={
                                          revenueTaskForm.watch("clientId") 
                                            ? "Select an entity" 
                                            : "Select a client first"
                                        } />
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
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={revenueTaskForm.control}
                              name="assigneeId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Assignee</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an assignee" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                          {user.displayName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={revenueTaskForm.control}
                              name="statusId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {taskStatuses.map((status) => (
                                        <SelectItem key={status.id} value={status.id.toString()}>
                                          {status.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={revenueTaskForm.control}
                              name="dueDate"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>Due Date</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant={"outline"}
                                          className="pl-3 text-left font-normal"
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
                            
                            <FormField
                              control={revenueTaskForm.control}
                              name="categoryId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {taskCategories.map((category) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                          {category.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={revenueTaskForm.control}
                            name="taskType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Task Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a task type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Regular">Regular</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Choose the priority level for this task
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={revenueTaskForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Add any additional notes here"
                                    className="min-h-[120px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                        
                        <TabsContent value="compliance" className="space-y-4 pt-4">
                          <FormField
                            control={revenueTaskForm.control}
                            name="complianceFrequency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Compliance Frequency</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="One Time">One Time</SelectItem>
                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                                    <SelectItem value="Bi-Annually">Bi-Annually</SelectItem>
                                    <SelectItem value="Annual">Annual</SelectItem>
                                    <SelectItem value="2 Years">2 Years</SelectItem>
                                    <SelectItem value="3 Years">3 Years</SelectItem>
                                    <SelectItem value="4 Years">4 Years</SelectItem>
                                    <SelectItem value="5 Years">5 Years</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  How often this compliance task needs to be performed
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {revenueTaskForm.watch("complianceFrequency") && (
                            <FormField
                              control={revenueTaskForm.control}
                              name="complianceYear"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Year(s)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder={
                                        ["5 Years", "4 Years", "3 Years", "2 Years"].includes(revenueTaskForm.watch("complianceFrequency") || "") 
                                          ? `Enter ${revenueTaskForm.watch("complianceFrequency")?.split(" ")[0]} years separated by commas (e.g., 2024, 2025${revenueTaskForm.watch("complianceFrequency") === "5 Years" ? ", 2026, 2027, 2028" : ""})`
                                          : "Enter year (e.g., 2024)"
                                      }
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    {["5 Years", "4 Years", "3 Years", "2 Years"].includes(revenueTaskForm.watch("complianceFrequency") || "") 
                                      ? `Enter exactly ${revenueTaskForm.watch("complianceFrequency")?.split(" ")[0]} years, separated by commas`
                                      : "Enter a single 4-digit year"
                                    }
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          {revenueTaskForm.watch("complianceFrequency") && (
                            <FormField
                              control={revenueTaskForm.control}
                              name="complianceDuration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duration</FormLabel>
                                  <FormControl>
                                    <Input
                                      disabled
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          {revenueTaskForm.watch("complianceFrequency") && (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={revenueTaskForm.control}
                                  name="complianceStartDate"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                      <FormLabel>Compliance Start Date</FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              variant={"outline"}
                                              className="pl-3 text-left font-normal"
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
                                
                                <FormField
                                  control={revenueTaskForm.control}
                                  name="complianceEndDate"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                      <FormLabel>Compliance End Date</FormLabel>
                                      <FormControl>
                                        <Button
                                          variant={"outline"}
                                          className="pl-3 text-left font-normal"
                                          disabled
                                        >
                                          {field.value ? (
                                            format(field.value, "PPP")
                                          ) : (
                                            <span>Auto-calculated</span>
                                          )}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </FormControl>
                                      <FormDescription>
                                        End date is calculated automatically based on frequency and start date
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <FormField
                                control={revenueTaskForm.control}
                                name="complianceDeadline"
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel>Compliance Deadline</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant={"outline"}
                                            className="pl-3 text-left font-normal"
                                          >
                                            {field.value ? (
                                              format(field.value, "PPP")
                                            ) : (
                                              <span>Set compliance deadline</span>
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
                                    <FormDescription>
                                      Official deadline set by tax authorities for this compliance requirement
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={revenueTaskForm.control}
                                name="isRecurring"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>
                                        Make this task recurring
                                      </FormLabel>
                                      <FormDescription>
                                        If checked, new tasks will be auto-generated based on the compliance frequency.
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="invoice" className="space-y-4 pt-4">
                          <div className="mb-4 flex items-center space-x-2">
                            <Checkbox 
                              id="createUpdateInvoice" 
                              checked={revenueTaskForm.watch("createUpdateInvoice")}
                              onCheckedChange={(checked) => 
                                revenueTaskForm.setValue("createUpdateInvoice", checked === true)
                              }
                            />
                            <label
                              htmlFor="createUpdateInvoice"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Create/Update Invoice with this Task
                            </label>
                          </div>
                          
                          <FormField
                            control={revenueTaskForm.control}
                            name="currency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Currency</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {currencies.length === 0 ? (
                                      <SelectItem value="USD">USD - United States Dollar</SelectItem>
                                    ) : (
                                      currencies.map((currency: any) => (
                                        <SelectItem key={currency.id} value={currency.code}>
                                          {currency.code} - {currency.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The currency for invoicing this task
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={revenueTaskForm.control}
                              name="serviceRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Service Rate</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Enter service rate"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    The base rate to be charged for this service
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={revenueTaskForm.control}
                              name="discountAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Discount Amount</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Optional discount to apply to invoice
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={revenueTaskForm.control}
                            name="taxPercent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tax Percentage (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Tax percentage will be applied as: (Subtotal - Discount) × Tax%
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Display totals calculation */}
                          {revenueTaskForm.watch("createUpdateInvoice") && (
                            <div className="mt-6 bg-slate-50 p-4 rounded-md space-y-2">
                              <h4 className="font-medium mb-2">Invoice Summary</h4>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Subtotal:</span>
                                <span className="font-medium">{revenueTaskForm.watch("serviceRate") || 0} {revenueTaskForm.watch("currency") || "USD"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Discount:</span>
                                <span className="font-medium">-{revenueTaskForm.watch("discountAmount") || 0} {revenueTaskForm.watch("currency") || "USD"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Tax ({revenueTaskForm.watch("taxPercent") || 0}%):</span>
                                <span className="font-medium">
                                  {(((revenueTaskForm.watch("serviceRate") || 0) - (revenueTaskForm.watch("discountAmount") || 0)) * (revenueTaskForm.watch("taxPercent") || 0) / 100).toFixed(2)} {revenueTaskForm.watch("currency") || "USD"}
                                </span>
                              </div>
                              <Separator className="my-2" />
                              <div className="flex justify-between font-semibold">
                                <span>Total:</span>
                                <span>
                                  {(
                                    (revenueTaskForm.watch("serviceRate") || 0) - 
                                    (revenueTaskForm.watch("discountAmount") || 0) + 
                                    (((revenueTaskForm.watch("serviceRate") || 0) - (revenueTaskForm.watch("discountAmount") || 0)) * (revenueTaskForm.watch("taxPercent") || 0) / 100)
                                  ).toFixed(2)} {revenueTaskForm.watch("currency") || "USD"}
                                </span>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                      
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateRevenueTaskMutation.isPending}>
                          {updateRevenueTaskMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                )}
              </>
            )}
            
            {/* Action buttons */}
            {!isEditing && (
              <DialogFooter className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2">
                  {/* Delete button */}
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
                        deleteTaskMutation.mutate();
                      }
                    }}
                    disabled={deleteTaskMutation.isPending}
                  >
                    {deleteTaskMutation.isPending ? "Deleting..." : "Delete Task"}
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  {/* Create/Update Invoice button - Show for all revenue tasks */}
                  {!task.isAdmin && task.statusId && (
                    <Button
                      variant="default"
                      onClick={() => {
                        // Open the Invoice tab directly
                        setIsEditing(true);
                        setActiveTab("invoice");
                        
                        // Show a warning if the task is not completed
                        const currentStatus = taskStatuses.find(s => s.id === task.statusId);
                        if (currentStatus?.rank !== 3) { // Not completed
                          toast({
                            title: "Task Not Completed",
                            description: "Creating an invoice for a task that is not yet completed. You can still proceed.",
                            variant: "destructive"
                          });
                        }
                        
                        // Slight delay to ensure form is ready
                        setTimeout(() => {
                          // If there's already an invoice, this will populate the form
                          if (task.invoiceId) {
                            toast({
                              title: "Editing existing invoice",
                              description: "The invoice will be set to Draft status when updated."
                            });
                          } else {
                            toast({
                              title: "Create a new invoice",
                              description: "Fill out the billing details to generate an invoice."
                            });
                          }
                        }, 100);
                      }}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      {task.invoiceId ? "Update Invoice" : "Create Invoice"}
                    </Button>
                  )}
                  
                  {/* TaskStatusWorkflow for better status transitions */}
                  {task.statusId && taskStatus?.rank !== 3 && (
                    <TaskStatusWorkflow 
                      taskId={task.id} 
                      currentStatusId={task.statusId}
                      onStatusChange={() => {
                        // Refresh task data
                        queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks", taskId] });
                      }}
                    />
                  )}
                  
                  {/* Edit button */}
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Task
                  </Button>
                  
                  {/* Close button */}
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                </div>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}