import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Client, User, TaskCategory, TaskStatus, Entity, ServiceType } from "@shared/schema";
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
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
const revenueTaskBasicSchema = z.object({
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
});

type RevenueTaskBasicFormValues = z.infer<typeof revenueTaskBasicSchema>;

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
  const revenueTaskForm = useForm<RevenueTaskBasicFormValues>({
    resolver: zodResolver(revenueTaskBasicSchema),
    defaultValues: {
      clientId: "",
      entityId: "",
      serviceId: "",
      taskCategoryId: "",
      taskType: "Regular",
      assigneeId: "",
      taskDetails: "",
      nextToDo: "",
    },
  });
  
  // Fetch clients (for revenue task)
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/v1/clients"],
    enabled: isOpen && taskType === "revenue",
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
    mutationFn: async (data: RevenueTaskBasicFormValues) => {
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
  
  function onRevenueTaskSubmit(data: RevenueTaskBasicFormValues) {
    createRevenueTaskMutation.mutate(data);
  }
  
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
                        defaultValue={field.value}
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
                        defaultValue={field.value}
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
                        defaultValue={field.value}
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
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
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
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={!revenueTaskForm.watch("clientId")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select entity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Sample Entity</SelectItem>
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
                      name="serviceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={!revenueTaskForm.watch("entityId")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Tax Filing</SelectItem>
                              <SelectItem value="2">Bookkeeping</SelectItem>
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
                          <FormLabel>Task Category (Optional)</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
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
                            defaultValue={field.value}
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
                            defaultValue={field.value}
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
                </TabsContent>
                
                <TabsContent value="invoice">
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
