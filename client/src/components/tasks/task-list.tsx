import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, User, TaskStatus, Client, Entity, TaskCategory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  CalendarClock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FilterX,
  X,
  UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AddTaskModal } from "./add-task-modal";
import { TaskDetails } from "./task-details";

export function TaskList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskTabFilter, setTaskTabFilter] = useState("all");
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [taskType, setTaskType] = useState<"admin" | "revenue">("admin");
  const [showFilters, setShowFilters] = useState(false);
  
  // Get current user for "My Tasks" tab
  const { data: currentUser } = useQuery<{ id: number }>({
    queryKey: ["/api/v1/auth/me"],
    select: (data) => data || { id: 0 }
  });

  // Fetch tasks with proper filters
  const { data: tasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["/api/v1/tasks", { 
      status: statusFilter,
      assignee: assigneeFilter,
      category: categoryFilter,
      search: searchTerm.length > 2 ? searchTerm : undefined
    }],
  });

  // Fetch users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/v1/users"],
  });

  // Fetch task statuses
  const { data: taskStatuses = [], isLoading: isLoadingStatuses } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });
  
  // Fetch admin task categories
  const { data: adminTaskCategories = [] } = useQuery<TaskCategory[]>({
    queryKey: ["/api/v1/setup/task-categories", { isAdmin: true }],
  });
  
  // Fetch revenue task categories
  const { data: revenueTaskCategories = [] } = useQuery<TaskCategory[]>({
    queryKey: ["/api/v1/setup/task-categories", { isAdmin: false }],
  });
  
  // Fetch clients for lookup
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/v1/clients"],
  });
  
  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
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
      toast({
        title: "Task Completed",
        description: "The task has been marked as completed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter tasks based on tab selection
  const filteredTasks = tasks.filter(task => {
    const isCompleted = task.statusId === taskStatuses.find(s => s.rank === 3)?.id;
    
    switch (taskTabFilter) {
      case "my":
        return currentUser?.id === task.assigneeId;
      case "admin":
        return task.isAdmin;
      case "revenue":
        return !task.isAdmin;
      case "upcoming":
        return !isCompleted && new Date(task.dueDate) > new Date();
      case "completed":
        return isCompleted;
      default:
        return true;
    }
  });
  
  // Reset all filters
  const resetFilters = () => {
    setStatusFilter(null);
    setAssigneeFilter(null);
    setCategoryFilter(null);
    setSearchTerm("");
    setTaskTabFilter("all");
  };
  
  // Handle task details view
  const handleViewTaskDetails = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailsOpen(true);
  };
  
  // Handle task completion
  const handleCompleteTask = (taskId: number) => {
    completeTaskMutation.mutate(taskId);
  };
  
  // Find all task categories
  const allTaskCategories = [...adminTaskCategories, ...revenueTaskCategories];
  
  // Find all entities
  const [entities, setEntities] = useState<Entity[]>([]);
  
  // Fetch all entities for client lookup
  useEffect(() => {
    async function fetchEntities() {
      try {
        const clientPromises = clients.map(client => 
          fetch(`/api/v1/clients/${client.id}/entities`)
            .then(res => res.json())
            .then(data => data)
            .catch(() => [])
        );
        
        const entityResults = await Promise.all(clientPromises);
        const allEntities = entityResults.flat();
        setEntities(allEntities);
      } catch (error) {
        console.error("Error fetching entities:", error);
      }
    }
    
    if (clients.length > 0) {
      fetchEntities();
    }
  }, [clients]);

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Task Management</h2>
            <p className="text-sm text-slate-500">
              Manage and track administrative and revenue tasks
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              variant={showFilters ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? (
                <FilterX className="-ml-1 mr-2 h-5 w-5" />
              ) : (
                <Filter className="-ml-1 mr-2 h-5 w-5 text-slate-500" />
              )}
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Add Task
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setTaskType("admin");
                  setIsAddTaskModalOpen(true);
                }}>
                  Administrative Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setTaskType("revenue");
                  setIsAddTaskModalOpen(true);
                }}>
                  Revenue Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Search and filter row */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button 
              variant="ghost" 
              className="absolute right-2 h-7 w-7 px-0" 
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select
                value={statusFilter || "all"}
                onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {taskStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select
                value={assigneeFilter || "all"}
                onValueChange={(value) => setAssigneeFilter(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select
                value={categoryFilter || "all"}
                onValueChange={(value) => setCategoryFilter(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allTaskCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name} {category.isAdmin ? "(Admin)" : "(Revenue)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        {(statusFilter || assigneeFilter || categoryFilter || searchTerm) && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <FilterX className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>
      
      {/* Task tabs */}
      <Tabs 
        defaultValue="all" 
        value={taskTabFilter} 
        onValueChange={setTaskTabFilter} 
        className="mb-6"
      >
        <TabsList className="grid grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          <TabsTrigger value="admin">Administrative</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Task list */}
      <div className="space-y-4">
        {isLoadingTasks ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white shadow rounded-md">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <ClipboardIcon className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks found</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md text-center">
                {(statusFilter || assigneeFilter || categoryFilter || searchTerm) ? (
                  "No tasks match your current filter criteria. Try adjusting your filters."
                ) : (
                  "You don't have any tasks yet. Create your first task to get started."
                )}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {(statusFilter || assigneeFilter || categoryFilter || searchTerm) ? (
                  <Button variant="outline" onClick={resetFilters}>
                    <FilterX className="-ml-1 mr-2 h-5 w-5" />
                    Clear Filters
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => {
                      setTaskType("admin");
                      setIsAddTaskModalOpen(true);
                    }}>
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Admin Task
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setTaskType("revenue");
                      setIsAddTaskModalOpen(true);
                    }}>
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Revenue Task
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {filteredTasks.map((task) => {
              // Find status name
              const status = taskStatuses.find(s => s.id === task.statusId);
              const statusName = status ? status.name : "Unknown";
              
              // Find assignee name
              const assignee = users.find(u => u.id === task.assigneeId);
              const assigneeName = assignee ? assignee.displayName : "Unassigned";
              
              // Find client name
              const clientName = task.clientId 
                ? clients.find(c => c.id === task.clientId)?.displayName || "Unknown Client" 
                : "";
              
              // Find entity name
              const entityName = task.entityId 
                ? entities.find(e => e.id === task.entityId)?.name || "Unknown Entity" 
                : "";
              
              // Determine priority based on task type
              let priority: "low" | "medium" | "high";
              switch (task.taskType) {
                case "Regular":
                  priority = "low";
                  break;
                case "Medium":
                  priority = "medium";
                  break;
                case "Urgent":
                  priority = "high";
                  break;
                default:
                  priority = "medium";
              }
              
              // Check if task is completed
              const isCompleted = status?.rank === 3;
              
              return (
                <TaskCard
                  key={task.id}
                  taskId={task.id}
                  title={task.taskDetails || `Task #${task.id}`}
                  client={clientName}
                  entity={entityName}
                  dueDate={task.dueDate.toString()}
                  status={statusName}
                  statusRank={status?.rank || 0}
                  assignee={assigneeName}
                  priority={priority}
                  isAdmin={task.isAdmin}
                  onViewDetails={() => handleViewTaskDetails(task.id)}
                  onComplete={() => handleCompleteTask(task.id)}
                  isCompletingTask={completeTaskMutation.isPending}
                />
              );
            })}
          </>
        )}
      </div>
      
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        taskType={taskType}
      />
      
      <TaskDetails
        isOpen={isTaskDetailsOpen}
        onClose={() => setIsTaskDetailsOpen(false)}
        taskId={selectedTaskId}
      />
    </>
  );
}

interface TaskCardProps {
  taskId: number;
  title: string;
  client: string;
  entity: string;
  dueDate: string;
  status: string;
  statusRank: number;
  assignee: string;
  priority: "low" | "medium" | "high";
  isAdmin: boolean;
  onViewDetails: () => void;
  onComplete: () => void;
  isCompletingTask: boolean;
}

// Import the TaskStatusWorkflow component
import { TaskStatusWorkflow } from "./task-status-workflow";

function TaskCard({ 
  taskId,
  title, 
  client, 
  entity, 
  dueDate, 
  status, 
  statusRank,
  assignee, 
  priority,
  isAdmin,
  onViewDetails,
  onComplete,
  isCompletingTask
}: TaskCardProps) {
  const formattedDueDate = new Date(dueDate).toLocaleDateString();
  const isOverdue = new Date(dueDate) < new Date() && statusRank !== 3;
  const isPending = statusRank < 3;
  const isCompleted = statusRank === 3;
  
  let priorityColor = "";
  if (priority === "high") priorityColor = "bg-red-100 border-red-400";
  else if (priority === "medium") priorityColor = "bg-amber-100 border-amber-400";
  else priorityColor = "bg-green-100 border-green-400";
  
  return (
    <Card className={`border-l-4 ${priorityColor}`}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-3 mb-2">
              <h3 className="text-base font-medium text-slate-900 line-clamp-1">{title}</h3>
              
              {/* Use TaskStatusWorkflow with proper status ID (not rank) */}
              <Badge className={`${
                  statusRank === 1 ? "bg-blue-100 text-blue-700" :
                  Math.floor(statusRank) === 2 ? "bg-yellow-100 text-yellow-700" :
                  statusRank === 3 ? "bg-green-100 text-green-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                {status}
              </Badge>
              
              {isAdmin && (
                <Badge variant="outline" className="bg-slate-100">
                  Administrative
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>
            
            {!isAdmin && client && (
              <div className="text-sm text-slate-500 mb-3">
                {client} {entity && `• ${entity}`}
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <div className="flex items-center">
                <CalendarClock className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>Due: {formattedDueDate}</span>
              </div>
              
              <div className="flex items-center">
                <UserCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>Assignee: {assignee}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
            
            {/* Use Button for status change */}
            {isPending && (
              <Button
                variant="default"
                size="sm"
                onClick={onComplete}
              >
                Update Status
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}
