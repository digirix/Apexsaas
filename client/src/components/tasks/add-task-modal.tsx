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
  complianceYear: z.string().optional(),
  complianceDuration: z.string().optional(),
  complianceStartDate: z.date().optional(),
  complianceEndDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  
  // Invoice Information Tab
  currency: z.string().optional(),
  serviceRate: z.number().optional(),
});

type RevenueTaskFormValues = z.infer<typeof revenueTaskSchema>;

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
  const { data: currencies = [], isLoading: isLoadingCurrencies } = useQuery({
    queryKey: ["/api/v1/setup/currencies"],
    enabled: isOpen && taskType === "revenue",
  });
  
  // Create task mutation for admin tasks
  const createAdminTaskMutation = useMutation({
    mutationFn: async (data: AdminTaskFormValues) => {
      const payload = {
        ...data,
        isAdmin: true,
        assigneeId: parseInt(data.assigneeId),
        statusId: 1, // New status
        // Convert date objects to ISO strings
        dueDate: data.dueDate.toISOString(),
      };
      
      // Include categoryId only if it's provided
      if (data.taskCategoryId) {
        payload.categoryId = parseInt(data.taskCategoryId);
        delete payload.taskCategoryId; // Remove the old field to prevent confusion
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
      const payload = {
        ...data,
        isAdmin: false,
        clientId: parseInt(data.clientId),
        entityId: parseInt(data.entityId),
        serviceTypeId: parseInt(data.serviceId),
        assigneeId: parseInt(data.assigneeId),
        statusId: 1, // New status
        // Convert date objects to ISO strings
        dueDate: data.dueDate.toISOString(),
        complianceStartDate: data.complianceStartDate ? data.complianceStartDate.toISOString() : undefined,
        complianceEndDate: data.complianceEndDate ? data.complianceEndDate.toISOString() : undefined,
      };
      
      // Include categoryId only if it's provided
      if (data.taskCategoryId) {
        payload.categoryId = parseInt(data.taskCategoryId);
        delete payload.taskCategoryId; // Remove the old field to prevent confusion
      }

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
                            users.map((user: any) => (
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
                              date < new Date(new Date().setHours(0, 0, 0, 0))
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
                            adminTaskCategories.map((category: any) => (
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
                                clients.map((client: any) => (
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
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={revenueTaskForm.control}
                      name="entityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entity</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Clear service when entity changes
                              revenueTaskForm.setValue("serviceId", "");
                            }}
                            value={field.value}
                            disabled={!selectedClientId || isLoadingEntities}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select entity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingEntities ? (
                                <div className="flex justify-center items-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : entities.length === 0 ? (
                                <SelectItem value="empty" disabled>
                                  No entities available for this client
                                </SelectItem>
                              ) : (
                                entities.map((entity: any) => (
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
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingServices ? (
                                <div className="flex justify-center items-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : entityServices.length === 0 ? (
                                <SelectItem value="empty" disabled>
                                  No services available for this entity
                                </SelectItem>
                              ) : (
                                entityServices.map((service: any) => (
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
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                                revenueTaskCategories.map((category: any) => (
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
                                users.map((user: any) => (
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
                  
                  <div className="grid grid-cols-1 gap-4 mt-4">
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
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
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
                  
                  <div className="grid grid-cols-1 gap-4 mt-4">
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
                </TabsContent>
                
                <TabsContent value="compliance" className="space-y-4 pt-4">
                  <div className="bg-blue-50 p-4 rounded-md mb-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Compliance Configuration</h3>
                    <p className="text-sm text-blue-700">
                      Configure compliance requirements for this task. For recurring tasks, the system will automatically create follow-up tasks based on the frequency.
                    </p>
                  </div>
                  
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
                              <SelectItem value="5 Years">5 Years</SelectItem>
                              <SelectItem value="4 Years">4 Years</SelectItem>
                              <SelectItem value="3 Years">3 Years</SelectItem>
                              <SelectItem value="2 Years">2 Years</SelectItem>
                              <SelectItem value="Annual">Annual</SelectItem>
                              <SelectItem value="Bi-Annually">Bi-Annually</SelectItem>
                              <SelectItem value="Quarterly">Quarterly</SelectItem>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="One Time">One Time</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How often this compliance task needs to be performed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={revenueTaskForm.control}
                      name="complianceYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Compliance Year</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="2023">2023</SelectItem>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2026">2026</SelectItem>
                              <SelectItem value="2027">2027</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The year for which this compliance task applies
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
                          <FormDescription>
                            When the compliance period begins
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={revenueTaskForm.control}
                      name="complianceEndDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date (Auto-calculated)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                  disabled // End date is auto-calculated
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Auto-calculated</span>
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
                            Automatically calculated based on frequency and start date
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={revenueTaskForm.control}
                    name="complianceDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration Coverage</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration coverage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Full">Full Duration</SelectItem>
                            <SelectItem value="Partial">Partial Duration</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Whether this task covers the full compliance period or only part of it
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
                            Enable Automatic Task Generation
                          </FormLabel>
                          <FormDescription>
                            Automatically generate tasks based on the compliance frequency
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="invoice" className="space-y-4 pt-4">
                  <FormField
                    control={revenueTaskForm.control}
                    name="currency"
                    render={({ field }) => {
                      // Auto-populate currency based on selected service
                      const selectedServiceId = revenueTaskForm.watch("serviceId");
                      const selectedService = entityServices.find(
                        (service) => service.id.toString() === selectedServiceId
                      );
                      
                      // Use a default USD currency for now
                      // In a real scenario, we would use the currency code from the entity's country
                      if (!field.value && selectedService) {
                        setTimeout(() => {
                          revenueTaskForm.setValue("currency", "USD");
                        }, 0);
                      }
                      
                      return (
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
                                currencies.map((currency: any) => (
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
                      );
                    }}
                  />
                  
                  <FormField
                    control={revenueTaskForm.control}
                    name="serviceRate"
                    render={({ field }) => {
                      // Auto-populate service rate based on selected service
                      const selectedServiceId = revenueTaskForm.watch("serviceId");
                      const selectedService = entityServices.find(
                        (service) => service.id.toString() === selectedServiceId
                      );
                      
                      // If rate hasn't been set yet and we have a service with rate, set it
                      if (!field.value && selectedService?.rate) {
                        setTimeout(() => {
                          revenueTaskForm.setValue("serviceRate", selectedService.rate);
                        }, 0);
                      }
                      
                      return (
                        <FormItem>
                          <FormLabel>Service Rate</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00"
                              value={field.value !== undefined ? field.value : ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-populated from selected service type, but can be modified for this task
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </TabsContent>
                
                <DialogFooter className="pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    disabled={createRevenueTaskMutation.isPending}
                  >
                    Cancel
                  </Button>
                  {activeTab === "basic" && (
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
                  )}
                </DialogFooter>
              </form>
            </Form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}