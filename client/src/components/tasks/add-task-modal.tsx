import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Client, User, TaskCategory, TaskStatus, Entity, ServiceType } from "@shared/schema";
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
}

// Define our interfaces for form values
interface AdminTaskFormValues {
  taskType: "Regular" | "Medium" | "Urgent";
  assigneeId: string;
  dueDate?: Date;
  taskCategoryId?: string;
  taskDetails: string;
  nextToDo?: string;
}

interface RevenueTaskFormValues {
  // Basic Information Tab
  clientId: string;
  entityId: string;
  serviceId: string;
  taskCategoryId?: string;
  taskType: "Regular" | "Medium" | "Urgent";
  assigneeId: string;
  dueDate?: Date;
  taskDetails: string;
  nextToDo?: string;
  
  // Compliance Configuration Tab
  complianceFrequency?: string;
  complianceYear?: string;
  complianceDuration?: string;
  complianceStartDate?: Date;
  complianceEndDate?: Date;
  isRecurring: boolean;
  
  // Invoice Information Tab
  currency?: string;
  serviceRate?: number;
}

// Define interface for currency
interface Currency {
  id: number;
  code: string;
  name: string;
  countryId: number;
}

// Define validation schemas
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
        }
    }),
  complianceDuration: z.string().optional(),
  complianceStartDate: z.date().optional(),
  complianceEndDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  
  // Invoice Information Tab
  currency: z.string().optional(),
  serviceRate: z.number().optional(),
});

export function AddTaskModal({ isOpen, onClose, taskType }: AddTaskModalProps) {
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
  
  // Fetch currencies from setup module
  const { data: currencies = [], isLoading: isLoadingCurrencies } = useQuery<Currency[]>({
    queryKey: ["/api/v1/setup/currencies"],
    enabled: isOpen && taskType === "revenue",
  });
  
  // Create task mutation for admin tasks
  const createAdminTaskMutation = useMutation({
    mutationFn: async (data: AdminTaskFormValues) => {
      // Start with a cleaned payload that only includes the fields we need
      // Find the "New" status (rank 1)
      const newStatus = taskStatuses.find(s => s.rank === 1);
      if (!newStatus) {
        throw new Error("No 'New' status found. Please set up task statuses first.");
      }
      
      const payload: any = {
        isAdmin: true,
        taskType: data.taskType,
        taskDetails: data.taskDetails,
        nextToDo: data.nextToDo,
        statusId: newStatus.id, // Using the correct "New" status ID
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
      // Start with a cleaned payload that only includes the fields we need
      // This prevents any extra fields from being sent to the API
      // Find the "New" status (rank 1)
      const newStatus = taskStatuses.find(s => s.rank === 1);
      if (!newStatus) {
        throw new Error("No 'New' status found. Please set up task statuses first.");
      }
      
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
        statusId: newStatus.id, // Using the correct "New" status ID
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
  useEffect(() => {
    const frequency = revenueTaskForm.watch("complianceFrequency");
    const startDate = revenueTaskForm.watch("complianceStartDate");
    
    if (frequency && startDate) {
      let endDate;
      
      switch(frequency) {
        case "5 Years":
          endDate = addYears(startDate, 5);
          break;
        case "4 Years":
          endDate = addYears(startDate, 4);
          break;
        case "3 Years":
          endDate = addYears(startDate, 3);
          break;
        case "2 Years":
          endDate = addYears(startDate, 2);
          break;
        case "Annual":
          endDate = addYears(startDate, 1);
          break;
        case "Bi-Annually":
          endDate = addMonths(startDate, 6);
          break;
        case "Quarterly":
          endDate = addQuarters(startDate, 1);
          break;
        case "Monthly":
          endDate = addMonths(startDate, 1);
          break;
        case "One Time":
          endDate = startDate; // Same as start date for one-time tasks
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
                      <FormLabel>Task Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingAdminCategories ? (
                            <div className="flex justify-center items-center py-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : adminTaskCategories.length === 0 ? (
                            <SelectItem value="" disabled>
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
                      <FormDescription>
                        Select a category to help organize tasks
                      </FormDescription>
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
                        placeholder="Enter detailed description of the task"
                        className="min-h-[100px]"
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
                    <FormLabel>Next To-Do</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter next actions to be taken (optional)"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <FormDescription>
                      Provide specific instructions for the next steps
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={adminTaskForm.formState.isSubmitting}
                >
                  {adminTaskForm.formState.isSubmitting ? (
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
          <Form {...revenueTaskForm}>
            <form onSubmit={revenueTaskForm.handleSubmit(onRevenueTaskSubmit)} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance Config</TabsTrigger>
                  <TabsTrigger value="invoice">Invoice Information</TabsTrigger>
                </TabsList>
                
                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
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
                              // Clear entity selection when client changes
                              revenueTaskForm.setValue("entityId", "");
                              revenueTaskForm.setValue("serviceId", "");
                              // Invalidate entities query to force a refresh
                              queryClient.invalidateQueries({ queryKey: ["/api/v1/clients", value, "entities"] });
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entity</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Clear service selection when entity changes
                              revenueTaskForm.setValue("serviceId", "");
                              // Invalidate services query to force a refresh
                              if (value) {
                                queryClient.invalidateQueries({ queryKey: ["/api/v1/entities", value, "services"] });
                              }
                            }} 
                            value={field.value}
                            disabled={!selectedClientId || isLoadingEntities}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={!selectedClientId ? "Select client first" : "Select entity"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingEntities ? (
                                <div className="flex justify-center items-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : entities.length === 0 ? (
                                <SelectItem value="empty" disabled>
                                  No entities available
                                </SelectItem>
                              ) : (
                                entities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id.toString()}>
                                    {entity.name}
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
                      name="serviceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!selectedEntityId || isLoadingServices}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={!selectedEntityId ? "Select entity first" : "Select service"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingServices ? (
                                <div className="flex justify-center items-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : entityServices.length === 0 ? (
                                <SelectItem value="empty" disabled>
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
                      )}
                    />
                    
                    <FormField
                      control={revenueTaskForm.control}
                      name="taskCategoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Category</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingRevenueCategories ? (
                                <div className="flex justify-center items-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : revenueTaskCategories.length === 0 ? (
                                <SelectItem value="" disabled>
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
                    name="taskDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Details</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter detailed description of the task"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={revenueTaskForm.control}
                    name="nextToDo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next To-Do</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter next actions to be taken (optional)"
                            className="min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          Provide specific instructions for the next steps
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab("compliance")}
                    className="w-full"
                  >
                    Next: Compliance Configuration
                  </Button>
                </TabsContent>
                
                {/* Compliance Configuration Tab */}
                <TabsContent value="compliance" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={revenueTaskForm.control}
                      name="complianceFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
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
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Quarterly">Quarterly</SelectItem>
                              <SelectItem value="Bi-Annually">Bi-Annually</SelectItem>
                              <SelectItem value="Annual">Annual</SelectItem>
                              <SelectItem value="2 Years">2 Years</SelectItem>
                              <SelectItem value="3 Years">3 Years</SelectItem>
                              <SelectItem value="4 Years">4 Years</SelectItem>
                              <SelectItem value="5 Years">5 Years</SelectItem>
                              <SelectItem value="One Time">One Time</SelectItem>
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
                              placeholder="e.g., 2024 or 2024,2025,2026"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <FormDescription>
                            {revenueTaskForm.watch("complianceFrequency") === "Annual" ? 
                              "Single year (e.g., 2024)" : 
                              (revenueTaskForm.watch("complianceFrequency") === "Quarterly" || 
                               revenueTaskForm.watch("complianceFrequency") === "Monthly" || 
                               revenueTaskForm.watch("complianceFrequency") === "Bi-Annually") ?
                                "Comma-separated years (e.g., 2024,2025)" : ""}
                          </FormDescription>
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
                          <FormLabel>Start Date</FormLabel>
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
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild disabled>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Calculated from frequency</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                          </Popover>
                          <FormDescription>
                            Auto-calculated based on frequency and start date
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={revenueTaskForm.control}
                      name="complianceDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Basic">Basic</SelectItem>
                              <SelectItem value="Standard">Standard</SelectItem>
                              <SelectItem value="Extended">Extended</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Optional: helps with estimating time requirements
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
                              Recurring Task
                            </FormLabel>
                            <FormDescription>
                              Enable if this is a recurring compliance task
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setActiveTab("basic")}
                    >
                      Back: Basic Information
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setActiveTab("invoice")}
                    >
                      Next: Invoice Information
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Invoice Information Tab */}
                <TabsContent value="invoice" className="space-y-4">
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
                                <SelectValue placeholder="Select currency (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCurrencies ? (
                                <div className="flex justify-center items-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : currencies.length === 0 ? (
                                <SelectItem value="" disabled>
                                  No currencies available
                                </SelectItem>
                              ) : (
                                currencies.map((currency) => (
                                  <SelectItem key={currency.id} value={currency.code}>
                                    {currency.code} - {currency.name}
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
                      name="serviceRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Rate</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="Enter rate (optional)"
                              {...field}
                              value={field.value === undefined ? '' : field.value}
                              onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional rate for billing purposes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setActiveTab("compliance")}
                    >
                      Back: Compliance Configuration
                    </Button>
                    <Button 
                      type="submit"
                      disabled={revenueTaskForm.formState.isSubmitting}
                    >
                      {revenueTaskForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : "Create Task"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}