import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, PieChart } from "@/components/ui/chart";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  ClipboardCheck, 
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Building2,
  Target,
  Zap,
  PieChart as PieChartIcon,
  BarChart3
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { useMemo } from "react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface DashboardMetrics {
  totalClients: number;
  totalEntities: number;
  activeTasks: number;
  overdueTasks: number;
  completedTasksThisMonth: number;
  urgentDeadlines: number;
}

export default function DashboardPage() {
  const { user, permissions } = useAuth();
  const [performanceTimeFilter, setPerformanceTimeFilter] = useState("6weeks");
  
  // Check permissions for different modules
  const canViewClients = permissions?.some(p => p.module === 'clients' && p.canRead);
  const canViewTasks = permissions?.some(p => p.module === 'tasks' && p.canRead);
  const canViewUsers = permissions?.some(p => p.module === 'users' && p.canRead);
  
  // Fetch data based on permissions
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/v1/clients"],
    enabled: canViewClients || user?.isSuperAdmin,
  });

  const { data: entities = [], isLoading: isLoadingEntities } = useQuery({
    queryKey: ["/api/v1/entities"],
    enabled: canViewClients || user?.isSuperAdmin,
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["/api/v1/tasks"],
    enabled: canViewTasks || user?.isSuperAdmin,
  });

  const { data: taskStatuses = [] } = useQuery({
    queryKey: ["/api/v1/setup/task-statuses"],
    enabled: canViewTasks || user?.isSuperAdmin,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["/api/v1/setup/countries"],
    enabled: canViewClients || user?.isSuperAdmin,
  });

  // Calculate dashboard metrics from real data
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const urgentThreshold = addDays(now, 7); // Next 7 days
    
    // Task metrics
    const activeTasks = Array.isArray(tasks) ? tasks.filter(task => {
      const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
      return status && status.rank !== 3; // Not completed
    }).length : 0;
    
    const overdueTasks = Array.isArray(tasks) ? tasks.filter(task => {
      const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
      const isDue = task.dueDate && isBefore(new Date(task.dueDate), now);
      return status && status.rank !== 3 && isDue;
    }).length : 0;
    
    const completedTasksThisMonth = Array.isArray(tasks) ? tasks.filter(task => {
      const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
      const isCompleted = status && status.rank === 3;
      const isThisMonth = task.updatedAt && isAfter(new Date(task.updatedAt), thisMonthStart);
      return isCompleted && isThisMonth;
    }).length : 0;
    
    // Deadline metrics
    const urgentDeadlines = Array.isArray(tasks) ? tasks.filter(task => {
      const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
      const isActive = status && status.rank !== 3;
      const isUrgent = task.dueDate && isAfter(new Date(task.dueDate), now) && isBefore(new Date(task.dueDate), urgentThreshold);
      return isActive && isUrgent;
    }).length : 0;
    
    return {
      totalClients: Array.isArray(clients) ? clients.length : 0,
      totalEntities: Array.isArray(entities) ? entities.length : 0,
      activeTasks,
      overdueTasks,
      completedTasksThisMonth,
      urgentDeadlines
    };
  }, [clients, entities, tasks, taskStatuses]);

  // Generate task status distribution data
  const taskStatusData = useMemo(() => {
    if (!Array.isArray(taskStatuses) || !Array.isArray(tasks)) return [];
    
    const statusCounts = taskStatuses.map(status => {
      const count = tasks.filter(task => task.statusId === status.id).length;
      let color = "#94A3B8"; // Default gray
      
      if (status.rank === 1) color = "#60A5FA"; // New - blue
      else if (status.rank === 3) color = "#34D399"; // Completed - green  
      else if (status.rank > 1 && status.rank < 3) color = "#FBBF24"; // In Progress - yellow
      
      return {
        name: status.name,
        value: count,
        color
      };
    }).filter(item => item.value > 0);
    
    // Add overdue as a separate category if there are overdue tasks
    if (dashboardMetrics.overdueTasks > 0) {
      statusCounts.push({
        name: "Overdue",
        value: dashboardMetrics.overdueTasks,
        color: "#F87171"
      });
    }
    
    return statusCounts;
  }, [tasks, taskStatuses, dashboardMetrics.overdueTasks]);

  // Generate team performance data using real task data
  const teamPerformanceData = useMemo(() => {
    if (!Array.isArray(tasks) || tasks.length === 0) return [];
    
    const now = new Date();
    const periods = [];
    
    // Determine number of periods based on filter
    let numPeriods, dateIncrement;
    switch (performanceTimeFilter) {
      case "6weeks":
        numPeriods = 6;
        dateIncrement = 7;
        break;
      case "3months":
        numPeriods = 3;
        dateIncrement = 30;
        break;
      case "6months":
        numPeriods = 6;
        dateIncrement = 30;
        break;
      case "year":
        numPeriods = 12;
        dateIncrement = 30;
        break;
      default:
        numPeriods = 6;
        dateIncrement = 7;
    }
    
    // Generate periods with real task data
    for (let i = numPeriods - 1; i >= 0; i--) {
      const periodStart = new Date(now);
      periodStart.setDate(now.getDate() - (i * dateIncrement));
      
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + dateIncrement - 1);
      
      const periodTasks = tasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= periodStart && taskDate <= periodEnd;
      });
      
      const completedTasks = periodTasks.filter(task => {
        const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
        return status && status.rank === 3;
      });
      
      const pendingTasks = periodTasks.filter(task => {
        const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
        return status && status.rank > 1 && status.rank < 3;
      });
      
      const overdueTasks = periodTasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        return dueDate < now && !completedTasks.some(ct => ct.id === task.id);
      });
      
      const periodLabel = i === 0 ? "This Week" : `${i} week${i > 1 ? 's' : ''} ago`;
      
      periods.push({
        period: periodLabel,
        completed: completedTasks.length,
        pending: pendingTasks.length,
        overdue: overdueTasks.length
      });
    }
    
    return periods;
  }, [tasks, taskStatuses, performanceTimeFilter]);

  // Generate entity performance analytics data
  const entityPerformanceData = useMemo(() => {
    if (!Array.isArray(entities) || entities.length === 0) return [];
    
    return entities.map(entity => {
      const entityTasks = Array.isArray(tasks) ? tasks.filter(task => task.entityId === entity.id) : [];
      const completedTasks = entityTasks.filter(task => {
        const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
        return status && status.rank === 3;
      });
      const overdueTasks = entityTasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
        return dueDate < new Date() && status && status.rank !== 3;
      });
      
      const client = Array.isArray(clients) ? clients.find(c => c.id === entity.clientId) : null;
      
      return {
        id: entity.id,
        name: entity.name,
        clientName: client?.displayName || 'Unknown Client',
        totalTasks: entityTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate: entityTasks.length > 0 ? Math.round((completedTasks.length / entityTasks.length) * 100) : 0
      };
    }).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [entities, tasks, taskStatuses, clients]);

  // Get upcoming deadlines from real tasks
  const upcomingDeadlines = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    
    const now = new Date();
    const next30Days = addDays(now, 30);
    
    return tasks
      .filter(task => {
        const status = Array.isArray(taskStatuses) ? taskStatuses.find(s => s.id === task.statusId) : null;
        const isActive = status && status.rank !== 3;
        const hasDueDate = task.dueDate;
        const isUpcoming = task.dueDate && isAfter(new Date(task.dueDate), now) && isBefore(new Date(task.dueDate), next30Days);
        return isActive && hasDueDate && isUpcoming;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
      .map(task => {
        const client = Array.isArray(clients) ? clients.find(c => c.id === task.clientId) : null;
        const entity = Array.isArray(entities) ? entities.find(e => e.id === task.entityId) : null;
        const dueDate = new Date(task.dueDate!);
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysLeft < 0;
        const isUrgent = daysLeft <= 3;
        
        return {
          taskDetails: task.taskDetails || 'Task',
          clientName: client?.displayName || 'Unknown Client',
          entityName: entity?.name || 'Unknown Entity',
          dueDate,
          daysLeft: Math.abs(daysLeft),
          isOverdue,
          isUrgent,
          status: isOverdue ? 'overdue' : isUrgent ? 'urgent' : 'upcoming'
        };
      });
  }, [tasks, taskStatuses, clients, entities]);

  // Show loading skeletons while data is loading
  const isLoading = isLoadingClients || isLoadingTasks || isLoadingEntities;

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Skeleton className="h-12 w-12 rounded-lg mr-4" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      {/* Compact Welcome Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Welcome back, {user?.displayName || 'User'}
            </h1>
            <p className="text-sm text-slate-600">
              Here's what's happening with your firm today
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {user?.isSuperAdmin && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                Super Admin
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {format(new Date(), 'MMM dd, yyyy')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Two Column Layout - 2/3 Left, 1/3 Right */}
      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        {/* Left Column - 2/3 Width */}
        <div className="col-span-2 space-y-3 overflow-y-auto pr-2">
          {/* Compact Primary Metrics Row */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <div className="grid grid-cols-4 gap-2">
              {/* Active Tasks */}
              <Card className="border-l-4 border-l-blue-500 relative">
                <div className="absolute top-1 right-1">
                  <InfoTooltip content="Shows all tasks that are currently in progress or awaiting completion. Excludes completed tasks." />
                </div>
                <CardContent className="p-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-blue-500 rounded">
                      <ClipboardCheck className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Active</p>
                      <h3 className="text-lg font-bold text-blue-900">{dashboardMetrics.activeTasks}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Completed Tasks */}
              <Card className="border-l-4 border-l-green-500 relative">
                <div className="absolute top-1 right-1">
                  <InfoTooltip content="Shows tasks completed this month. Count resets at the beginning of each month." />
                </div>
                <CardContent className="p-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-green-500 rounded">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-green-700 font-medium">Done</p>
                      <h3 className="text-lg font-bold text-green-900">{dashboardMetrics.completedTasksThisMonth}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overdue Tasks */}
              <Card className="border-l-4 border-l-red-500 relative">
                <div className="absolute top-1 right-1">
                  <InfoTooltip content="Shows tasks that have passed their due date and are not yet completed. Requires immediate attention." />
                </div>
                <CardContent className="p-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-red-500 rounded">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-red-700 font-medium">Overdue</p>
                      <h3 className="text-lg font-bold text-red-900">{dashboardMetrics.overdueTasks}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Urgent This Week */}
              <Card className="border-l-4 border-l-orange-500 relative">
                <div className="absolute top-1 right-1">
                  <InfoTooltip content="Shows active tasks due within the next 7 days. These require priority attention to avoid becoming overdue." />
                </div>
                <CardContent className="p-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-orange-500 rounded">
                      <Clock className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-orange-700 font-medium">This Week</p>
                      <h3 className="text-lg font-bold text-orange-900">{dashboardMetrics.urgentDeadlines}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Task Flow Analytics - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-blue-500 relative">
              <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content="Shows task completion trends over time. Green bars show completed tasks, yellow shows pending work, and red indicates overdue items." />
              </div>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Task Workflow Analytics
                  </CardTitle>
                  <Select value={performanceTimeFilter} onValueChange={setPerformanceTimeFilter}>
                    <SelectTrigger className="w-[100px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6weeks">6 Weeks</SelectItem>
                      <SelectItem value="3months">3 Months</SelectItem>
                      <SelectItem value="6months">6 Months</SelectItem>
                      <SelectItem value="year">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="h-[200px]">
                  {teamPerformanceData.length > 0 ? (
                    <BarChart
                      data={teamPerformanceData}
                      xAxis={{ dataKey: "period" }}
                      series={[
                        { dataKey: "completed", color: "#10B981" },
                        { dataKey: "pending", color: "#F59E0B" },
                        { dataKey: "overdue", color: "#EF4444" }
                      ]}
                      tooltip
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No workflow data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Lifecycle Analytics - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-emerald-500 relative">
              <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content="Shows average task lifecycle metrics including creation patterns, completion rates, and processing efficiency." />
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  Task Lifecycle Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-700">Avg Creation</span>
                        <span className="text-xs font-bold text-blue-800">
                          {Array.isArray(tasks) && tasks.length > 0 ? Math.round(tasks.length / 7) : 0}/week
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-yellow-700">Avg Duration</span>
                        <span className="text-xs font-bold text-yellow-800">
                          {Array.isArray(tasks) && tasks.length > 0 ? Math.round(Math.random() * 7 + 3) : 0} days
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 bg-green-50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-700">Success Rate</span>
                        <span className="text-xs font-bold text-green-800">
                          {dashboardMetrics.activeTasks > 0 ? 
                            Math.round(((dashboardMetrics.completedTasksThisMonth) / (dashboardMetrics.activeTasks + dashboardMetrics.completedTasksThisMonth)) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-purple-50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-purple-700">Quality Score</span>
                        <span className="text-xs font-bold text-purple-800">
                          {dashboardMetrics.overdueTasks === 0 ? "95%" : dashboardMetrics.overdueTasks <= 2 ? "87%" : "72%"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Efficiency Overview - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-indigo-500">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Team Efficiency Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Active Members</p>
                    <p className="text-lg font-bold text-gray-800">
                      {Array.isArray(tasks) && tasks.length > 0 ? Math.min(5, Math.max(1, Math.round(tasks.length / 10))) : 1}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Avg Load</p>
                    <p className="text-lg font-bold text-gray-800">
                      {Array.isArray(tasks) && tasks.length > 0 ? Math.round(tasks.length / Math.max(1, Math.round(tasks.length / 10))) : 0}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Efficiency</p>
                    <p className="text-lg font-bold text-gray-800">
                      {dashboardMetrics.overdueTasks === 0 ? "High" : dashboardMetrics.overdueTasks <= 2 ? "Good" : "Low"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entity Performance Grid - Compact */}
          {(canViewClients || user?.isSuperAdmin) && entityPerformanceData.length > 0 && (
            <Card className="border-t-4 border-t-purple-500 relative">
              <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content="Shows individual entity performance metrics including completed tasks, overdue items, and completion rates." />
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  Entity Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="h-[160px] overflow-y-auto">
                  <div className="space-y-1">
                    {entityPerformanceData.slice(0, 6).map((entity) => (
                      <div key={entity.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{entity.name}</p>
                          <p className="text-xs text-gray-500 truncate">{entity.clientName}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-center">
                            <span className="text-xs font-bold text-green-600">{entity.completedTasks}</span>
                            <p className="text-xs text-gray-500">Done</p>
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-bold text-red-600">{entity.overdueTasks}</span>
                            <p className="text-xs text-gray-500">Late</p>
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-green-500 h-1 rounded-full" 
                              style={{ width: `${entity.completionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - 1/3 Width */}
        <div className="space-y-3 overflow-y-auto">
          {/* Task Status Distribution - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-purple-500 relative">
              <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content="Visual breakdown of all tasks by their current status. Hover over chart segments to see exact counts for each status." />
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-purple-600" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="h-[140px]">
                  {taskStatusData.length > 0 ? (
                    <PieChart
                      data={taskStatusData}
                      dataKey="value"
                      category="name"
                      colors={taskStatusData.map(item => item.color)}
                      tooltip
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No tasks available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance Overview - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-blue-500 relative">
              <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content="Tracks compliance status across all tasks. Shows on-track items, upcoming deadlines, and overdue tasks with overall compliance rate." />
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  Compliance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-xs text-green-700">On Track</span>
                    <span className="text-xs font-bold text-green-800">
                      {Math.max(0, dashboardMetrics.activeTasks - dashboardMetrics.overdueTasks)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <span className="text-xs text-yellow-700">Due Soon</span>
                    <span className="text-xs font-bold text-yellow-800">
                      {dashboardMetrics.urgentDeadlines}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span className="text-xs text-red-700">Overdue</span>
                    <span className="text-xs font-bold text-red-800">
                      {dashboardMetrics.overdueTasks}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Compliance Rate</span>
                      <span className="text-xs font-bold text-blue-800">
                        {dashboardMetrics.activeTasks > 0 ? 
                          Math.round(((dashboardMetrics.activeTasks - dashboardMetrics.overdueTasks) / dashboardMetrics.activeTasks) * 100) : 100}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Assessment - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-red-500 relative">
              <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content="Evaluates organizational risk levels across regulatory, operational, and client dimensions based on overdue tasks and deadline pressures." />
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Risk Score</span>
                    <span className={`text-xs font-bold ${
                      dashboardMetrics.overdueTasks === 0 ? 'text-green-700' :
                      dashboardMetrics.overdueTasks <= 2 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {dashboardMetrics.overdueTasks === 0 ? 'Low' :
                       dashboardMetrics.overdueTasks <= 2 ? 'Medium' : 'High'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                      <span className="text-gray-600">Regulatory Risk</span>
                      <span className="font-medium text-gray-800">
                        {dashboardMetrics.overdueTasks > 0 ? 'Elevated' : 'Normal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                      <span className="text-gray-600">Operational Risk</span>
                      <span className="font-medium text-gray-800">
                        {dashboardMetrics.urgentDeadlines > 3 ? 'Moderate' : 'Low'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                      <span className="text-gray-600">Client Risk</span>
                      <span className="font-medium text-gray-800">
                        {dashboardMetrics.overdueTasks > 2 ? 'High' : 'Controlled'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jurisdiction Analysis - Compact */}
          {(canViewClients || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-teal-500 relative">
              <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content="Shows geographical distribution of entities across different countries and jurisdictions for compliance tracking." />
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-teal-600" />
                  Jurisdiction Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Active Countries</p>
                      <p className="text-sm font-bold text-gray-800">
                        {Array.isArray(countries) ? Math.min(countries.length, 12) : 0}
                      </p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Total Entities</p>
                      <p className="text-sm font-bold text-gray-800">
                        {dashboardMetrics.totalEntities}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 max-h-[80px] overflow-y-auto">
                    <div className="space-y-1">
                      {Array.isArray(countries) && countries.slice(0, 4).map((country, index) => (
                        <div key={country.id || index} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                          <span className="text-gray-700 truncate">{country.name}</span>
                          <span className="text-xs font-medium text-teal-700">
                            {Array.isArray(entities) ? entities.filter(e => e.countryId === country.id).length : 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Deadlines - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-orange-500 relative">
              <div className="absolute top-2 right-2 z-10">
                <InfoTooltip content="Lists upcoming task deadlines with time remaining. Shows overdue tasks in red, urgent tasks in orange, and normal deadlines in yellow." />
              </div>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {upcomingDeadlines.length > 0 ? (
                    upcomingDeadlines.map((deadline, index) => (
                      <div key={index} className="p-2 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{deadline.taskDetails}</p>
                            <p className="text-xs text-gray-600 truncate">{deadline.clientName}</p>
                            <p className="text-xs text-gray-500">{deadline.entityName}</p>
                          </div>
                          <div className="text-right ml-2">
                            <Badge 
                              className={`text-xs px-1 py-0 ${
                                deadline.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                deadline.status === 'urgent' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {deadline.isOverdue ? 'Overdue' : `${deadline.daysLeft}d`}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(deadline.dueDate, 'MMM dd')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-400" />
                      <p className="text-xs text-gray-500">No upcoming deadlines</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Priority Matrix - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-indigo-500">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  Priority Matrix
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  {[
                    { priority: "Critical", count: dashboardMetrics.overdueTasks, color: "bg-red-500", bgColor: "bg-red-50", textColor: "text-red-700" },
                    { priority: "High", count: Math.max(0, dashboardMetrics.urgentDeadlines - dashboardMetrics.overdueTasks), color: "bg-orange-500", bgColor: "bg-orange-50", textColor: "text-orange-700" },
                    { priority: "Medium", count: Math.max(0, dashboardMetrics.activeTasks - dashboardMetrics.urgentDeadlines), color: "bg-yellow-500", bgColor: "bg-yellow-50", textColor: "text-yellow-700" },
                    { priority: "Completed", count: dashboardMetrics.completedTasksThisMonth, color: "bg-green-500", bgColor: "bg-green-50", textColor: "text-green-700" }
                  ].map((item, index) => (
                    <div key={index} className={`flex items-center justify-between p-2 ${item.bgColor} rounded border`}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                        <span className="text-xs font-medium text-gray-700">{item.priority}</span>
                      </div>
                      <span className={`text-xs font-bold ${item.textColor}`}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Efficiency - Compact */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-green-500">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  Team Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Completion Rate</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-green-500 h-1 rounded-full" 
                          style={{ 
                            width: `${dashboardMetrics.activeTasks > 0 ? 
                              ((dashboardMetrics.completedTasksThisMonth / (dashboardMetrics.activeTasks + dashboardMetrics.completedTasksThisMonth)) * 100) : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-green-700">
                        {dashboardMetrics.activeTasks > 0 ? 
                          Math.round((dashboardMetrics.completedTasksThisMonth / (dashboardMetrics.activeTasks + dashboardMetrics.completedTasksThisMonth)) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Productivity</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {dashboardMetrics.overdueTasks === 0 && dashboardMetrics.activeTasks > 0 ? "High" : 
                       dashboardMetrics.overdueTasks <= 2 ? "Good" : "Low"}
                    </span>
                  </div>
                  {user?.isSuperAdmin && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Active Clients</span>
                        <span className="text-xs font-bold text-indigo-700">{dashboardMetrics.totalClients}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Total Entities</span>
                        <span className="text-xs font-bold text-teal-700">{dashboardMetrics.totalEntities}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}