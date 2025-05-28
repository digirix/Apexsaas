import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Client, User, TaskCategory, TaskStatus, Entity, ServiceType, TenantSetting } from "@shared/schema";
import { addMonths, addYears, addQuarters } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { format } from "date-fns";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskType: "admin" | "revenue";
  preselectedClientId?: string;
}

// Define form schema for admin tasks
const adminTaskSchema = z.object({
  taskType: z.enum(["Regular", "Medium", "Urgent"]),
  assigneeId: z.string().min(1, "Please select an assignee"),
  dueDate: z.date({
    required_error: "Please select a due date",
  }),
  taskCategoryId: z.string().optional(),
  taskDetails: z.string().min(5, "Task details must be at least 5 characters"),
  nextToDo: z.string().optional(),
});

type AdminTaskFormValues = z.infer<typeof adminTaskSchema>;

// Define form schema for revenue tasks (basic info tab)
// Define the comprehensive revenue task schema with all tabs
const revenueTaskSchema = z.object({
  // Basic Information Tab
  clientId: z.string().min(1, "Please select a client"),
  entityId: z.string().min(1, "Please select an entity"),
  serviceId: z.string().min(1, "Please select a service"),
  taskCategoryId: z.string().optional(),
  taskType: z.enum(["Regular", "Medium", "Urgent"]),
  assigneeId: z.string().min(1, "Please select an assignee"),
  dueDate: z.date({
    required_error: "Please select a due date",
  }),
  taskDetails: z.string().min(5, "Task details must be at least 5 characters"),
  nextToDo: z.string().optional(),
  
  // Compliance Configuration Tab
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
  isRecurring: z.boolean().default(false),
  
  // Invoice Information Tab
  currency: z.string().optional(),
  serviceRate: z.number().optional(),
});

type RevenueTaskFormValues = z.infer<typeof revenueTaskSchema>;

export function AddTaskModal({ isOpen, onClose, taskType, preselectedClientId }: AddTaskModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  
  // Admin task form
  const adminTaskForm = useForm<AdminTaskFormValues>({
    resolver: zodResolver(adminTaskSchema),
    defaultValues: {
      taskType: "Regular",
      assigneeId: "",
      taskCategoryId: "",
      taskDetails: "",
      nextToDo: "",
    },
  });
  
  // Revenue task form
  const revenueTaskForm = useForm<RevenueTaskFormValues>({
    resolver: zodResolver(revenueTaskSchema),
    defaultValues: {
      // Basic Information Tab
      clientId: "",
      entityId: "",
      serviceId: "",
      taskCategoryId: "",
      taskType: "Regular",
      assigneeId: "",
      taskDetails: "",
      nextToDo: "",
      dueDate: undefined,
      
      // Compliance Configuration Tab
      complianceFrequency: undefined,
      complianceYear: "",
      complianceDuration: "",
      complianceStartDate: undefined,
      complianceEndDate: undefined,
      isRecurring: false,
      
      // Invoice Information Tab
      currency: "",
      serviceRate: undefined,
    },
  });
  
  // Fetch clients (for revenue task)
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/v1/clients"],
    enabled: isOpen && taskType === "revenue",
    queryFn: async () => {
      console.log("Fetching clients");
      const response = await fetch("/api/v1/clients");
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      const data = await response.json();
      console.log("Fetched clients:", data);
      return data;
    }
  });
  
  // Get selected client ID
  const selectedClientId = revenueTaskForm.watch("clientId");
  
  // Fetch entities for the selected client
  const { data: entities = [], isLoading: isLoadingEntities } = useQuery<Entity[]>({
    queryKey: ["/api/v1/clients", selectedClientId, "entities"],
    enabled: isOpen && taskType === "revenue" && !!selectedClientId,
    queryFn: async () => {
      console.log("Fetching entities for client:", selectedClientId);
      const response = await fetch(`/api/v1/clients/${selectedClientId}/entities`);
      if (!response.ok) {
        throw new Error("Failed to fetch entities for client");
      }
      const data = await response.json();
      console.log("Fetched client entities:", data);
      return data;
    }
  });
  
  // Get selected entity ID
  const selectedEntityId = revenueTaskForm.watch("entityId");
  
  // Fetch services for the selected entity
  const { data: entityServices = [], isLoading: isLoadingServices } = useQuery<ServiceType[]>({
    queryKey: ["/api/v1/entities", selectedEntityId, "services"],
    enabled: isOpen && taskType === "revenue" && !!selectedEntityId,
    queryFn: async () => {
      console.log("Fetching services for entity:", selectedEntityId);
      const response = await fetch(`/api/v1/entities/${selectedEntityId}/services`);
      if (!response.ok) {
        throw new Error("Failed to fetch services for entity");
      }
      const data = await response.json();
      console.log("Fetched entity services:", data);
      return data;
    }
  });
  
  // Fetch users for assignee dropdown
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/v1/users"],
    enabled: isOpen,
  });
  
  // Fetch admin task categories
  const { data: adminTaskCategories = [], isLoading: isLoadingAdminCategories } = useQuery<TaskCategory[]>({
    queryKey: ["/api/v1/setup/task-categories", { isAdmin: true }],
    queryFn: async () => {
      const response = await fetch("/api/v1/setup/task-categories?isAdmin=true");
      if (!response.ok) {
        throw new Error("Failed to fetch admin task categories");
      }
      return response.json();
    },
    enabled: isOpen && taskType === "admin",
  });
  
  // Fetch revenue task categories
  const { data: revenueTaskCategories = [], isLoading: isLoadingRevenueCategories } = useQuery<TaskCategory[]>({
    queryKey: ["/api/v1/setup/task-categories", { isAdmin: false }],
    queryFn: async () => {
      const response = await fetch("/api/v1/setup/task-categories?isAdmin=false");
      if (!response.ok) {
        throw new Error("Failed to fetch revenue task categories");
      }
      return response.json();
    },
    enabled: isOpen && taskType === "revenue",
  });
  
  // Fetch task statuses
  const { data: taskStatuses = [], isLoading: isLoadingStatuses } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
    enabled: isOpen,
  });
  
  // Define interface for currency
  interface Currency {
    id: number;
    code: string;
    name: string;
    countryId: number;
  }
  
  // Fetch currencies from setup module
  const { data: currencies = [], isLoading: isLoadingCurrencies } = useQuery<Currency[]>({
    queryKey: ["/api/v1/setup/currencies"],
    enabled: isOpen && taskType === "revenue",
  });
  
  // Fetch tenant settings to check if past due dates are allowed
  const { data: tenantSettings = [], isLoading: isLoadingSettings } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    enabled: isOpen,
  });
  
  // Get the allow_past_due_dates setting
  const allowPastDueDates = tenantSettings.find(setting => setting.key === "allow_past_due_dates")?.value === "true";
  
  // Create task mutation for admin tasks
  const createAdminTaskMutation = useMutation({
    mutationFn: async (data: AdminTaskFormValues) => {
      // Find the "New" status by name
      const newStatus = taskStatuses.find(status => status.name === "New");
      
      // Start with a cleaned payload that only includes the fields we need
      const payload: any = {
        isAdmin: true,
        taskType: data.taskType,
        taskDetails: data.taskDetails,
        nextToDo: data.nextToDo,
        statusId: newStatus?.id || 2, // Use "New" status ID, fallback to 2 which is typically "New"
      };
      
      // Convert assigneeId to number
      if (data.assigneeId) {
        payload.assigneeId = parseInt(data.assigneeId);
      }

      // Convert taskCategoryId to number if provided
      if (data.taskCategoryId && data.taskCategoryId.trim() !== '') {
        payload.taskCategoryId = parseInt(data.taskCategoryId);
      }
      
      // Ensure dueDate is sent as a Date object
      if (data.dueDate) {
        payload.dueDate = new Date(data.dueDate);
      }

      const response = await apiRequest("POST", "/api/v1/tasks", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      // Also invalidate client-specific task queries
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/v1/tasks?clientId=')
      });
      toast({
        title: "Task Created",
        description: "The administrative task has been created successfully.",
      });
      onClose();
      adminTaskForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Create task mutation for revenue tasks
  const createRevenueTaskMutation = useMutation({
    mutationFn: async (data: RevenueTaskFormValues) => {
      // Find the "New" status by name
      const newStatus = taskStatuses.find(status => status.name === "New");
      
      // Start with a cleaned payload that only includes the fields we need
      // This prevents any extra fields from being sent to the API
      const payload: any = {
        isAdmin: false,
        taskType: data.taskType,
        taskDetails: data.taskDetails,
        nextToDo: data.nextToDo,
        isRecurring: data.isRecurring || false,
        complianceFrequency: data.complianceFrequency,
        complianceYear: data.complianceYear,
        complianceDuration: data.complianceDuration,
        currency: data.currency,
        statusId: newStatus?.id || 2, // Use "New" status ID, fallback to 2 which is typically "New"
      };

      // Handle service rate as a number if provided
      if (data.serviceRate !== undefined) {
        payload.serviceRate = Number(data.serviceRate);
      }

      // Convert string IDs to numbers
      if (data.clientId) {
        payload.clientId = parseInt(data.clientId);
      }
      
      if (data.entityId) {
        payload.entityId = parseInt(data.entityId);
      }
      
      if (data.serviceId) {
        payload.serviceTypeId = parseInt(data.serviceId);
      }
      
      if (data.assigneeId) {
        payload.assigneeId = parseInt(data.assigneeId);
      }
      
      // Convert taskCategoryId to number if provided
      if (data.taskCategoryId && data.taskCategoryId.trim() !== '') {
        payload.taskCategoryId = parseInt(data.taskCategoryId);
      }

      // Ensure dates are sent as Date objects
      if (data.dueDate) {
        payload.dueDate = new Date(data.dueDate);
      }
      
      if (data.complianceStartDate) {
        payload.complianceStartDate = new Date(data.complianceStartDate);
      }
      
      if (data.complianceEndDate) {
        payload.complianceEndDate = new Date(data.complianceEndDate);
      }

      // Log the payload for debugging
      console.log("Task creation payload:", payload);

      const response = await apiRequest("POST", "/api/v1/tasks", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      // Also invalidate client-specific task queries
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/v1/tasks?clientId=')
      });
      toast({
        title: "Task Created",
        description: "The revenue task has been created successfully.",
      });
      onClose();
      revenueTaskForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  function onAdminTaskSubmit(data: AdminTaskFormValues) {
    createAdminTaskMutation.mutate(data);
  }
  
  function onRevenueTaskSubmit(data: RevenueTaskFormValues) {
    createRevenueTaskMutation.mutate(data);
  }
  
  // Effect to calculate compliance end date based on frequency and start date
  // Set preselected client ID when modal opens
  useEffect(() => {
    if (isOpen && taskType === "revenue" && preselectedClientId) {
      console.log("Setting preselected client ID:", preselectedClientId);
      revenueTaskForm.setValue("clientId", preselectedClientId);
    }
  }, [isOpen, taskType, preselectedClientId, revenueTaskForm]);
  
  useEffect(() => {
    const frequency = revenueTaskForm.watch("complianceFrequency");
    const startDate = revenueTaskForm.watch("complianceStartDate");
    
    if (frequency && startDate) {
      let endDate;
      
      // Make a copy of the start date to avoid modifying the original
      const startDateCopy = new Date(startDate);
      const year = startDateCopy.getFullYear();
      const month = startDateCopy.getMonth();
      const day = startDateCopy.getDate();
      
      switch(frequency) {
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
        case "One Time":
          // Same date but with end of day time
          endDate = new Date(startDateCopy);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          endDate = undefined;
      }
      
      if (endDate) {
        revenueTaskForm.setValue("complianceEndDate", endDate);
      }
    }
  }, [
    revenueTaskForm.watch("complianceFrequency"), 
    revenueTaskForm.watch("complianceStartDate")
  ]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex items-start">
            <div className="mr-4 bg-blue-100 p-2 rounded-full">
              <PlusCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {taskType === "admin" ? "Add Administrative Task" : "Add Revenue Task"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {taskType === "admin" 
                  ? "Create a new administrative task for internal purposes." 
                  : "Create a new revenue task linked to a client entity and service."
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {taskType === "admin" ? (
          <Form {...adminTaskForm}>
            <form onSubmit={adminTaskForm.handleSubmit(onAdminTaskSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={adminTaskForm.control}
                  name="taskType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select task type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Regular">Regular</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={adminTaskForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingUsers ? (
                            <div className="flex justify-center items-center py-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : users.length === 0 ? (
                            <SelectItem value="empty" disabled>
                              No users available
                            </SelectItem>
                          ) : (
                            users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.displayName}
                              </SelectItem>
                            ))
                          )}
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
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                            disabled={(date) =>
                              !allowPastDueDates && date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
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
                  name="taskCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Category (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingAdminCategories ? (
                            <div className="flex justify-center items-center py-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : adminTaskCategories.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No categories available
                            </SelectItem>
                          ) : (
                            adminTaskCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={adminTaskForm.control}
                name="taskDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter details about the task" 
                        className="resize-none" 
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={adminTaskForm.control}
                name="nextToDo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Steps (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter next steps for this task" 
                        className="resize-none" 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={createAdminTaskMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAdminTaskMutation.isPending}
                >
                  {createAdminTaskMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
            </TabsList>
            
            <Form {...revenueTaskForm}>
              <form onSubmit={revenueTaskForm.handleSubmit(onRevenueTaskSubmit)} className="space-y-4">
                <TabsContent value="basic">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={revenueTaskForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Reset dependent fields when client changes
                                revenueTaskForm.setValue("entityId", "");
                                revenueTaskForm.setValue("serviceId", "");
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingClients ? (
                                  <div className="flex justify-center items-center py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : clients.length === 0 ? (
                                  <SelectItem value="empty" disabled>
                                    No clients available
                                  </SelectItem>
                                ) : (
                                  clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                      {client.displayName}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={revenueTaskForm.control}
                        name="entityId"
                        render={({ field }) => {
                          // For debugging: Log the current field value and available entities
                          console.log("Current entityId:", field.value);
                          console.log("Available entities:", entities);
                          
                          // Function to find the entity name based on the selected ID
                          const getEntityName = () => {
                            if (!field.value) return "Select entity";
                            if (!entities || entities.length === 0) return "Select entity";
                            console.log("Looking for entity with ID:", field.value, "in", entities);
                            const entity = entities.find(e => e.id.toString() === field.value);
                            // This handles both Entity objects (with name) and Client objects (with displayName)
                            return entity ? ((entity as any).name || (entity as any).displayName) : "Select entity";
                          };
                          
                          return (
                            <FormItem>
                              <FormLabel>Entity</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  console.log("Entity selection changed to:", value);
                                  field.onChange(value);
                                  // Reset service field when entity changes
                                  revenueTaskForm.setValue("serviceId", "");
                                }} 
                                value={field.value || ""}
                                disabled={!revenueTaskForm.watch("clientId")}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select entity">
                                      {getEntityName()}
                                    </SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingEntities ? (
                                    <div className="flex justify-center items-center py-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  ) : !entities || entities.length === 0 ? (
                                    <SelectItem value="no-entities" disabled>
                                      No entities available
                                    </SelectItem>
                                  ) : (
                                    entities.map((entity) => (
                                      <SelectItem key={entity.id} value={entity.id.toString()}>
                                        {(entity as any).name || (entity as any).displayName}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={revenueTaskForm.control}
                        name="serviceId"
                        render={({ field }) => {
                          // For debugging: Log the current field value and available services
                          console.log("Current serviceId:", field.value);
                          console.log("Available services:", entityServices);
                          
                          // Function to find the service name based on the selected ID
                          const getServiceName = () => {
                            if (!field.value) return "Select service";
                            if (!entityServices || entityServices.length === 0) return "Select service";
                            console.log("Looking for service with ID:", field.value, "in", entityServices);
                            const service = entityServices.find(s => s.id.toString() === field.value);
                            return service ? service.name : "Select service";
                          };
                          
                          return (
                            <FormItem>
                              <FormLabel>Service</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  console.log("Service selection changed to:", value);
                                  field.onChange(value);
                                }} 
                                value={field.value || ""}
                                disabled={!revenueTaskForm.watch("entityId")}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select service">
                                      {getServiceName()}
                                    </SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingServices ? (
                                    <div className="flex justify-center items-center py-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  ) : !entityServices || entityServices.length === 0 ? (
                                    <SelectItem value="no-services" disabled>
                                      No services available
                                    </SelectItem>
                                  ) : (
                                    entityServices.map((service: ServiceType) => (
                                      <SelectItem key={service.id} value={service.id.toString()}>
                                        {service.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      
                      <FormField
                        control={revenueTaskForm.control}
                        name="taskCategoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Category (Optional)</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingRevenueCategories ? (
                                  <div className="flex justify-center items-center py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : revenueTaskCategories.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No categories available
                                  </SelectItem>
                                ) : (
                                  revenueTaskCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))
                                )}
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
                        name="taskType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select task type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Regular">Regular</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={revenueTaskForm.control}
                        name="assigneeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assignee</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingUsers ? (
                                  <div className="flex justify-center items-center py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : users.length === 0 ? (
                                  <SelectItem value="empty" disabled>
                                    No users available
                                  </SelectItem>
                                ) : (
                                  users.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.displayName}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div>
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
                                    variant="outline"
                                    className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                                  disabled={(date) =>
                                    !allowPastDueDates && date < new Date(new Date().setHours(0, 0, 0, 0))
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div>
                      <FormField
                        control={revenueTaskForm.control}
                        name="taskDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Details</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter details about the task" 
                                className="resize-none" 
                                rows={4}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div>
                      <FormField
                        control={revenueTaskForm.control}
                        name="nextToDo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next Steps (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter next steps for this task" 
                                className="resize-none" 
                                rows={2}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Navigation buttons for Basic tab */}
                    <div className="flex justify-end space-x-2 mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onClose}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => setActiveTab("compliance")}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="compliance">
                  {!revenueTaskForm.watch("serviceId") ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center justify-center">
                      <p className="text-slate-500 mb-4">Complete the Basic Information tab first</p>
                      <Button type="button" onClick={() => setActiveTab("basic")}>
                        Go to Basic Information
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={revenueTaskForm.control}
                          name="complianceFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Compliance Frequency</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value || ""}
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
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
                      </div>
                      
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
                                      variant="outline"
                                      className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                      disabled={!revenueTaskForm.watch("complianceFrequency") || !revenueTaskForm.watch("complianceStartDate")}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Auto-calculated based on frequency</span>
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
                                    disabled={(date) =>
                                      date < (revenueTaskForm.watch("complianceStartDate") || new Date())
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormDescription>
                                Auto-calculated based on the frequency and start date
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={revenueTaskForm.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Recurring Task</FormLabel>
                              <FormDescription>
                                Check this if the task should be automatically recreated based on the compliance frequency
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Navigation buttons for Compliance tab */}
                      <div className="flex justify-end space-x-2 mt-6">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={onClose}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          onClick={() => setActiveTab("invoice")}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="invoice">
                  {!revenueTaskForm.watch("serviceId") ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center justify-center">
                      <p className="text-slate-500 mb-4">Complete the Basic Information tab first</p>
                      <Button type="button" onClick={() => setActiveTab("basic")}>
                        Go to Basic Information
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  {isLoadingCurrencies ? (
                                    <div className="flex justify-center items-center py-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  ) : currencies.length === 0 ? (
                                    <SelectItem value="USD">USD - United States Dollar</SelectItem>
                                  ) : (
                                    currencies.map((currency) => (
                                      <SelectItem key={currency.id} value={currency.code}>
                                        {currency.code} - {currency.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Auto-populated from entity's country, but can be changed if needed
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={revenueTaskForm.control}
                          name="serviceRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Rate</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Enter rate" 
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Service rate in the selected currency for invoice calculations
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Navigation/Submission buttons for Invoice tab (final tab) */}
                      <div className="flex justify-end space-x-2 mt-6">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={onClose}
                          disabled={createRevenueTaskMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createRevenueTaskMutation.isPending}
                        >
                          {createRevenueTaskMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : "Create Task"}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </form>
            </Form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}