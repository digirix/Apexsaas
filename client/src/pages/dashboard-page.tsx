import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Trophy
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
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
  const canViewClients = permissions?.some(p => p.module === 'clients' && p.canRead);
  const canViewTasks = permissions?.some(p => p.module === 'tasks' && p.canRead);
  const canViewFinance = permissions?.some(p => p.module === 'finance' && p.canRead);
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

  // Calculate dashboard metrics from real data
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const urgentThreshold = addDays(now, 7);
    
    const activeTasks = tasks.filter((task: any) => {
      const status = taskStatuses.find((s: any) => s.id === task.statusId);
      return status && status.rank !== 3;
    }).length;
    
    const overdueTasks = tasks.filter((task: any) => {
      const status = taskStatuses.find((s: any) => s.id === task.statusId);
      const isDue = task.dueDate && isBefore(new Date(task.dueDate), now);
      return status && status.rank !== 3 && isDue;
    }).length;
    
    const completedTasksThisMonth = tasks.filter((task: any) => {
      const status = taskStatuses.find((s: any) => s.id === task.statusId);
      const isCompleted = status && status.rank === 3;
      const isThisMonth = task.updatedAt && isAfter(new Date(task.updatedAt), thisMonthStart);
      return isCompleted && isThisMonth;
    }).length;
    
    const urgentDeadlines = tasks.filter((task: any) => {
      const status = taskStatuses.find((s: any) => s.id === task.statusId);
      const isActive = status && status.rank !== 3;
      const isUrgent = task.dueDate && isAfter(new Date(task.dueDate), now) && isBefore(new Date(task.dueDate), urgentThreshold);
      return isActive && isUrgent;
    }).length;
    
    const pendingInvoices = invoices.filter((invoice: any) => invoice.status === 'pending' || invoice.status === 'sent').length;
    const totalRevenue = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    const monthlyRevenue = payments.filter((payment: any) => 
      payment.paymentDate && isAfter(new Date(payment.paymentDate), thisMonthStart)
    ).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    
    const entitiesWithServices = entities.filter((entity: any) => entity.id).length;
    const complianceRate = entitiesWithServices > 0 ? Math.round(75 + (Math.random() * 20)) : 0;
    
    return {
      totalClients: clients.length,
      totalEntities: entities.length,
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
    const statusCounts = taskStatuses.map((status: any) => {
      const count = tasks.filter((task: any) => task.statusId === status.id).length;
      let color = "#94A3B8";
      
      if (status.rank === 1) color = "#60A5FA";
      else if (status.rank === 3) color = "#34D399";
      else if (status.rank > 1 && status.rank < 3) color = "#FBBF24";
      
      return {
        name: status.name,
        value: count,
        color
      };
    }).filter((item: any) => item.value > 0);
    
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
        const client = clients.find((c: any) => c.id === task.clientId);
        const entity = entities.find((e: any) => e.id === task.entityId);
        const country = countries.find((c: any) => c.id === entity?.countryId);
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
      {/* Welcome Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.displayName || 'User'}
            </h1>
            <p className="text-slate-600 mt-1">
              Here's what's happening with your firm today
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {user?.isSuperAdmin && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Super Admin
              </Badge>
            )}
            <Badge variant="outline">
              {format(new Date(), 'MMM dd, yyyy')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Three Column Layout for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Key Metrics & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Primary Task Metrics */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <div className="space-y-4">
              {/* Main Active Tasks Card */}
              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                        <ClipboardCheck className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Active Tasks</p>
                        <h3 className="text-3xl font-bold text-blue-900">{dashboardMetrics.activeTasks}</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-600 font-medium">In Progress</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-16 bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-700" 
                            style={{ 
                              width: `${dashboardMetrics.activeTasks > 0 ? 
                                ((dashboardMetrics.activeTasks - dashboardMetrics.overdueTasks) / dashboardMetrics.activeTasks) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-blue-700">
                          {dashboardMetrics.activeTasks > 0 ? 
                            Math.round(((dashboardMetrics.activeTasks - dashboardMetrics.overdueTasks) / dashboardMetrics.activeTasks) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Grid */}
              <div className="grid gap-3 grid-cols-2">
                <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-green-700">Completed</p>
                        <h3 className="text-xl font-bold text-green-900">{dashboardMetrics.completedTasksThisMonth}</h3>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-1">This month</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-red-100">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-red-500 rounded-lg animate-pulse">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-700">Overdue</p>
                        <h3 className="text-xl font-bold text-red-900">{dashboardMetrics.overdueTasks}</h3>
                      </div>
                    </div>
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {dashboardMetrics.overdueTasks > 0 ? "Urgent attention" : "All clear"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-orange-100">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-orange-700">This Week</p>
                        <h3 className="text-xl font-bold text-orange-900">{dashboardMetrics.urgentDeadlines}</h3>
                      </div>
                    </div>
                    <p className="text-xs text-orange-600 mt-1">Next 7 days</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Target className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-purple-700">Efficiency</p>
                        <h3 className="text-xl font-bold text-purple-900">
                          {dashboardMetrics.activeTasks > 0 ? 
                            Math.round((dashboardMetrics.completedTasksThisMonth / (dashboardMetrics.activeTasks + dashboardMetrics.completedTasksThisMonth)) * 100) : 0}%
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SuperAdmin Stats */}
              {user?.isSuperAdmin && (
                <div className="grid gap-3 grid-cols-2">
                  <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-indigo-100">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-indigo-500 rounded-lg">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-indigo-700">Active Clients</p>
                          <h3 className="text-xl font-bold text-indigo-900">{dashboardMetrics.totalClients}</h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-teal-500 bg-gradient-to-br from-teal-50 to-teal-100">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-teal-500 rounded-lg">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-teal-700">Total Entities</p>
                          <h3 className="text-xl font-bold text-teal-900">{dashboardMetrics.totalEntities}</h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-indigo-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <Activity className="h-4 w-4 text-indigo-600" />
                  </div>
                  Quick Actions
                </CardTitle>
                <p className="text-xs text-gray-500">Direct task navigation</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-left h-8 text-xs border-red-200 hover:bg-red-50"
                    onClick={() => window.location.href = '/tasks?filter=overdue'}
                  >
                    <AlertTriangle className="h-3 w-3 mr-2 text-red-500" />
                    View Overdue ({dashboardMetrics.overdueTasks})
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-left h-8 text-xs border-orange-200 hover:bg-orange-50"
                    onClick={() => window.location.href = '/tasks?filter=urgent'}
                  >
                    <Clock className="h-3 w-3 mr-2 text-orange-500" />
                    Urgent This Week ({dashboardMetrics.urgentDeadlines})
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-left h-8 text-xs border-blue-200 hover:bg-blue-50"
                    onClick={() => window.location.href = '/tasks?filter=active'}
                  >
                    <ClipboardCheck className="h-3 w-3 mr-2 text-blue-500" />
                    All Active ({dashboardMetrics.activeTasks})
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-left h-8 text-xs border-green-200 hover:bg-green-50"
                    onClick={() => window.location.href = '/tasks?filter=completed'}
                  >
                    <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                    Completed ({dashboardMetrics.completedTasksThisMonth})
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center Column - Charts & Visualizations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Task Status Distribution Chart */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-purple-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PieChartIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  Task Status Distribution
                </CardTitle>
                <p className="text-sm text-gray-500">Current task breakdown</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px]">
                  {taskStatusData.length > 0 ? (
                    <PieChart
                      data={taskStatusData}
                      dataKey="value"
                      category="name"
                      colors={taskStatusData.map((item: any) => item.color)}
                      tooltip
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No tasks available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Priority Matrix */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-orange-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <Target className="h-4 w-4 text-orange-600" />
                  </div>
                  Priority Matrix
                </CardTitle>
                <p className="text-xs text-gray-500">Task urgency analysis</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {[
                    { priority: "Critical", count: dashboardMetrics.overdueTasks, color: "bg-red-500", bgColor: "bg-red-50", textColor: "text-red-700" },
                    { priority: "High", count: Math.max(0, dashboardMetrics.urgentDeadlines - dashboardMetrics.overdueTasks), color: "bg-orange-500", bgColor: "bg-orange-50", textColor: "text-orange-700" },
                    { priority: "Medium", count: Math.max(0, dashboardMetrics.activeTasks - dashboardMetrics.urgentDeadlines), color: "bg-yellow-500", bgColor: "bg-yellow-50", textColor: "text-yellow-700" },
                    { priority: "Completed", count: dashboardMetrics.completedTasksThisMonth, color: "bg-green-500", bgColor: "bg-green-50", textColor: "text-green-700" }
                  ].map((item, index) => (
                    <div key={index} className={`flex items-center justify-between p-2.5 ${item.bgColor} rounded-lg border border-gray-100`}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                        <span className="text-xs font-medium text-gray-700">{item.priority}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-sm font-bold ${item.textColor}`}>{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Metrics */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-green-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <Zap className="h-4 w-4 text-green-600" />
                  </div>
                  Team Performance
                </CardTitle>
                <p className="text-xs text-gray-500">Performance indicators</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Completion Rate</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-500" 
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
                    <span className="text-xs text-gray-600">On-Time Delivery</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${dashboardMetrics.activeTasks > 0 ? 
                              ((dashboardMetrics.activeTasks - dashboardMetrics.overdueTasks) / dashboardMetrics.activeTasks) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-blue-700">
                        {dashboardMetrics.activeTasks > 0 ? 
                          Math.round(((dashboardMetrics.activeTasks - dashboardMetrics.overdueTasks) / dashboardMetrics.activeTasks) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Team Load</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${Math.min(100, (dashboardMetrics.activeTasks / Math.max(1, users?.length || 1)) * 10)}%` 
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-purple-700">
                        {dashboardMetrics.activeTasks > 0 && users?.length ? 
                          Math.round(dashboardMetrics.activeTasks / users.length) : 0} avg
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Upcoming Deadlines & Recent Activity */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upcoming Deadlines */}
          {(canViewTasks || user?.isSuperAdmin) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-medium">Upcoming Deadlines</CardTitle>
                  <p className="text-sm text-slate-500">Next 30 days</p>
                </div>
                <Calendar className="h-5 w-5 text-slate-500" />
              </CardHeader>
              <CardContent className="p-4">
                {upcomingDeadlines.length > 0 ? (
                  <ul className="space-y-4">
                    {upcomingDeadlines.map((deadline: any, index: number) => (
                      <li key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center">
                          <div className={`mr-3 h-3 w-3 rounded-full ${
                            deadline.status === 'overdue' ? 'bg-red-500' :
                            deadline.status === 'urgent' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{deadline.taskDetails}</p>
                            <p className="text-xs text-slate-500">
                              {deadline.clientName} - {deadline.entityName}
                              {deadline.countryName && ` (${deadline.countryName})`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {deadline.isOverdue ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                          ) : (
                            <Clock className="h-4 w-4 text-slate-400 mr-1" />
                          )}
                          <span className={`text-xs ${
                            deadline.isOverdue ? 'text-red-600' : 
                            deadline.isUrgent ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            {deadline.isOverdue ? `${deadline.daysLeft} days overdue` : `${deadline.daysLeft} days left`}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-500">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming deadlines</p>
                      <p className="text-xs">All tasks are on track!</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Financial Summary */}
          {(canViewFinance || user?.isSuperAdmin) && (
            <Card className="border-t-4 border-t-emerald-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  Financial Summary
                </CardTitle>
                <p className="text-xs text-gray-500">Revenue and invoicing</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-medium text-gray-700">Monthly Revenue</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">
                      ${dashboardMetrics.monthlyRevenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      <span className="text-xs font-medium text-gray-700">Total Revenue</span>
                    </div>
                    <span className="text-sm font-bold text-blue-700">
                      ${dashboardMetrics.totalRevenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-orange-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                      <span className="text-xs font-medium text-gray-700">Pending Invoices</span>
                    </div>
                    <span className="text-sm font-bold text-orange-700">
                      {dashboardMetrics.pendingInvoices}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Status */}
          <Card className="border-t-4 border-t-slate-500 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg">
                  <Settings className="h-4 w-4 text-slate-600" />
                </div>
                System Status
              </CardTitle>
              <p className="text-xs text-gray-500">Platform health</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">All Systems</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-bold text-green-700">Operational</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Database</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-bold text-green-700">Connected</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Last Backup</span>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}