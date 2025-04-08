// Import necessary components and hooks
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, addYears, addQuarters } from "date-fns";

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
  currency: z.string().optional(),
  complianceFrequency: z.string().optional(),
  complianceDuration: z.string().optional(),
  complianceStartDate: z.date().optional(),
  complianceEndDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
});

interface TaskDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
}

type AdminTaskFormValues = z.infer<typeof adminTaskSchema>;
type RevenueTaskFormValues = z.infer<typeof revenueTaskSchema>;

export function TaskDetails({ isOpen, onClose, taskId }: TaskDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
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
      currency: "USD",
      complianceFrequency: undefined,
      complianceDuration: undefined,
      complianceStartDate: undefined,
      complianceEndDate: undefined,
      isRecurring: false,
    },
  });
  
  // Update form values when task data is loaded
  useEffect(() => {
    if (task && isEditing) {
      if (task.isAdmin) {
        adminTaskForm.reset({
          taskDetails: task.taskDetails,
          assigneeId: task.assigneeId?.toString(),
          statusId: task.statusId?.toString(),
          dueDate: new Date(task.dueDate),
          categoryId: task.categoryId?.toString(),
          taskType: task.taskType,
          notes: task.notes || "",
        });
      } else {
        revenueTaskForm.reset({
          taskDetails: task.taskDetails,
          assigneeId: task.assigneeId?.toString(),
          statusId: task.statusId?.toString(),
          dueDate: new Date(task.dueDate),
          categoryId: task.categoryId?.toString(),
          taskType: task.taskType,
          notes: task.notes || "",
          clientId: task.clientId?.toString(),
          entityId: task.entityId?.toString(),
          serviceRate: task.serviceRate || 0,
          currency: task.currency || "USD",
          complianceFrequency: task.complianceFrequency,
          complianceDuration: task.complianceDuration,
          complianceStartDate: task.complianceStartDate ? new Date(task.complianceStartDate) : undefined,
          complianceEndDate: task.complianceEndDate ? new Date(task.complianceEndDate) : undefined,
          isRecurring: task.isRecurring || false,
        });
      }
    }
  }, [task, isEditing, adminTaskForm, revenueTaskForm]);
  
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
          
          switch (frequency) {
            case "5 Years":
              endDate = addYears(startDate, 5);
              break;
            case "4 Years":
              endDate = addYears(startDate, 4);
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
            default: // "One Time"
              endDate = startDate;
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
      
      const payload = {
        taskDetails: data.taskDetails,
        assigneeId: parseInt(data.assigneeId),
        statusId: parseInt(data.statusId),
        dueDate: data.dueDate.toISOString(),
        categoryId: parseInt(data.categoryId),
        taskType: data.taskType,
        notes: data.notes || null,
        isAdmin: true,
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
      
      const payload = {
        taskDetails: data.taskDetails,
        assigneeId: parseInt(data.assigneeId),
        statusId: parseInt(data.statusId),
        dueDate: data.dueDate.toISOString(),
        categoryId: parseInt(data.categoryId),
        taskType: data.taskType,
        notes: data.notes || null,
        isAdmin: false,
        clientId: parseInt(data.clientId),
        entityId: parseInt(data.entityId),
        serviceRate: data.serviceRate,
        currency: data.currency,
        complianceFrequency: data.complianceFrequency,
        complianceDuration: data.complianceDuration,
        complianceStartDate: data.complianceStartDate?.toISOString(),
        complianceEndDate: data.complianceEndDate?.toISOString(),
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
  
  // Handle admin task form submission
  function onAdminTaskSubmit(data: AdminTaskFormValues) {
    updateAdminTaskMutation.mutate(data);
  }
  
  // Handle revenue task form submission
  function onRevenueTaskSubmit(data: RevenueTaskFormValues) {
    updateRevenueTaskMutation.mutate(data);
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
                      
                      <Badge variant={
                        taskStatus?.rank === 3 ? "success" : 
                        new Date(task.dueDate) < new Date() ? "destructive" : 
                        "secondary"
                      }>
                        {taskStatus?.name || "Unknown Status"}
                      </Badge>
                      
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
                          <FormField
                            control={revenueTaskForm.control}
                            name="currency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Currency</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="E.g., USD, EUR, GBP"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  The currency for invoicing this task
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
                                    step="0.01"
                                    placeholder="Enter service rate"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  The rate to be charged for this service
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
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
              <DialogFooter>
                {/* Complete button (only for tasks not already completed) */}
                {taskStatus?.rank !== 3 && (
                  <Button 
                    variant="default" 
                    onClick={() => completeTaskMutation.mutate()}
                    disabled={completeTaskMutation.isPending}
                  >
                    {completeTaskMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Mark as Completed
                  </Button>
                )}
                
                {/* Edit button */}
                <Button onClick={() => setIsEditing(true)}>
                  Edit Task
                </Button>
                
                {/* Close button */}
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}