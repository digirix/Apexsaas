import { useState, useEffect, useMemo } from "react";
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
  UserCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid3X3,
  List,
  Kanban,
  Calendar,
  BarChart3,
  Settings2,
  SortAsc,
  SortDesc,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Building2,
  DollarSign,
  Tag,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckSquare,
  PlayCircle,
  PauseCircle,
  RotateCcw
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
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AddTaskModal } from "./add-task-modal";
import { TaskDetails } from "./task-details";
import { useModulePermissions } from "@/hooks/use-permissions";
import { WithPermissions } from "@/components/ui/with-permissions";

type ViewMode = 'table' | 'cards' | 'kanban' | 'calendar';
type SortField = 'dueDate' | 'priority' | 'assignee' | 'status' | 'client' | 'created' | 'updated';
type SortOrder = 'asc' | 'desc';

export function TaskList() {
  const { toast } = useToast();
  
  // Enhanced state management for scalability
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all');
  
  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // UI state
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [taskDetailsActiveTab, setTaskDetailsActiveTab] = useState("details");
  const [taskDetailsEditing, setTaskDetailsEditing] = useState(false);
  const [taskType, setTaskType] = useState<"admin" | "revenue">("admin");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Quick filter presets
  const [quickFilter, setQuickFilter] = useState<string>('all');

  // Get permissions for tasks module
  const permissions = useModulePermissions("tasks");
  
  // Get current user for "My Tasks" filtering
  const { data: currentUser } = useQuery<{ id: number }>({
    queryKey: ["/api/v1/auth/me"],
    select: (data) => data || { id: 0 }
  });

  // Fetch all necessary data
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/v1/tasks"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/v1/users"],
  });

  const { data: taskStatuses = [] } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });
  
  const { data: adminTaskCategories = [] } = useQuery<TaskCategory[]>({
    queryKey: ["/api/v1/setup/task-categories", { isAdmin: true }],
  });
  
  const { data: revenueTaskCategories = [] } = useQuery<TaskCategory[]>({
    queryKey: ["/api/v1/setup/task-categories", { isAdmin: false }],
  });
  
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/v1/clients"],
  });

  // Combined categories
  const allTaskCategories = useMemo(() => [...adminTaskCategories, ...revenueTaskCategories], [adminTaskCategories, revenueTaskCategories]);

  // Advanced filtering and sorting
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Quick filters
      const now = new Date();
      const taskDueDate = new Date(task.dueDate);
      const isOverdue = taskDueDate < now && task.statusId !== taskStatuses.find(s => s.rank === 3)?.id;
      const isDueToday = taskDueDate.toDateString() === now.toDateString();
      const isDueTomorrow = taskDueDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
      const isCompleted = task.statusId === taskStatuses.find(s => s.rank === 3)?.id;
      const isMyTask = task.assigneeId === currentUser?.id;

      switch (quickFilter) {
        case 'my':
          if (!isMyTask) return false;
          break;
        case 'overdue':
          if (!isOverdue) return false;
          break;
        case 'today':
          if (!isDueToday) return false;
          break;
        case 'tomorrow':
          if (!isDueTomorrow) return false;
          break;
        case 'completed':
          if (!isCompleted) return false;
          break;
        case 'pending':
          if (isCompleted) return false;
          break;
        case 'high-priority':
          if (task.priority !== 'High') return false;
          break;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const taskMatches = task.taskDetails?.toLowerCase().includes(searchLower) ||
                           task.nextToDo?.toLowerCase().includes(searchLower);
        
        const clientName = clients.find(c => c.id === task.clientId)?.displayName?.toLowerCase();
        const assigneeName = users.find(u => u.id === task.assigneeId)?.displayName?.toLowerCase();
        const statusName = taskStatuses.find(s => s.id === task.statusId)?.name?.toLowerCase();
        const categoryName = allTaskCategories.find(c => c.id === task.taskCategoryId)?.name?.toLowerCase();
        
        if (!taskMatches && 
            !clientName?.includes(searchLower) &&
            !assigneeName?.includes(searchLower) &&
            !statusName?.includes(searchLower) &&
            !categoryName?.includes(searchLower)) {
          return false;
        }
      }

      // Advanced filters
      if (statusFilter !== 'all' && task.statusId !== parseInt(statusFilter)) return false;
      if (assigneeFilter !== 'all' && task.assigneeId !== parseInt(assigneeFilter)) return false;
      if (categoryFilter !== 'all' && task.taskCategoryId !== parseInt(categoryFilter)) return false;
      if (clientFilter !== 'all' && task.clientId !== parseInt(clientFilter)) return false;
      if (taskTypeFilter !== 'all') {
        if (taskTypeFilter === 'admin' && !task.isAdmin) return false;
        if (taskTypeFilter === 'revenue' && task.isAdmin) return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      
      if (dueDateFilter !== 'all') {
        const today = new Date();
        const taskDate = new Date(task.dueDate);
        
        switch (dueDateFilter) {
          case 'overdue':
            if (taskDate >= today || isCompleted) return false;
            break;
          case 'today':
            if (taskDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'week':
            const nextWeek = new Date(today.getTime() + 7 * 86400000);
            if (taskDate < today || taskDate > nextWeek) return false;
            break;
          case 'month':
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
            if (taskDate < today || taskDate > nextMonth) return false;
            break;
        }
      }

      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        case 'assignee':
          const aAssignee = users.find(u => u.id === a.assigneeId)?.displayName || '';
          const bAssignee = users.find(u => u.id === b.assigneeId)?.displayName || '';
          comparison = aAssignee.localeCompare(bAssignee);
          break;
        case 'status':
          const aStatus = taskStatuses.find(s => s.id === a.statusId);
          const bStatus = taskStatuses.find(s => s.id === b.statusId);
          comparison = (aStatus?.rank || 0) - (bStatus?.rank || 0);
          break;
        case 'client':
          const aClient = clients.find(c => c.id === a.clientId)?.displayName || '';
          const bClient = clients.find(c => c.id === b.clientId)?.displayName || '';
          comparison = aClient.localeCompare(bClient);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, quickFilter, searchTerm, statusFilter, assigneeFilter, categoryFilter, clientFilter, priorityFilter, dueDateFilter, taskTypeFilter, sortField, sortOrder, taskStatuses, users, clients, allTaskCategories, currentUser]);

  // Pagination
  const totalItems = filteredAndSortedTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filteredAndSortedTasks.slice(startIndex, endIndex);

  // Task metrics for dashboard overview
  const taskMetrics = useMemo(() => {
    const now = new Date();
    const completedStatusId = taskStatuses.find(s => s.rank === 3)?.id;
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.statusId !== completedStatusId).length,
      completed: tasks.filter(t => t.statusId === completedStatusId).length,
      overdue: tasks.filter(t => new Date(t.dueDate) < now && t.statusId !== completedStatusId).length,
      dueToday: tasks.filter(t => new Date(t.dueDate).toDateString() === now.toDateString()).length,
      highPriority: tasks.filter(t => t.priority === 'High' && t.statusId !== completedStatusId).length,
      myTasks: tasks.filter(t => t.assigneeId === currentUser?.id && t.statusId !== completedStatusId).length,
    };
  }, [tasks, taskStatuses, currentUser]);

  // Helper functions
  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusColor = (statusId: number) => {
    const status = taskStatuses.find(s => s.id === statusId);
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.rank) {
      case 1: return 'bg-gray-100 text-gray-800'; // Not Started
      case 2: return 'bg-blue-100 text-blue-800'; // In Progress
      case 3: return 'bg-green-100 text-green-800'; // Completed
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
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays === -1) return 'Due yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    
    return date.toLocaleDateString();
  };

  // Action handlers
  const handleTaskSelect = (taskId: number, selected: boolean) => {
    if (selected) {
      setSelectedTaskIds(prev => [...prev, taskId]);
    } else {
      setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTaskIds(paginatedTasks.map(t => t.id));
    } else {
      setSelectedTaskIds([]);
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

  const resetAllFilters = () => {
    setQuickFilter('all');
    setStatusFilter('all');
    setAssigneeFilter('all');
    setCategoryFilter('all');
    setClientFilter('all');
    setPriorityFilter('all');
    setDueDateFilter('all');
    setTaskTypeFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [quickFilter, statusFilter, assigneeFilter, categoryFilter, clientFilter, priorityFilter, dueDateFilter, taskTypeFilter, searchTerm]);

  return (
    <>
      {/* Header with Metrics Dashboard */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Task Management</h2>
            <p className="text-sm text-slate-500 mt-1">
              Comprehensive task tracking and workflow management
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
            </Button>
            
            {permissions?.canCreate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setTaskType("admin");
                    setIsAddTaskModalOpen(true);
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Administrative Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setTaskType("revenue");
                    setIsAddTaskModalOpen(true);
                  }}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Revenue Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Task Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-6">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Total Tasks</p>
                <p className="text-lg font-semibold text-slate-900">{taskMetrics.total}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <PlayCircle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-lg font-semibold text-slate-900">{taskMetrics.pending}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-slate-500">Completed</p>
                <p className="text-lg font-semibold text-slate-900">{taskMetrics.completed}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-slate-500">Overdue</p>
                <p className="text-lg font-semibold text-red-600">{taskMetrics.overdue}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Due Today</p>
                <p className="text-lg font-semibold text-slate-900">{taskMetrics.dueToday}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-slate-500">High Priority</p>
                <p className="text-lg font-semibold text-slate-900">{taskMetrics.highPriority}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <UserCircle className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-slate-500">My Tasks</p>
                <p className="text-lg font-semibold text-slate-900">{taskMetrics.myTasks}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Tasks', icon: List },
            { key: 'my', label: 'My Tasks', icon: UserCircle },
            { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
            { key: 'today', label: 'Due Today', icon: Calendar },
            { key: 'tomorrow', label: 'Due Tomorrow', icon: Clock },
            { key: 'high-priority', label: 'High Priority', icon: TrendingUp },
            { key: 'pending', label: 'Pending', icon: PlayCircle },
            { key: 'completed', label: 'Completed', icon: CheckCircle },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={quickFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickFilter(key)}
              className="flex items-center space-x-1"
            >
              <Icon className="h-3 w-3" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Search and Advanced Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tasks, clients, assignees, or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button 
              variant="ghost" 
              size="sm"
              className="absolute right-2 top-1 h-7 w-7 px-0" 
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-200 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger>
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

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
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

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger>
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

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="High">High Priority</SelectItem>
                <SelectItem value="Medium">Medium Priority</SelectItem>
                <SelectItem value="Low">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Due Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Due Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="week">Due This Week</SelectItem>
                <SelectItem value="month">Due This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Task Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Task Types</SelectItem>
                <SelectItem value="admin">Administrative</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetAllFilters} className="flex items-center">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        )}

        {/* View Controls and Sorting */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="px-3"
            >
              <Kanban className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Bulk Actions */}
            {selectedTaskIds.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">
                  {selectedTaskIds.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
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
              </div>
            )}

            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="assignee">Assignee</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            {/* Items per page */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Show:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-slate-600">
          Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} tasks
          {filteredAndSortedTasks.length !== tasks.length && (
            <span className="text-slate-500"> (filtered from {tasks.length} total)</span>
          )}
        </div>
        
        {(quickFilter !== 'all' || searchTerm || statusFilter !== 'all' || assigneeFilter !== 'all' || 
          categoryFilter !== 'all' || clientFilter !== 'all' || priorityFilter !== 'all' || 
          dueDateFilter !== 'all' || taskTypeFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={resetAllFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Task Views */}
      {isLoadingTasks ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : paginatedTasks.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">
            {filteredAndSortedTasks.length === 0 ? "No tasks found" : "No tasks match your filters"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredAndSortedTasks.length === 0 
              ? "Get started by creating your first task."
              : "Try adjusting your search or filter criteria."
            }
          </p>
          {filteredAndSortedTasks.length === 0 && permissions?.canCreate && (
            <div className="mt-6">
              <Button onClick={() => setIsAddTaskModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <Checkbox
                          checked={selectedTaskIds.length === paginatedTasks.length && paginatedTasks.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Task
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Assignee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedTasks.map((task) => {
                      const client = clients.find(c => c.id === task.clientId);
                      const assignee = users.find(u => u.id === task.assigneeId);
                      const status = taskStatuses.find(s => s.id === task.statusId);
                      const category = allTaskCategories.find(c => c.id === task.taskCategoryId);
                      const isOverdue = isTaskOverdue(task);
                      
                      return (
                        <tr 
                          key={task.id} 
                          className={`hover:bg-slate-50 cursor-pointer ${isOverdue ? 'bg-red-50' : ''}`}
                          onClick={() => handleViewTaskDetails(task.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedTaskIds.includes(task.id)}
                              onCheckedChange={(checked) => handleTaskSelect(task.id, checked as boolean)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start space-x-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {task.taskDetails || 'Untitled Task'}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {category?.name || 'Uncategorized'}
                                  </Badge>
                                  {task.isAdmin ? (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                      Admin
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                      Revenue
                                    </Badge>
                                  )}
                                  {isOverdue && (
                                    <Badge variant="destructive" className="text-xs">
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-900">
                                {client?.displayName || 'Unknown Client'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {assignee?.displayName?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-slate-900">
                                {assignee?.displayName || 'Unassigned'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getTaskStatusColor(task.statusId)}>
                              {status?.name || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getTaskPriorityColor(task.priority || 'Medium')}>
                              {task.priority || 'Medium'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {formatDueDate(task.dueDate)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewTaskDetails(task.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                {taskStatuses.map(status => (
                                  <DropdownMenuItem 
                                    key={status.id}
                                    onClick={() => handleBulkStatusChange(status.id)}
                                    disabled={task.statusId === status.id}
                                  >
                                    {status.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Card View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTasks.map((task) => {
                const client = clients.find(c => c.id === task.clientId);
                const assignee = users.find(u => u.id === task.assigneeId);
                const status = taskStatuses.find(s => s.id === task.statusId);
                const category = allTaskCategories.find(c => c.id === task.taskCategoryId);
                const isOverdue = isTaskOverdue(task);
                
                return (
                  <Card 
                    key={task.id} 
                    className={`group hover:shadow-md transition-all duration-200 cursor-pointer ${
                      isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200'
                    }`}
                    onClick={() => handleViewTaskDetails(task.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-medium text-slate-900 line-clamp-2">
                            {task.taskDetails || 'Untitled Task'}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {category?.name || 'Uncategorized'}
                            </Badge>
                            {task.isAdmin ? (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Revenue
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedTaskIds.includes(task.id)}
                            onCheckedChange={(checked) => handleTaskSelect(task.id, checked as boolean)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
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
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Client and Assignee */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {client?.displayName || 'Unknown Client'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {assignee?.displayName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-slate-600">
                            {assignee?.displayName || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Status and Priority */}
                      <div className="flex items-center justify-between mb-4">
                        <Badge className={getTaskStatusColor(task.statusId)}>
                          {status?.name || 'Unknown'}
                        </Badge>
                        <Badge className={getTaskPriorityColor(task.priority || 'Medium')}>
                          {task.priority || 'Medium'}
                        </Badge>
                      </div>
                      
                      {/* Due Date */}
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-900'}`}>
                            {formatDueDate(task.dueDate)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {isOverdue && (
                        <div className="mt-3 p-2 bg-red-100 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-700 font-medium">Task Overdue</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {taskStatuses.map((status) => {
                const statusTasks = paginatedTasks.filter(task => task.statusId === status.id);
                
                return (
                  <div key={status.id} className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-slate-900 flex items-center">
                        <Badge className={getTaskStatusColor(status.id)} variant="outline">
                          {status.name}
                        </Badge>
                        <span className="ml-2 text-slate-500">({statusTasks.length})</span>
                      </h3>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {statusTasks.map((task) => {
                        const client = clients.find(c => c.id === task.clientId);
                        const assignee = users.find(u => u.id === task.assigneeId);
                        const category = allTaskCategories.find(c => c.id === task.taskCategoryId);
                        const isOverdue = isTaskOverdue(task);
                        
                        return (
                          <Card 
                            key={task.id} 
                            className={`group hover:shadow-sm transition-all duration-200 cursor-pointer ${
                              isOverdue ? 'border-red-200 bg-red-50' : 'bg-white'
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
                              
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {category?.name || 'Uncategorized'}
                                </Badge>
                                <Badge className={getTaskPriorityColor(task.priority || 'Medium')} className="text-xs">
                                  {task.priority || 'Medium'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center space-x-2 mb-2">
                                <Building2 className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-600 truncate">
                                  {client?.displayName || 'Unknown Client'}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                  <Avatar className="h-4 w-4">
                                    <AvatarFallback className="text-xs">
                                      {assignee?.displayName?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-slate-600">
                                    {assignee?.displayName || 'Unassigned'}
                                  </span>
                                </div>
                                
                                <div className="text-xs text-slate-500">
                                  {formatDueDate(task.dueDate)}
                                </div>
                              </div>
                              
                              {isOverdue && (
                                <div className="mt-2 flex items-center space-x-1">
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs text-red-600 font-medium">Overdue</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {statusTasks.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm">No tasks in this status</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} tasks
              </div>
              
              <Pagination>
                <PaginationContent>
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="cursor-pointer"
                      />
                    </PaginationItem>
                  )}
                  
                  {/* Smart pagination logic */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="cursor-pointer"
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

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
            setTaskDetailsActiveTab("details");
            setTaskDetailsEditing(false);
          }}
          taskId={selectedTaskId}
          activeTab={taskDetailsActiveTab}
          editing={taskDetailsEditing}
        />
      )}
    </>
  );
}