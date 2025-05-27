import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, User, TaskStatus, Client, Entity, TaskCategory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  X,
  UserCircle,
  ChevronDown,
  FileText,
  Grid3X3,
  List,
  Kanban,
  Settings2,
  Eye,
  MoreHorizontal,
  Building2,
  Filter,
  Grip
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddTaskModal } from "./add-task-modal";
import { TaskDetails } from "./task-details";
import { useModulePermissions } from "@/hooks/use-permissions";

type ViewMode = 'table' | 'cards' | 'kanban';

// Draggable Task Card Component for Kanban
interface DraggableTaskCardProps {
  task: Task;
  clients: Client[];
  users: User[];
  onViewDetails: (taskId: number) => void;
  onSelect: (taskId: number, selected: boolean) => void;
  isSelected: boolean;
  isOverdue: boolean;
}

function DraggableTaskCard({ 
  task, 
  clients, 
  users, 
  onViewDetails, 
  onSelect, 
  isSelected, 
  isOverdue 
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const client = clients.find(c => c.id === task.clientId);
  const assignee = users.find(u => u.id === task.assigneeId);

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays <= 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`group cursor-pointer transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-105 shadow-xl' : 'hover:shadow-md'
      } ${isOverdue ? 'border-red-200 bg-red-50' : 'bg-white'} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onViewDetails(task.id)}
    >
      <CardContent className="p-2">
        <div className="flex items-start justify-between mb-1">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <Grip className="h-3 w-3 text-gray-400 hover:text-gray-600" />
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(task.id, checked as boolean)}
              className="h-3 w-3"
            />
          </div>
        </div>
        
        <h4 className="text-xs font-medium text-slate-900 line-clamp-2 mb-1">
          {task.taskDetails || 'Untitled Task'}
        </h4>
        
        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
          <span className="truncate text-xs">{client?.displayName || 'Unknown'}</span>
          <Badge className={`text-xs px-1 py-0 ${getTaskPriorityColor(task.taskType || 'Regular')}`}>
            {(task.taskType || 'Regular').charAt(0)}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <Avatar className="h-3 w-3">
              <AvatarFallback className="text-xs">
                {assignee?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs">{assignee?.displayName || 'Unassigned'}</span>
          </div>
          
          <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
            {formatDueDate(task.dueDate)}
          </div>
        </div>
        
        {isOverdue && (
          <div className="mt-1 flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-600 font-medium">Overdue</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Droppable Zone Component for Kanban Columns
function DroppableColumn({ 
  id, 
  children, 
  className 
}: { 
  id: string; 
  children: React.ReactNode; 
  className?: string; 
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'bg-blue-50 border-blue-200' : ''}`}
    >
      {children}
    </div>
  );
}

export function TaskList() {
  const { toast } = useToast();
  
  // Minimal state management
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // UI state
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [taskType, setTaskType] = useState<"admin" | "revenue">("admin");
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get permissions and data
  const permissions = useModulePermissions("tasks");
  
  const { data: currentUser } = useQuery<{ id: number }>({
    queryKey: ["/api/v1/auth/me"],
    select: (data) => data || { id: 0 }
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/v1/tasks"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/v1/users"],
  });

  const { data: taskStatuses = [] } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });
  
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/v1/clients"],
  });

  // Fetch task status workflow rules to respect user configuration
  const { data: workflowRules = [] } = useQuery({
    queryKey: ["/api/v1/setup/task-status-workflow-rules"],
  });

  // Drag and drop handlers
  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: number; statusId: number }) =>
      apiRequest('PUT', `/api/v1/tasks/${taskId}`, { statusId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      toast({
        title: "Task Updated",
        description: "Task status updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as number;
    const newStatusId = parseInt(over.id as string);
    
    const task = tasks.find(t => t.id === taskId);
    if (task && task.statusId !== newStatusId) {
      // Check workflow rules to see if this status change is allowed
      const rule = workflowRules.find((r: any) => 
        r.fromStatusId === task.statusId && r.toStatusId === newStatusId
      );
      
      // If there's a rule and it's not allowed, show error
      if (rule && !rule.isAllowed) {
        toast({
          title: "Status Change Not Allowed",
          description: "This status transition is restricted by your workflow rules.",
          variant: "destructive",
        });
        return;
      }
      
      updateTaskStatus.mutate({ taskId, statusId: newStatusId });
    }
  }, [tasks, updateTaskStatus, workflowRules, toast]);

  // Filtering and sorting
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const now = new Date();
      const taskDueDate = new Date(task.dueDate);
      // Find the highest ranked status (completed status)
      const highestRankStatus = taskStatuses.reduce((highest, current) => 
        current.rank > (highest?.rank || 0) ? current : highest, null as TaskStatus | null);
      const isOverdue = taskDueDate < now && task.statusId !== highestRankStatus?.id;
      const isCompleted = task.statusId === highestRankStatus?.id;
      const isMyTask = task.assigneeId === currentUser?.id;

      // Quick filters
      switch (quickFilter) {
        case 'my': return isMyTask;
        case 'overdue': return isOverdue;
        case 'today': return taskDueDate.toDateString() === now.toDateString();
        case 'completed': return isCompleted;
        case 'pending': return !isCompleted;
        case 'high': return task.taskType === 'Urgent';
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const taskMatches = task.taskDetails?.toLowerCase().includes(searchLower);
        const clientName = clients.find(c => c.id === task.clientId)?.displayName?.toLowerCase();
        const assigneeName = users.find(u => u.id === task.assigneeId)?.displayName?.toLowerCase();
        
        if (!taskMatches && !clientName?.includes(searchLower) && !assigneeName?.includes(searchLower)) {
          return false;
        }
      }

      // Advanced filters
      if (statusFilter !== 'all' && task.statusId !== parseInt(statusFilter)) return false;
      if (assigneeFilter !== 'all' && task.assigneeId !== parseInt(assigneeFilter)) return false;
      if (clientFilter !== 'all' && task.clientId !== parseInt(clientFilter)) return false;
      if (priorityFilter !== 'all' && task.taskType !== priorityFilter) return false;

      return true;
    });
  }, [tasks, quickFilter, searchTerm, statusFilter, assigneeFilter, clientFilter, priorityFilter, taskStatuses, users, clients, currentUser]);

  // Task metrics using user-defined statuses
  const taskMetrics = useMemo(() => {
    const now = new Date();
    const highestRankStatus = taskStatuses.reduce((highest, current) => 
      current.rank > (highest?.rank || 0) ? current : highest, null as TaskStatus | null);
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.statusId !== highestRankStatus?.id).length,
      completed: tasks.filter(t => t.statusId === highestRankStatus?.id).length,
      overdue: tasks.filter(t => new Date(t.dueDate) < now && t.statusId !== highestRankStatus?.id).length,
      dueToday: tasks.filter(t => new Date(t.dueDate).toDateString() === now.toDateString()).length,
      highPriority: tasks.filter(t => t.taskType === 'Urgent' && t.statusId !== highestRankStatus?.id).length,
      myTasks: tasks.filter(t => t.assigneeId === currentUser?.id && t.statusId !== highestRankStatus?.id).length,
    };
  }, [tasks, taskStatuses, currentUser]);

  // Helper functions
  const getTaskPriorityColor = (taskType: string) => {
    switch (taskType) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Regular': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusColor = (statusId: number) => {
    const status = taskStatuses.find(s => s.id === statusId);
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.rank) {
      case 1: return 'bg-gray-100 text-gray-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isTaskOverdue = (task: Task) => {
    const completedStatusId = taskStatuses.find(s => s.rank === 3)?.id;
    return new Date(task.dueDate) < new Date() && task.statusId !== completedStatusId;
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays <= 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Action handlers
  const handleTaskSelect = (taskId: number, selected: boolean) => {
    if (selected) {
      setSelectedTaskIds(prev => [...prev, taskId]);
    } else {
      setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleViewTaskDetails = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailsOpen(true);
  };

  const handleBulkStatusChange = async (statusId: number) => {
    try {
      const promises = selectedTaskIds.map(taskId =>
        apiRequest('PUT', `/api/v1/tasks/${taskId}`, { statusId })
      );
      
      await Promise.all(promises);
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      setSelectedTaskIds([]);
      
      toast({
        title: "Tasks Updated",
        description: `${selectedTaskIds.length} tasks updated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tasks. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
            <div className="text-sm text-slate-500">
              {filteredTasks.length} of {tasks.length}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Quick Filters */}
            <div className="flex items-center space-x-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'my', label: 'My Tasks' },
                { key: 'overdue', label: 'Overdue' },
                { key: 'today', label: 'Today' },
                { key: 'high', label: 'High Priority' },
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={quickFilter === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setQuickFilter(key)}
                  className="h-7 px-2 text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 w-48"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="absolute right-1 top-0.5 h-6 w-6 px-0" 
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="All Statuses" />
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
                    <label className="text-sm font-medium">Assignee</label>
                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="All Assignees" />
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
                    <label className="text-sm font-medium">Client</label>
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="All Clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="All Priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="High">High Priority</SelectItem>
                        <SelectItem value="Medium">Medium Priority</SelectItem>
                        <SelectItem value="Low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* View Mode */}
            <div className="flex items-center bg-slate-100 rounded p-0.5">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 px-2"
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="h-7 px-2"
              >
                <Grid3X3 className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-7 px-2"
              >
                <Kanban className="h-3 w-3" />
              </Button>
            </div>

            {/* Add Task */}
            {permissions?.canCreate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setTaskType("admin");
                    setIsAddTaskModalOpen(true);
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Admin Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setTaskType("revenue");
                    setIsAddTaskModalOpen(true);
                  }}>
                    Revenue Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                <span className="text-sm font-semibold text-slate-900">{taskMetrics.total}</span>
                <span className="text-xs text-slate-600">Total</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-semibold text-slate-900">{taskMetrics.pending}</span>
                <span className="text-xs text-slate-600">Pending</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-semibold text-slate-900">{taskMetrics.completed}</span>
                <span className="text-xs text-slate-600">Completed</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-semibold text-slate-900">{taskMetrics.overdue}</span>
                <span className="text-xs text-slate-600">Overdue</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-semibold text-slate-900">{taskMetrics.dueToday}</span>
                <span className="text-xs text-slate-600">Due Today</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-semibold text-slate-900">{taskMetrics.highPriority}</span>
                <span className="text-xs text-slate-600">High Priority</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-sm font-semibold text-slate-900">{taskMetrics.myTasks}</span>
                <span className="text-xs text-slate-600">My Tasks</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedTaskIds.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-blue-50 border-b border-blue-200">
            <span className="text-sm text-blue-700">
              {selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {taskStatuses.map(status => (
                    <DropdownMenuItem 
                      key={status.id}
                      onClick={() => handleBulkStatusChange(status.id)}
                    >
                      {status.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTaskIds([])}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Task Content */}
        <div className="flex-1 overflow-auto">
          {isLoadingTasks ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No tasks found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {tasks.length === 0 ? "Get started by creating your first task." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <>
              {/* Table View */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-8 px-3 py-2">
                          <Checkbox
                            checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTaskIds(filteredTasks.map(t => t.id));
                              } else {
                                setSelectedTaskIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">Task</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">Client</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">Assignee</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">Status</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">Priority</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">Due</th>
                        <th className="w-8 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredTasks.map((task) => {
                        const client = clients.find(c => c.id === task.clientId);
                        const assignee = users.find(u => u.id === task.assigneeId);
                        const status = taskStatuses.find(s => s.id === task.statusId);
                        const isOverdue = isTaskOverdue(task);
                        
                        return (
                          <tr 
                            key={task.id} 
                            className={`hover:bg-slate-50 cursor-pointer ${isOverdue ? 'bg-red-50' : ''}`}
                            onClick={() => handleViewTaskDetails(task.id)}
                          >
                            <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => handleTaskSelect(task.id, checked as boolean)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="max-w-xs">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {task.taskDetails || 'Untitled Task'}
                                </p>
                                {task.isAdmin && (
                                  <Badge variant="outline" className="text-xs mt-1">Admin</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-sm text-slate-900">
                                {client?.displayName || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-xs">
                                    {assignee?.displayName?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-slate-900">
                                  {assignee?.displayName || 'Unassigned'}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Badge className={getTaskStatusColor(task.statusId)}>
                                {status?.name || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Badge className={getTaskPriorityColor(task.priority || 'Medium')}>
                                {task.priority || 'Medium'}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-900'}`}>
                                {formatDueDate(task.dueDate)}
                              </div>
                            </td>
                            <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 px-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewTaskDetails(task.id)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cards View */}
              {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                  {filteredTasks.map((task) => {
                    const client = clients.find(c => c.id === task.clientId);
                    const assignee = users.find(u => u.id === task.assigneeId);
                    const status = taskStatuses.find(s => s.id === task.statusId);
                    const isOverdue = isTaskOverdue(task);
                    
                    return (
                      <Card 
                        key={task.id} 
                        className={`group hover:shadow-md transition-all duration-200 cursor-pointer ${
                          isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200'
                        }`}
                        onClick={() => handleViewTaskDetails(task.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-900 line-clamp-2 flex-1">
                              {task.taskDetails || 'Untitled Task'}
                            </h4>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => handleTaskSelect(task.id, checked as boolean)}
                                className="ml-2"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getTaskStatusColor(task.statusId)} className="text-xs">
                              {status?.name || 'Unknown'}
                            </Badge>
                            <Badge className={getTaskPriorityColor(task.priority || 'Medium')} className="text-xs">
                              {task.priority || 'Medium'}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-slate-600 mb-2">
                            <div className="flex items-center space-x-1 mb-1">
                              <Building2 className="h-3 w-3" />
                              <span>{client?.displayName || 'Unknown Client'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Avatar className="h-3 w-3">
                                <AvatarFallback className="text-xs">
                                  {assignee?.displayName?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span>{assignee?.displayName || 'Unassigned'}</span>
                            </div>
                          </div>
                          
                          <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                            {formatDueDate(task.dueDate)}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Kanban View with User-Defined Statuses */}
              {viewMode === 'kanban' && (
                <div className="flex gap-4 p-4 h-full overflow-x-auto">
                  {taskStatuses
                    .sort((a, b) => a.rank - b.rank)
                    .map((status) => {
                      const statusTasks = filteredTasks.filter(task => task.statusId === status.id);
                      
                      return (
                        <div 
                          key={status.id} 
                          className="flex-shrink-0 w-80 bg-slate-50 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-slate-900 flex items-center">
                              <Badge className={getTaskStatusColor(status.id)} variant="outline">
                                {status.name}
                              </Badge>
                              <span className="ml-2 text-slate-500">({statusTasks.length})</span>
                            </h3>
                          </div>
                          
                          <DroppableColumn
                            id={status.id.toString()}
                            className="space-y-2 min-h-32 transition-colors duration-200 rounded-lg border-2 border-transparent"
                          >
                            <SortableContext 
                              items={statusTasks.map(t => t.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div 
                                className="space-y-2"
                                style={{
                                  minHeight: '200px',
                                  paddingBottom: '8px'
                                }}
                              >
                                {statusTasks.map((task) => (
                                  <DraggableTaskCard
                                    key={task.id}
                                    task={task}
                                    clients={clients}
                                    users={users}
                                    onViewDetails={handleViewTaskDetails}
                                    onSelect={handleTaskSelect}
                                    isSelected={selectedTaskIds.includes(task.id)}
                                    isOverdue={isTaskOverdue(task)}
                                  />
                                ))}
                                
                                {statusTasks.length === 0 && (
                                  <div className="text-center py-8 text-slate-400">
                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-sm">No tasks</p>
                                  </div>
                                )}
                              </div>
                            </SortableContext>
                          </DroppableColumn>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="bg-white shadow-lg rounded-lg p-3 opacity-90">
            <p className="text-sm font-medium">
              {tasks.find(t => t.id === activeId)?.taskDetails || 'Task'}
            </p>
          </div>
        ) : null}
      </DragOverlay>

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        taskType={taskType}
      />

      {selectedTaskId && (
        <TaskDetails
          isOpen={isTaskDetailsOpen}
          onClose={() => {
            setIsTaskDetailsOpen(false);
            setSelectedTaskId(null);
          }}
          taskId={selectedTaskId}
        />
      )}
    </DndContext>
  );
}