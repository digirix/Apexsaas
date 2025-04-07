import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Task, User, TaskStatus } from "@shared/schema";
import { 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  CalendarClock, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTaskModal } from "./add-task-modal";

export function TaskList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskType, setTaskType] = useState<"admin" | "revenue">("admin");
  
  // Fetch tasks with proper filters
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/v1/tasks"],
  });

  // Fetch users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/v1/users"],
  });

  // Fetch task statuses
  const { data: taskStatuses = [], isLoading: isLoadingStatuses } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });

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
            <Button variant="outline" size="sm">
              <Filter className="-ml-1 mr-2 h-5 w-5 text-slate-500" />
              Filter
            </Button>
            <Button size="sm" onClick={() => {
              setTaskType("admin");
              setIsAddTaskModalOpen(true);
            }}>
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add Task
            </Button>
          </div>
        </div>
      </div>
      
      {/* Search and filter row */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="w-full md:w-[200px]">
          <Select
            value={statusFilter || ""}
            onValueChange={(value) => setStatusFilter(value || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {taskStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Task tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          <TabsTrigger value="admin">Administrative</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Task list */}
      <div className="space-y-4">
        {isLoadingTasks ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white shadow rounded-md">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <ClipboardIcon className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks found</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md text-center">
                You don't have any tasks yet. Create your first task to get started.
              </p>
              <div className="flex space-x-4">
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
              </div>
            </div>
          </div>
        ) : (
          <>
            {tasks.map((task) => {
              // Find status name
              const status = taskStatuses.find(s => s.id === task.statusId);
              const statusName = status ? status.name : "Unknown";
              
              // Find assignee name
              const assignee = users.find(u => u.id === task.assigneeId);
              const assigneeName = assignee ? assignee.displayName : "Unassigned";
              
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
              
              return (
                <TaskCard
                  key={task.id}
                  title={task.taskDetails || `Task #${task.id}`}
                  client={task.clientId ? "Client Name" : ""} // Will need client lookup
                  entity={task.entityId ? "Entity Name" : ""} // Will need entity lookup
                  dueDate={task.dueDate.toString()}
                  status={statusName}
                  assignee={assigneeName}
                  priority={priority}
                  isAdmin={task.isAdmin}
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
    </>
  );
}

interface TaskCardProps {
  title: string;
  client: string;
  entity: string;
  dueDate: string;
  status: string;
  assignee: string;
  priority: "low" | "medium" | "high";
  isAdmin: boolean;
}

function TaskCard({ 
  title, 
  client, 
  entity, 
  dueDate, 
  status, 
  assignee, 
  priority,
  isAdmin 
}: TaskCardProps) {
  const formattedDueDate = new Date(dueDate).toLocaleDateString();
  const isOverdue = status === "Overdue";
  const isPending = ["New", "In Progress", "Under Review"].includes(status);
  const isCompleted = status === "Completed";
  
  let statusColor = "";
  if (isOverdue) statusColor = "bg-red-100 text-red-800";
  else if (isPending) statusColor = "bg-blue-100 text-blue-800";
  else if (isCompleted) statusColor = "bg-green-100 text-green-800";
  
  let priorityColor = "";
  if (priority === "high") priorityColor = "bg-red-100 border-red-400";
  else if (priority === "medium") priorityColor = "bg-amber-100 border-amber-400";
  else priorityColor = "bg-green-100 border-green-400";
  
  return (
    <Card className={`border-l-4 ${priorityColor}`}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-base font-medium text-slate-900">{title}</h3>
              <Badge variant="secondary" className={statusColor}>
                {status}
              </Badge>
              {isAdmin && (
                <Badge variant="outline" className="bg-slate-100">
                  Administrative
                </Badge>
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>Assignee: {assignee}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              View Details
            </Button>
            {isPending && (
              <Button size="sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
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
