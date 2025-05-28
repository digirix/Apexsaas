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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CalendarIcon, 
  Loader2, 
  PlusCircle, 
  Minimize2, 
  Maximize2, 
  X, 
  MessageSquare, 
  Timer,
  FileText,
  Users,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { TaskChat } from "./task-chat";
import { TaskTimeTracking } from "./task-time-tracking";

interface ModernAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskType: "admin" | "revenue";
  preselectedClientId?: string;
  editingTask?: any; // For editing existing tasks
}

export function ModernAddTaskModal({ 
  isOpen, 
  onClose, 
  taskType, 
  preselectedClientId,
  editingTask
}: ModernAddTaskModalProps) {
  const { toast } = useToast();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);

  // Form schema
  const formSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    taskDetails: z.string().optional(),
    taskType: z.string().min(1, "Task type is required"),
    taskCategoryId: z.string().optional(),
    clientId: z.string().optional(),
    entityId: z.string().optional(),
    serviceTypeId: z.string().optional(),
    assigneeId: z.string().min(1, "Assignee is required"),
    statusId: z.string().min(1, "Status is required"),
    dueDate: z.date().optional(),
    isRecurring: z.boolean().default(false),
    complianceFrequency: z.string().optional(),
    serviceRate: z.string().optional(),
    currency: z.string().optional(),
    isAdmin: z.boolean().default(taskType === "admin"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editingTask?.title || "",
      taskDetails: editingTask?.taskDetails || "",
      taskType: editingTask?.taskType || (taskType === "admin" ? "Administrative" : "Client Work"),
      taskCategoryId: editingTask?.taskCategoryId?.toString() || "",
      clientId: editingTask?.clientId?.toString() || preselectedClientId || "",
      entityId: editingTask?.entityId?.toString() || "",
      serviceTypeId: editingTask?.serviceTypeId?.toString() || "",
      assigneeId: editingTask?.assigneeId?.toString() || "",
      statusId: editingTask?.statusId?.toString() || "",
      dueDate: editingTask?.dueDate ? new Date(editingTask.dueDate) : undefined,
      isRecurring: editingTask?.isRecurring || false,
      complianceFrequency: editingTask?.complianceFrequency || "",
      serviceRate: editingTask?.serviceRate?.toString() || "",
      currency: editingTask?.currency || "",
      isAdmin: taskType === "admin",
    },
  });

  // Data queries
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/v1/clients"],
    enabled: isOpen,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/v1/users"],
    enabled: isOpen,
  });

  const { data: taskStatuses = [] } = useQuery({
    queryKey: ["/api/v1/setup/task-statuses"],
    enabled: isOpen,
  });

  const { data: taskCategories = [] } = useQuery({
    queryKey: ["/api/v1/setup/task-categories"],
    enabled: isOpen,
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["/api/v1/setup/service-types"],
    enabled: isOpen,
  });

  const selectedClientId = form.watch("clientId");
  const { data: entities = [] } = useQuery({
    queryKey: ["/api/v1/clients", selectedClientId, "entities"],
    enabled: isOpen && !!selectedClientId,
  });

  // Create/Update task mutation
  const taskMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingTask 
        ? `/api/v1/tasks/${editingTask.id}`
        : "/api/v1/tasks";
      const method = editingTask ? "PUT" : "POST";
      
      return apiRequest(url, { method, body: data });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      
      if (!editingTask && result?.task?.id) {
        setCreatedTaskId(result.task.id);
        setActiveTab("chat");
      }
      
      toast({
        title: editingTask ? "Task Updated" : "Task Created",
        description: editingTask 
          ? "The task has been updated successfully." 
          : "The task has been created successfully.",
      });
      
      if (editingTask) {
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingTask ? 'update' : 'create'} task`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const submitData = {
      ...data,
      taskCategoryId: data.taskCategoryId ? parseInt(data.taskCategoryId) : null,
      clientId: data.clientId ? parseInt(data.clientId) : null,
      entityId: data.entityId ? parseInt(data.entityId) : null,
      serviceTypeId: data.serviceTypeId ? parseInt(data.serviceTypeId) : null,
      assigneeId: parseInt(data.assigneeId),
      statusId: parseInt(data.statusId),
      serviceRate: data.serviceRate ? parseFloat(data.serviceRate) : null,
    };

    taskMutation.mutate(submitData);
  };

  const handleClose = () => {
    if (taskMutation.isPending) return;
    form.reset();
    setCreatedTaskId(null);
    setActiveTab("details");
    setIsMinimized(false);
    setIsMaximized(false);
    onClose();
  };

  const taskId = editingTask?.id || createdTaskId;
  const canShowChatAndTime = !!taskId;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`
          ${isMaximized 
            ? 'max-w-[95vw] max-h-[95vh] w-full h-full' 
            : 'max-w-5xl max-h-[85vh]'
          } 
          ${isMinimized ? 'h-16' : ''} 
          p-0 gap-0 bg-background border shadow-2xl transition-all duration-200
        `}
      >
        {/* Modern Window Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {editingTask ? "Edit Task" : "Create New Task"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {taskType === "admin" ? "Administrative Task" : "Revenue Task"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        {!isMinimized && (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-4 pt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Task Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="chat" 
                    className="flex items-center gap-2"
                    disabled={!canShowChatAndTime}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Discussion
                    {!canShowChatAndTime && (
                      <Badge variant="secondary" className="text-xs">Save first</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="time" 
                    className="flex items-center gap-2"
                    disabled={!canShowChatAndTime}
                  >
                    <Timer className="h-4 w-4" />
                    Time Tracking
                    {!canShowChatAndTime && (
                      <Badge variant="secondary" className="text-xs">Save first</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden px-4 pb-4">
                <TabsContent value="details" className="h-full">
                  <ScrollArea className="h-full pr-4">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Card>
                          <CardHeader className="pb-3">
                            <h3 className="font-medium flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Basic Information
                            </h3>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Task Title *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter task title" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="taskDetails"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Describe the task details..."
                                      rows={3}
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="taskType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Task Type *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select task type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="Administrative">Administrative</SelectItem>
                                        <SelectItem value="Client Work">Client Work</SelectItem>
                                        <SelectItem value="Tax Preparation">Tax Preparation</SelectItem>
                                        <SelectItem value="Audit">Audit</SelectItem>
                                        <SelectItem value="Bookkeeping">Bookkeeping</SelectItem>
                                        <SelectItem value="Consultation">Consultation</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="taskCategoryId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {taskCategories.map((category: TaskCategory) => (
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
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <h3 className="font-medium flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Assignment & Client Details
                            </h3>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="assigneeId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Assignee *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select assignee" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {users.map((user: User) => (
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
                                control={form.control}
                                name="statusId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Status *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {taskStatuses.map((status: TaskStatus) => (
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

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Client</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select client" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {clients.map((client: Client) => (
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
                                control={form.control}
                                name="entityId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Entity</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select entity" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {entities.map((entity: Entity) => (
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
                                          variant="outline"
                                          className="w-full pl-3 text-left font-normal"
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
                          </CardContent>
                        </Card>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            type="submit" 
                            disabled={taskMutation.isPending}
                            className="flex-1"
                          >
                            {taskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingTask ? "Update Task" : "Create Task"}
                          </Button>
                          <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="chat" className="h-full">
                  {canShowChatAndTime ? (
                    <TaskChat taskId={taskId} users={users} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Save the task first to enable discussion</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="time" className="h-full">
                  {canShowChatAndTime ? (
                    <TaskTimeTracking taskId={taskId} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Save the task first to enable time tracking</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}