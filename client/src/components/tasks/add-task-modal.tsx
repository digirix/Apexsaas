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
  
  // Create task mutation for admin tasks
  const createAdminTaskMutation = useMutation({
    mutationFn: async (data: AdminTaskFormValues) => {
      const payload = {
        ...data,
        isAdmin: true,
        assigneeId: parseInt(data.assigneeId),
        statusId: 1, // New status
      };

      // Include taskCategoryId only if it's provided
      if (data.taskCategoryId) {
        payload.taskCategoryId = data.taskCategoryId;
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
      };

      // Include taskCategoryId only if it's provided
      if (data.taskCategoryId) {
        payload.taskCategoryId = data.taskCategoryId;
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
                        // Entities are getting loaded incorrectly - entities is actually clients
                        
                        // Function to find the entity name based on the selected ID
                        const getEntityName = () => {
                          if (!field.value) return "Select entity";
                          if (!entities || entities.length === 0) return "Select entity";
                          // Entities are client objects that have displayName instead of name
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                  
                  <div className="mt-4">
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
                  
                  <div className="mt-4">
                    <FormField
                      control={revenueTaskForm.control}
                      name="taskDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Details</FormLabel>
                          <div className="flex justify-between items-center mb-2">
                            <div></div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                            >
                              Suggest Details using AI
                            </Button>
                          </div>
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
                  
                  <div className="mt-4">
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
                
                <TabsContent value="compliance">
                  {!revenueTaskForm.watch("serviceId") ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center justify-center">
                      <p className="text-slate-500 mb-4">Complete the Basic Information tab first</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("basic")}
                      >
                        Go to Basic Information
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={revenueTaskForm.control}
                          name="complianceFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Compliance Frequency</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Reset duration when frequency changes
                                  revenueTaskForm.setValue("complianceDuration", "");
                                }} 
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {revenueTaskForm.watch("complianceFrequency") && revenueTaskForm.watch("complianceFrequency") !== "One Time" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={revenueTaskForm.control}
                            name="complianceYear"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Year(s)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={
                                      ["5 Years", "4 Years", "3 Years", "2 Years"].includes(revenueTaskForm.watch("complianceFrequency") || "") 
                                        ? "e.g., 2023, 2024, 2025" 
                                        : "e.g., 2023"
                                    } 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  {["5 Years", "4 Years", "3 Years", "2 Years"].includes(revenueTaskForm.watch("complianceFrequency") || "") 
                                    ? "Enter multiple years separated by commas" 
                                    : "Enter the compliance year"}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={revenueTaskForm.control}
                            name="complianceDuration"
                            render={({ field }) => {
                              // Define available durations based on frequency
                              let durationOptions: { value: string, label: string }[] = [];
                              
                              switch(revenueTaskForm.watch("complianceFrequency")) {
                                case "Bi-Annually":
                                  durationOptions = [
                                    { value: "First Half", label: "First Half" },
                                    { value: "Second Half", label: "Second Half" }
                                  ];
                                  break;
                                case "Quarterly":
                                  durationOptions = [
                                    { value: "Q1", label: "Q1" },
                                    { value: "Q2", label: "Q2" },
                                    { value: "Q3", label: "Q3" },
                                    { value: "Q4", label: "Q4" }
                                  ];
                                  break;
                                case "Monthly":
                                  durationOptions = [
                                    { value: "Jan", label: "January" },
                                    { value: "Feb", label: "February" },
                                    { value: "Mar", label: "March" },
                                    { value: "Apr", label: "April" },
                                    { value: "May", label: "May" },
                                    { value: "Jun", label: "June" },
                                    { value: "Jul", label: "July" },
                                    { value: "Aug", label: "August" },
                                    { value: "Sep", label: "September" },
                                    { value: "Oct", label: "October" },
                                    { value: "Nov", label: "November" },
                                    { value: "Dec", label: "December" }
                                  ];
                                  break;
                                default:
                                  durationOptions = [{ value: "Full", label: "Full Year" }];
                              }
                              
                              return (
                                <FormItem>
                                  <FormLabel>Duration</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value || ""}
                                    disabled={!revenueTaskForm.watch("complianceFrequency") || revenueTaskForm.watch("complianceFrequency") === "One Time"}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select duration" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {durationOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={revenueTaskForm.control}
                          name="complianceStartDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Compliance Duration Start Date</FormLabel>
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
                                    selected={field.value || undefined}
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
                              <FormLabel>Compliance Duration End Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value || undefined}
                                    onSelect={field.onChange}
                                    disabled
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormDescription>
                                End date is automatically calculated based on frequency and start date
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
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Is this task recurring?
                              </FormLabel>
                              <FormDescription>
                                If selected, future task instances will be automatically scheduled
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter className="pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={onClose}
                          disabled={createRevenueTaskMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setActiveTab("invoice")}
                        >
                          Next: Invoice Information
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="invoice">
                  {!revenueTaskForm.watch("serviceId") ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center justify-center">
                      <p className="text-slate-500 mb-4">Complete the Basic Information tab first</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("basic")}
                      >
                        Go to Basic Information
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <SelectItem value="USD">USD - United States Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
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
                      </div>
                      
                      <DialogFooter className="pt-4">
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
                      </DialogFooter>
                    </div>
                  )}
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
