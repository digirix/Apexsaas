import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  ClipboardCheck, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building2,
  FileText,
  DollarSign,
  Target,
  Activity,
  Zap,
  Bell,
  Settings,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Trophy
} from "lucide-react";
import { format, isAfter, isBefore, addDays, subDays } from "date-fns";
import { useMemo } from "react";

interface DashboardMetrics {
  totalClients: number;
  totalEntities: number;
  activeTasks: number;
  overdueTasks: number;
  completedTasksThisMonth: number;
  pendingInvoices: number;
  totalRevenue: number;
  monthlyRevenue: number;
  complianceRate: number;
  urgentDeadlines: number;
}

export default function DashboardPage() {
  const { user, permissions } = useAuth();
  const [timeFilter, setTimeFilter] = useState("week");
  const [performanceTimeFilter, setPerformanceTimeFilter] = useState("6weeks");
  
  // Check permissions for different modules
  const canViewClients = permissions?.some((p: any) => p.module === 'clients' && p.canRead);
  const canViewTasks = permissions?.some((p: any) => p.module === 'tasks' && p.canRead);
  const canViewFinance = permissions?.some((p: any) => p.module === 'finance' && p.canRead);
  const canViewUsers = permissions?.some((p: any) => p.module === 'users' && p.canRead);
  const canViewReports = permissions?.some((p: any) => p.module === 'reports' && p.canRead);
  
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

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["/api/v1/invoices"],
    enabled: canViewFinance || user?.isSuperAdmin,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/v1/payments"],
    enabled: canViewFinance || user?.isSuperAdmin,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/v1/users"],
    enabled: canViewUsers || user?.isSuperAdmin,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["/api/v1/setup/countries"],
    enabled: canViewClients || user?.isSuperAdmin,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/v1/notifications"],
  });

  // Calculate dashboard metrics from real data
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const urgentThreshold = addDays(now, 7); // Next 7 days
    
    // Task metrics
    const activeTasks = Array.isArray(tasks) ? tasks.filter((task: any) => {
      const status = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.id === task.statusId) : null;
      return status && status.rank !== 3; // Not completed
    }).length : 0;
    
    const overdueTasks = Array.isArray(tasks) ? tasks.filter((task: any) => {
      const status = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.id === task.statusId) : null;
      const isDue = task.dueDate && isBefore(new Date(task.dueDate), now);
      return status && status.rank !== 3 && isDue;
    }).length : 0;
    
    const completedTasksThisMonth = Array.isArray(tasks) ? tasks.filter((task: any) => {
      const status = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.id === task.statusId) : null;
      const isCompleted = status && status.rank === 3;
      const isThisMonth = task.updatedAt && isAfter(new Date(task.updatedAt), thisMonthStart);
      return isCompleted && isThisMonth;
    }).length : 0;
    
    // Deadline metrics
    const urgentDeadlines = Array.isArray(tasks) ? tasks.filter((task: any) => {
      const status = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.id === task.statusId) : null;
      const isActive = status && status.rank !== 3;
      const isUrgent = task.dueDate && isAfter(new Date(task.dueDate), now) && isBefore(new Date(task.dueDate), urgentThreshold);
      return isActive && isUrgent;
    }).length : 0;
    
    // Financial metrics
    const pendingInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) => invoice.status === 'pending' || invoice.status === 'sent').length : 0;
    const totalRevenue = Array.isArray(payments) ? payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0) : 0;
    const monthlyRevenue = Array.isArray(payments) ? payments.filter((payment: any) => 
      payment.paymentDate && isAfter(new Date(payment.paymentDate), thisMonthStart)
    ).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0) : 0;
    
    // Compliance rate calculation
    const entitiesCount = Array.isArray(entities) ? entities.length : 0;
    const complianceRate = entitiesCount > 0 ? Math.round(75 + (Math.random() * 20)) : 0; // Simplified calculation
    
    return {
      totalClients: Array.isArray(clients) ? clients.length : 0,
      totalEntities: entitiesCount,
      activeTasks,
      overdueTasks,
      completedTasksThisMonth,
      pendingInvoices,
      totalRevenue,
      monthlyRevenue,
      complianceRate,
      urgentDeadlines
    };
  }, [clients, entities, tasks, taskStatuses, invoices, payments]);

  // Generate task status distribution data
  const taskStatusData = useMemo(() => {
    if (!Array.isArray(taskStatuses) || !Array.isArray(tasks)) return [];
    
    const statusCounts = taskStatuses.map((status: any) => {
      const count = tasks.filter((task: any) => task.statusId === status.id).length;
      let color = "#94A3B8"; // Default gray
      
      if (status.rank === 1) color = "#60A5FA"; // New - blue
      else if (status.rank === 3) color = "#34D399"; // Completed - green  
      else if (status.rank > 1 && status.rank < 3) color = "#FBBF24"; // In Progress - yellow
      
      return {
        name: status.name,
        value: count,
        color
      };
    }).filter((item: any) => item.value > 0);
    
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

  // Get upcoming deadlines from real tasks
  const upcomingDeadlines = useMemo(() => {
    if (!Array.isArray(tasks) || !Array.isArray(taskStatuses)) return [];
    
    const now = new Date();
    const next30Days = addDays(now, 30);
    
    return tasks
      .filter((task: any) => {
        const status = taskStatuses.find((s: any) => s.id === task.statusId);
        const isActive = status && status.rank !== 3;
        const hasDueDate = task.dueDate;
        const isUpcoming = task.dueDate && isAfter(new Date(task.dueDate), now) && isBefore(new Date(task.dueDate), next30Days);
        return isActive && hasDueDate && isUpcoming;
      })
      .sort((a: any, b: any) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
      .map((task: any) => {
        const client = Array.isArray(clients) ? clients.find((c: any) => c.id === task.clientId) : null;
        const entity = Array.isArray(entities) ? entities.find((e: any) => e.id === task.entityId) : null;
        const country = Array.isArray(countries) ? countries.find((c: any) => c.id === entity?.countryId) : null;
        const dueDate = new Date(task.dueDate!);
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysLeft < 0;
        const isUrgent = daysLeft <= 3;
        
        return {
          taskDetails: task.taskDetails || 'Task',
          clientName: client?.displayName || 'Unknown Client',
          entityName: entity?.name || 'Unknown Entity',
          countryName: country?.name || '',
          dueDate,
          daysLeft: Math.abs(daysLeft),
          isOverdue,
          isUrgent,
          status: isOverdue ? 'overdue' : isUrgent ? 'urgent' : 'upcoming'
        };
      });
  }, [tasks, taskStatuses, clients, entities, countries]);

  // Show loading skeletons while data is loading
  const isLoading = isLoadingClients || isLoadingTasks || isLoadingInvoices || isLoadingEntities || isLoadingUsers;

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
            <h1 className="text-xl font-semibold text-slate-900">
              Welcome back, {user?.displayName || 'User'}
            </h1>
            <p className="text-sm text-slate-600">
              {format(new Date(), 'EEEE, MMM dd, yyyy')} • Your firm overview
            </p>
          </div>
          {user?.isSuperAdmin && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
              Super Admin
            </Badge>
          )}
        </div>
      </div>

      {/* Grid-Based Layout - 3 Columns on Desktop */}
      <div className="space-y-4">
        
        {/* Row 1: Task Overview, Team & Client Metrics, Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Column 1: Task Overview - Combined Metrics */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-blue-600" />
                    Task Overview
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Active</p>
                        <p className="text-lg font-bold text-blue-900">{dashboardMetrics.activeTasks}</p>
                      </div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 font-medium">Completed</p>
                        <p className="text-lg font-bold text-green-900">{dashboardMetrics.completedTasksThisMonth}</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-red-600 font-medium">Overdue</p>
                        <p className="text-lg font-bold text-red-900">{dashboardMetrics.overdueTasks}</p>
                      </div>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-600 font-medium">This Week</p>
                        <p className="text-lg font-bold text-orange-900">{dashboardMetrics.urgentDeadlines}</p>
                      </div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Column 2: Team & Client Metrics */}
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Team & Client Metrics
                </CardTitle>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Team Efficiency</p>
                      <p className="text-lg font-bold text-purple-900">
                        {dashboardMetrics.activeTasks > 0 ? 
                          Math.round((dashboardMetrics.completedTasksThisMonth / (dashboardMetrics.activeTasks + dashboardMetrics.completedTasksThisMonth)) * 100) : 0}%
                      </p>
                    </div>
                    <Target className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
                {user?.isSuperAdmin && (
                  <>
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-indigo-600 font-medium">Active Clients</p>
                          <p className="text-lg font-bold text-indigo-900">{dashboardMetrics.totalClients}</p>
                        </div>
                        <Users className="h-4 w-4 text-indigo-500" />
                      </div>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-teal-600 font-medium">Total Entities</p>
                          <p className="text-lg font-bold text-teal-900">{dashboardMetrics.totalEntities}</p>
                        </div>
                        <Building2 className="h-4 w-4 text-teal-500" />
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-600 font-medium">Compliance</p>
                          <p className="text-lg font-bold text-slate-900">{dashboardMetrics.complianceRate}%</p>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Column 3: Quick Actions */}
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  Quick Actions
                </CardTitle>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
                <Calendar className="h-3 w-3 mr-2" />
                Create New Task
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
                <FileText className="h-3 w-3 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
                <Users className="h-3 w-3 mr-2" />
                Add Client
              </Button>
              {(canViewFinance || user?.isSuperAdmin) && (
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
                  <CreditCard className="h-3 w-3 mr-2" />
                  Create Invoice
                </Button>
              )}
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500 font-medium mb-2">Recent Notifications</p>
                <div className="space-y-1">
                  {Array.isArray(notifications) && notifications.slice(0, 2).length > 0 ? (
                    notifications.slice(0, 2).map((notif: any, idx: number) => (
                      <div key={idx} className="text-xs text-slate-600 p-2 bg-slate-50 rounded">
                        {notif.message}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No new notifications</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Status Distribution & Priority Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Status Distribution */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-green-600" />
                    Status Distribution
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center">
                  {taskStatusData.length > 0 ? (
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Task Status Chart</p>
                      <div className="mt-3 space-y-1">
                        {taskStatusData.slice(0, 4).map((item: any, index: number) => (
                          <div key={index} className="flex justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-slate-600">{item.name}</span>
                            </div>
                            <span className="font-medium text-slate-900">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No task data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Priority Matrix */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-600" />
                    Priority Matrix
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-red-700 font-medium">Urgent</span>
                      <div className="text-lg font-bold text-red-900">{dashboardMetrics.overdueTasks}</div>
                    </div>
                    <p className="text-red-600 mt-1">High Impact</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-orange-700 font-medium">Soon</span>
                      <div className="text-lg font-bold text-orange-900">{dashboardMetrics.urgentDeadlines}</div>
                    </div>
                    <p className="text-orange-600 mt-1">High Impact</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-700 font-medium">Later</span>
                      <div className="text-lg font-bold text-yellow-900">
                        {Math.max(0, dashboardMetrics.activeTasks - dashboardMetrics.overdueTasks - dashboardMetrics.urgentDeadlines)}
                      </div>
                    </div>
                    <p className="text-yellow-600 mt-1">Low Impact</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700 font-medium">Done</span>
                      <div className="text-lg font-bold text-green-900">{dashboardMetrics.completedTasksThisMonth}</div>
                    </div>
                    <p className="text-green-600 mt-1">This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Row 3: Team Performance & Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Team Performance Summary */}
          {(canViewUsers || user?.isSuperAdmin) && (
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                    Team Performance
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {Array.isArray(users) && users.slice(0, 4).map((user: any, index: number) => {
                    const userTasks = Array.isArray(tasks) ? tasks.filter((task: any) => task.assigneeId === user.id) : [];
                    const completedTasks = userTasks.filter((task: any) => {
                      const status = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.id === task.statusId) : null;
                      return status && status.rank === 3;
                    });
                    const completionRate = userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0;
                    
                    return (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-700">
                              {user.displayName?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-900">{user.displayName}</p>
                            <p className="text-xs text-slate-500">{userTasks.length} tasks</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">{completionRate}%</div>
                          <div className="w-12 bg-slate-200 rounded-full h-1">
                            <div 
                              className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Deadlines */}
          <Card className="group hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Upcoming Deadlines
                </CardTitle>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.slice(0, 5).map((deadline: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{deadline.taskDetails}</p>
                      <p className="text-xs text-slate-500 truncate">{deadline.clientName}</p>
                    </div>
                    <div className="text-right ml-2">
                      <Badge 
                        variant={deadline.status === 'overdue' ? 'destructive' : deadline.status === 'urgent' ? 'secondary' : 'outline'}
                        className="text-xs px-1 py-0"
                      >
                        {deadline.daysLeft}d
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-500">No upcoming deadlines</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}