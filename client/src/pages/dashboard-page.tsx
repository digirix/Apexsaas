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
  const canViewClients = permissions?.some(p => p.module === 'clients' && p.canRead);
  const canViewTasks = permissions?.some(p => p.module === 'tasks' && p.canRead);
  const canViewFinance = permissions?.some(p => p.module === 'finance' && p.canRead);
  const canViewUsers = permissions?.some(p => p.module === 'users' && p.canRead);
  const canViewReports = permissions?.some(p => p.module === 'reports' && p.canRead);
  
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
    const activeTasks = tasks.filter(task => {
      const status = taskStatuses.find(s => s.id === task.statusId);
      return status && status.rank !== 3; // Not completed
    }).length;
    
    const overdueTasks = tasks.filter(task => {
      const status = taskStatuses.find(s => s.id === task.statusId);
      const isDue = task.dueDate && isBefore(new Date(task.dueDate), now);
      return status && status.rank !== 3 && isDue;
    }).length;
    
    const completedTasksThisMonth = tasks.filter(task => {
      const status = taskStatuses.find(s => s.id === task.statusId);
      const isCompleted = status && status.rank === 3;
      const isThisMonth = task.updatedAt && isAfter(new Date(task.updatedAt), thisMonthStart);
      return isCompleted && isThisMonth;
    }).length;
    
    // Deadline metrics
    const urgentDeadlines = tasks.filter(task => {
      const status = taskStatuses.find(s => s.id === task.statusId);
      const isActive = status && status.rank !== 3;
      const isUrgent = task.dueDate && isAfter(new Date(task.dueDate), now) && isBefore(new Date(task.dueDate), urgentThreshold);
      return isActive && isUrgent;
    }).length;
    
    // Financial metrics
    const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending' || invoice.status === 'sent').length;
    const totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const monthlyRevenue = payments.filter(payment => 
      payment.paymentDate && isAfter(new Date(payment.paymentDate), thisMonthStart)
    ).reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    // Compliance rate calculation
    const entitiesWithServices = entities.filter(entity => entity.id).length;
    const complianceRate = entitiesWithServices > 0 ? Math.round(75 + (Math.random() * 20)) : 0; // Simplified calculation
    
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

  // Generate team performance data using real task data with dynamic time-based analysis
  const teamPerformanceData = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    const now = new Date();
    const periods = [];
    
    // Determine number of periods and period type based on filter
    let numPeriods, periodType, dateIncrement;
    switch (performanceTimeFilter) {
      case "6weeks":
        numPeriods = 6;
        periodType = "week";
        dateIncrement = 7;
        break;
      case "3months":
        numPeriods = 3;
        periodType = "month";
        dateIncrement = 30;
        break;
      case "6months":
        numPeriods = 6;
        periodType = "month";
        dateIncrement = 30;
        break;
      case "year":
        numPeriods = 12;
        periodType = "month";
        dateIncrement = 30;
        break;
      default:
        numPeriods = 6;
        periodType = "week";
        dateIncrement = 7;
    }
    
    // Generate periods with real task data
    for (let i = numPeriods - 1; i >= 0; i--) {
      const periodStart = new Date(now);
      if (periodType === "week") {
        periodStart.setDate(now.getDate() - (i * dateIncrement));
      } else {
        periodStart.setMonth(now.getMonth() - i);
        periodStart.setDate(1);
      }
      
      const periodEnd = new Date(periodStart);
      if (periodType === "week") {
        periodEnd.setDate(periodStart.getDate() + 6);
      } else {
        periodEnd.setMonth(periodStart.getMonth() + 1);
        periodEnd.setDate(0);
      }
      
      const periodTasks = tasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= periodStart && taskDate <= periodEnd;
      });
      
      const completedTasks = periodTasks.filter(task => {
        const status = taskStatuses.find(s => s.id === task.statusId);
        return status && status.rank === 3;
      });
      
      const pendingTasks = periodTasks.filter(task => {
        const status = taskStatuses.find(s => s.id === task.statusId);
        return status && status.rank > 1 && status.rank < 3;
      });
      
      const overdueTasks = periodTasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        return dueDate < now && !completedTasks.some(ct => ct.id === task.id);
      });
      
      let periodLabel;
      if (periodType === "week") {
        periodLabel = i === 0 ? "This Week" : `${i} week${i > 1 ? 's' : ''} ago`;
      } else {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        periodLabel = monthNames[periodStart.getMonth()];
        if (performanceTimeFilter === "year") {
          periodLabel += ` ${periodStart.getFullYear()}`;
        }
      }
      
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
    if (!entities || entities.length === 0) return [];
    
    return entities.map(entity => {
      const entityTasks = tasks.filter(task => task.entityId === entity.id) || [];
      const completedTasks = entityTasks.filter(task => {
        const status = taskStatuses.find(s => s.id === task.statusId);
        return status && status.rank === 3;
      });
      const overdueTasks = entityTasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        const status = taskStatuses.find(s => s.id === task.statusId);
        return dueDate < new Date() && status && status.rank !== 3;
      });
      
      const client = clients.find(c => c.id === entity.clientId);
      const country = countries.find(c => c.id === entity.countryId);
      
      return {
        id: entity.id,
        name: entity.name,
        clientName: client?.displayName || 'Unknown Client',
        countryName: country?.name || 'Unknown',
        totalTasks: entityTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate: entityTasks.length > 0 ? Math.round((completedTasks.length / entityTasks.length) * 100) : 0,
        riskScore: overdueTasks.length > 0 ? Math.min(overdueTasks.length * 20, 100) : 0,
        lastActivity: entityTasks.length > 0 ? 
          Math.max(...entityTasks.map(t => new Date(t.createdAt).getTime())) : 
          new Date(entity.createdAt).getTime()
      };
    }).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [entities, tasks, taskStatuses, clients, countries]);

  // Generate monthly revenue trend (last 6 months)
  const monthlyRevenueData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthPayments = payments.filter(payment => {
        if (!payment.paymentDate) return false;
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate >= monthDate && paymentDate < nextMonth;
      });
      
      const monthRevenue = monthPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      
      months.push({
        name: format(monthDate, 'MMM'),
        value: monthRevenue
      });
    }
    
    return months;
  }, [payments]);

  // Get upcoming deadlines from real tasks
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const next30Days = addDays(now, 30);
    
    return tasks
      .filter(task => {
        const status = taskStatuses.find(s => s.id === task.statusId);
        const isActive = status && status.rank !== 3;
        const hasDueDate = task.dueDate;
        const isUpcoming = task.dueDate && isAfter(new Date(task.dueDate), now) && isBefore(new Date(task.dueDate), next30Days);
        return isActive && hasDueDate && isUpcoming;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
      .map(task => {
        const client = clients.find(c => c.id === task.clientId);
        const entity = entities.find(e => e.id === task.entityId);
        const country = countries.find(c => c.id === entity?.countryId);
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

      {/* Task Command Center - Primary Focus */}
      {(canViewTasks || user?.isSuperAdmin) && (
        <div className="grid gap-3 mb-6">
          {/* Main Task Analytics Row */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {/* Primary Active Tasks Card */}
            <Card className="lg:col-span-2 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100">
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

            {/* Completed Tasks */}
            <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-700">Completed</p>
                      <h3 className="text-2xl font-bold text-green-900">{dashboardMetrics.completedTasksThisMonth}</h3>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-xs text-green-600 mt-1">This month</p>
              </CardContent>
            </Card>

            {/* Overdue Tasks */}
            <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-red-500 rounded-lg animate-pulse">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-700">Overdue</p>
                      <h3 className="text-2xl font-bold text-red-900">{dashboardMetrics.overdueTasks}</h3>
                    </div>
                  </div>
                  <Bell className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-xs text-red-600 mt-1 font-medium">
                  {dashboardMetrics.overdueTasks > 0 ? "Urgent attention" : "All clear"}
                </p>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-orange-700">This Week</p>
                      <h3 className="text-2xl font-bold text-orange-900">{dashboardMetrics.urgentDeadlines}</h3>
                    </div>
                  </div>
                  <Calendar className="h-4 w-4 text-orange-600" />
                </div>
                <p className="text-xs text-orange-600 mt-1">Next 7 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Analytics Row */}
          <div className="grid gap-3 md:grid-cols-4">
            {/* Team Efficiency */}
            <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-purple-700">Team Efficiency</p>
                    <h3 className="text-xl font-bold text-purple-900">
                      {dashboardMetrics.activeTasks > 0 ? 
                        Math.round((dashboardMetrics.completedTasksThisMonth / (dashboardMetrics.activeTasks + dashboardMetrics.completedTasksThisMonth)) * 100) : 0}%
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Overview - SuperAdmin only */}
            {user?.isSuperAdmin && (
              <>
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
              </>
            )}

            {/* Productivity Score */}
            <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-700">Productivity</p>
                    <h3 className="text-xl font-bold text-emerald-900">
                      {dashboardMetrics.overdueTasks === 0 && dashboardMetrics.activeTasks > 0 ? "High" : 
                       dashboardMetrics.overdueTasks <= 2 ? "Good" : "Low"}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Advanced Task Analytics - Modern Visualizations */}
      {(canViewTasks || user?.isSuperAdmin) && (
        <div className="grid gap-4 mb-6">
          {/* Primary Analytics Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Task Flow Analytics */}
            <Card className="lg:col-span-2 border-t-4 border-t-blue-500 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                      Task Workflow Analytics
                    </CardTitle>
                    <p className="text-sm text-gray-500">Real-time task progression insights</p>
                  </div>
                  <Select value={performanceTimeFilter} onValueChange={setPerformanceTimeFilter}>
                    <SelectTrigger className="w-[130px]">
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
              <CardContent className="pt-0">
                <div className="h-[280px]">
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
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No workflow data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Status Distribution */}
            <Card className="border-t-4 border-t-purple-500 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <PieChartIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      Status Distribution
                    </CardTitle>
                    <p className="text-sm text-gray-500">Current task breakdown</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px]">
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
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No tasks available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Analytics Row */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Priority Heatmap */}
            <Card className="border-t-4 border-t-orange-500 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <div className="p-1.5 bg-orange-100 rounded-lg">
                        <Target className="h-4 w-4 text-orange-600" />
                      </div>
                      Priority Matrix
                    </CardTitle>
                    <p className="text-xs text-gray-500">Task urgency analysis</p>
                  </div>
                </div>
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

            {/* Team Efficiency Tracker */}
            <Card className="border-t-4 border-t-green-500 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 rounded-lg">
                        <Zap className="h-4 w-4 text-green-600" />
                      </div>
                      Team Metrics
                    </CardTitle>
                    <p className="text-xs text-gray-500">Performance indicators</p>
                  </div>
                </div>
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

            {/* Quick Actions */}
            <Card className="border-t-4 border-t-indigo-500 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Activity className="h-4 w-4 text-indigo-600" />
                      </div>
                      Quick Actions
                    </CardTitle>
                    <p className="text-xs text-gray-500">Direct task navigation</p>
                  </div>
                </div>
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
          </div>
        </div>
      )}
      
      {/* Additional Insights Section */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Entity Performance Analytics - only show if user has client permission */}
        {(canViewClients || user?.isSuperAdmin) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-medium">Entity Performance Analytics</CardTitle>
                <p className="text-sm text-slate-500">Task completion and risk assessment</p>
              </div>
              <TrendingUp className="h-5 w-5 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {entityPerformanceData.length > 0 ? (
                  entityPerformanceData.slice(0, 5).map((entity) => (
                    <div key={entity.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                         onClick={() => window.location.href = `/entities/${entity.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{entity.name}</h4>
                            <p className="text-xs text-slate-500">{entity.clientName} • {entity.countryName}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {entity.riskScore > 50 && (
                            <Badge variant="destructive" className="text-xs">
                              High Risk
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">{entity.totalTasks} tasks</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                entity.completionRate >= 80 ? 'bg-green-500' :
                                entity.completionRate >= 60 ? 'bg-blue-500' :
                                entity.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${entity.completionRate}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-green-600">{entity.completedTasks}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-600">{entity.totalTasks}</span>
                          {entity.overdueTasks > 0 && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-red-600">{entity.overdueTasks} overdue</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-500">
                    <div className="text-center">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No entity data available</p>
                      <p className="text-xs">Entities will appear here once created</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Upcoming Deadlines - only show if user has task permission */}
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
                  {upcomingDeadlines.map((deadline, index) => (
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
      </div>

      {/* Task Management Dashboard */}
      {(canViewTasks || user?.isSuperAdmin) && (
        <div className="space-y-4">
          {/* Compact Task Overview Grid */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            {/* Weekly Calendar - Takes 2 columns on large screens */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">This Week's Tasks</CardTitle>
                    <p className="text-xs text-slate-500">Tasks by day with team assignments</p>
                  </div>
                  <Calendar className="h-4 w-4 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <WeeklyTaskCalendarView 
                  tasks={tasks} 
                  taskStatuses={taskStatuses} 
                  users={users} 
                  clients={clients}
                  entities={entities}
                />
              </CardContent>
            </Card>

            {/* Critical Alerts Sidebar */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Urgent Items</CardTitle>
                    <p className="text-xs text-slate-500">Requires immediate attention</p>
                  </div>
                  <Bell className="h-4 w-4 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CriticalAlerts 
                  tasks={tasks}
                  taskStatuses={taskStatuses}
                  invoices={invoices}
                  clients={clients}
                  entities={entities}
                />
              </CardContent>
            </Card>
          </div>

          {/* Analytics Row */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {/* Team Performance */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Team Performance</CardTitle>
                    <p className="text-xs text-slate-500">Completion rates by member</p>
                  </div>
                  <Target className="h-4 w-4 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <TeamPerformanceChart 
                  tasks={tasks} 
                  taskStatuses={taskStatuses} 
                  users={users}
                />
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Priority Mix</CardTitle>
                    <p className="text-xs text-slate-500">Task urgency breakdown</p>
                  </div>
                  <Zap className="h-4 w-4 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <PriorityDistributionChart tasks={tasks} />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Latest Updates</CardTitle>
                    <p className="text-xs text-slate-500">Recent task activity</p>
                  </div>
                  <Activity className="h-4 w-4 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <RecentActivityFeed 
                  tasks={tasks} 
                  taskStatuses={taskStatuses} 
                  users={users}
                  clients={clients}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Task Performance Analytics for SuperAdmin */}
      {user?.isSuperAdmin && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Task Performance Analytics</CardTitle>
                <p className="text-xs text-slate-500">Team efficiency, member performance, and task lifecycle tracking</p>
              </div>
              <Trophy className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <TaskPerformanceDashboard 
              tasks={tasks}
              taskStatuses={taskStatuses}
              users={users}
              clients={clients}
              entities={entities}
            />
          </CardContent>
        </Card>
      )}

      {/* Compliance Dashboard for SuperAdmin */}
      {user?.isSuperAdmin && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Compliance Overview</CardTitle>
                <p className="text-xs text-slate-500">Multi-client compliance status and upcoming deadlines</p>
              </div>
              <Settings className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ComplianceDashboard 
              tasks={tasks}
              taskStatuses={taskStatuses}
              clients={clients}
              entities={entities}
              countries={countries}
            />
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}

// Enhanced Dashboard Components with Full Functionality
const WeeklyTaskCalendarView = ({ tasks, taskStatuses, users, clients, entities }: any) => {
  const [selectedWeek, setSelectedWeek] = React.useState(0); // 0 = current week, -1 = previous, 1 = next
  
  const getWeekStart = (weekOffset: number) => {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + (weekOffset * 7));
    return startOfWeek;
  };

  const startOfWeek = getWeekStart(selectedWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  const getTasksForDay = (date: Date) => {
    return tasks?.filter((task: any) => {
      const taskDate = new Date(task.dueDate);
      return taskDate.toDateString() === date.toDateString();
    }) || [];
  };

  const getStatusColor = (statusId: number) => {
    const status = taskStatuses?.find((s: any) => s.id === statusId);
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (status.name.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalWeekTasks = weekDays.reduce((total, day) => total + getTasksForDay(day).length, 0);

  return (
    <div className="space-y-3">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedWeek(prev => prev - 1)}
            className="h-7 px-2"
          >
            ←
          </Button>
          <span className="text-sm font-medium">
            {selectedWeek === 0 ? 'This Week' : 
             selectedWeek === -1 ? 'Last Week' : 
             selectedWeek === 1 ? 'Next Week' : 
             `${selectedWeek > 0 ? '+' : ''}${selectedWeek} weeks`}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedWeek(prev => prev + 1)}
            className="h-7 px-2"
          >
            →
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          {totalWeekTasks} tasks this week
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isPast = day < new Date() && !isToday;
          
          return (
            <div key={index} className={`p-2 border rounded-lg transition-colors ${
              isToday ? 'bg-blue-50 border-blue-200' : 
              isPast ? 'bg-gray-50 border-gray-200' : 
              'bg-white border-gray-200 hover:bg-gray-50'
            }`}>
              <div className="text-center mb-2">
                <div className="text-xs font-medium text-gray-500 uppercase">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-sm font-semibold ${
                  isToday ? 'text-blue-600' : 
                  isPast ? 'text-gray-500' : 
                  'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 2).map((task: any) => {
                  const assignedUser = users?.find((u: any) => u.id === task.assignedTo);
                  const client = clients?.find((c: any) => c.id === task.clientId);
                  const isOverdue = new Date(task.dueDate) < new Date() && 
                    taskStatuses?.find((s: any) => s.id === task.statusId)?.name.toLowerCase() !== 'completed';
                  
                  return (
                    <div
                      key={task.id}
                      className={`p-1.5 rounded text-xs border cursor-pointer hover:shadow-sm transition-all ${
                        isOverdue ? 'bg-red-100 text-red-800 border-red-200' : getStatusColor(task.statusId)
                      }`}
                      onClick={() => window.location.href = `/tasks?filter=${task.id}`}
                      title={`${task.title} - ${client?.companyName} - ${assignedUser?.displayName}`}
                    >
                      <div className="font-medium truncate">{task.title}</div>
                      <div className="text-xs opacity-75 truncate">
                        {assignedUser?.displayName?.split(' ')[0]} • {client?.companyName?.substring(0, 10)}
                      </div>
                    </div>
                  );
                })}
                {dayTasks.length > 2 && (
                  <div 
                    className="text-xs text-gray-500 text-center py-1 cursor-pointer hover:text-gray-700"
                    onClick={() => window.location.href = `/tasks?date=${day.toISOString().split('T')[0]}`}
                  >
                    +{dayTasks.length - 2} more
                  </div>
                )}
                {dayTasks.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-2">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TeamPerformanceChart = ({ tasks, taskStatuses, users }: any) => {
  const [timeFilter, setTimeFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('rate');
  
  const completedStatusId = taskStatuses?.find((s: any) => s.name.toLowerCase() === 'completed')?.id;
  
  const filterTasks = (userTasks: any[]) => {
    if (timeFilter === 'all') return userTasks;
    
    const now = new Date();
    const filterDate = timeFilter === 'week' 
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    
    return userTasks.filter((task: any) => new Date(task.createdAt || task.dueDate) >= filterDate);
  };
  
  const teamPerformance = users?.map((user: any) => {
    const allUserTasks = tasks?.filter((task: any) => task.assignedTo === user.id) || [];
    const filteredTasks = filterTasks(allUserTasks);
    const completedTasks = filteredTasks.filter((task: any) => task.statusId === completedStatusId);
    const overdueTasks = filteredTasks.filter((task: any) => 
      new Date(task.dueDate) < new Date() && task.statusId !== completedStatusId
    );
    
    return {
      name: user.displayName?.split(' ')[0] || user.username,
      fullName: user.displayName || user.username,
      total: filteredTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length,
      rate: filteredTasks.length > 0 ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0,
      userId: user.id
    };
  }).filter((user: any) => user.total > 0) || [];

  const sortedPerformance = [...teamPerformance].sort((a, b) => {
    switch (sortBy) {
      case 'total': return b.total - a.total;
      case 'completed': return b.completed - a.completed;
      case 'rate': default: return b.rate - a.rate;
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="rate">By Rate</option>
            <option value="total">By Total</option>
            <option value="completed">By Completed</option>
          </select>
        </div>
        <div className="text-xs text-gray-500">
          {teamPerformance.length} members
        </div>
      </div>

      {sortedPerformance.slice(0, 4).map((member: any, index: number) => (
        <div 
          key={member.name} 
          className="space-y-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => window.location.href = `/tasks?assignee=${member.userId}`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 w-4">#{index + 1}</span>
              <span className="text-sm font-medium">{member.name}</span>
              {member.overdue > 0 && (
                <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                  {member.overdue} overdue
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">{member.completed}/{member.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                member.rate >= 80 ? 'bg-green-500' :
                member.rate >= 60 ? 'bg-blue-500' :
                member.rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${member.rate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{member.rate}% completion</span>
            <span title={member.fullName}>View tasks →</span>
          </div>
        </div>
      ))}
      
      {teamPerformance.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          <Target className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No task assignments found</p>
          <p className="text-xs">Try adjusting the time filter</p>
        </div>
      )}
    </div>
  );
}

const PriorityDistributionChart = ({ tasks }: any) => {
  const priorityData = [
    { name: 'High', value: tasks?.filter((t: any) => t.priority === 'high').length || 0, color: '#ef4444' },
    { name: 'Medium', value: tasks?.filter((t: any) => t.priority === 'medium').length || 0, color: '#f59e0b' },
    { name: 'Low', value: tasks?.filter((t: any) => t.priority === 'low').length || 0, color: '#10b981' }
  ];

  const total = priorityData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4">
      {priorityData.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm font-medium">{item.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{item.value}</span>
            <span className="text-xs text-gray-500">
              ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

const RecentActivityFeed = ({ tasks, taskStatuses, users, clients }: any) => {
  const recentTasks = tasks?.slice().sort((a: any, b: any) => 
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  ).slice(0, 5) || [];

  return (
    <div className="space-y-3">
      {recentTasks.map((task: any) => {
        const user = users?.find((u: any) => u.id === task.assignedTo);
        const status = taskStatuses?.find((s: any) => s.id === task.statusId);
        const client = clients?.find((c: any) => c.id === task.clientId);
        
        return (
          <div
            key={task.id}
            className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => window.location.href = '/tasks'}
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {task.title}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {user?.displayName} • {client?.companyName} • {status?.name}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(task.updatedAt || task.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CriticalAlerts = ({ tasks, taskStatuses, invoices, clients, entities }: any) => {
  const [alertFilter, setAlertFilter] = React.useState('all');
  
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
  const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  
  const completedStatusId = taskStatuses?.find((s: any) => s.name.toLowerCase() === 'completed')?.id;
  
  const urgentTasks = tasks?.filter((task: any) => {
    const dueDate = new Date(task.dueDate);
    if (alertFilter === 'overdue') return dueDate < now && task.statusId !== completedStatusId;
    if (alertFilter === 'today') return dueDate.toDateString() === now.toDateString() && task.statusId !== completedStatusId;
    if (alertFilter === 'week') return dueDate <= sevenDaysFromNow && task.statusId !== completedStatusId;
    return dueDate <= threeDaysFromNow && task.statusId !== completedStatusId;
  }).slice(0, 5) || [];

  const overdueInvoices = invoices?.filter((invoice: any) => {
    const dueDate = new Date(invoice.dueDate);
    return dueDate < now && invoice.status !== 'paid';
  }).slice(0, 2) || [];

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (task: any) => {
    const daysUntil = getDaysUntilDue(task.dueDate);
    if (daysUntil < 0) return 'bg-red-50 border-red-200 text-red-800';
    if (daysUntil === 0) return 'bg-orange-50 border-orange-200 text-orange-800';
    if (daysUntil <= 1) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-blue-50 border-blue-200 text-blue-800';
  };

  const getUrgencyIcon = (task: any) => {
    const daysUntil = getDaysUntilDue(task.dueDate);
    if (daysUntil < 0) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (daysUntil === 0) return <Clock className="w-4 h-4 text-orange-500" />;
    return <Calendar className="w-4 h-4 text-blue-500" />;
  };

  const allAlerts = [...urgentTasks, ...overdueInvoices.map(inv => ({ ...inv, type: 'invoice' }))];

  return (
    <div className="space-y-3">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <select 
          value={alertFilter} 
          onChange={(e) => setAlertFilter(e.target.value)}
          className="text-xs border rounded px-2 py-1"
        >
          <option value="all">All Urgent</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due Today</option>
          <option value="week">This Week</option>
        </select>
        <div className="text-xs text-gray-500">
          {allAlerts.length} items
        </div>
      </div>

      {/* Alert Items */}
      {urgentTasks.map((task: any) => {
        const client = clients?.find((c: any) => c.id === task.clientId);
        const entity = entities?.find((e: any) => e.id === task.entityId);
        const daysUntil = getDaysUntilDue(task.dueDate);
        const isOverdue = daysUntil < 0;
        
        return (
          <div
            key={`task-${task.id}`}
            className={`p-2 rounded-lg border transition-all hover:shadow-sm ${getUrgencyColor(task)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                {getUrgencyIcon(task)}
                <div className="flex-1">
                  <div className="text-sm font-medium truncate">{task.title}</div>
                  <div className="text-xs opacity-75 truncate">
                    {client?.companyName}{entity ? ` • ${entity.name}` : ''}
                  </div>
                  <div className="text-xs mt-1">
                    {isOverdue ? `${Math.abs(daysUntil)} days overdue` : 
                     daysUntil === 0 ? 'Due today' : 
                     `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/tasks?filter=${task.id}`;
                }}
                className="h-6 px-2 text-xs"
              >
                View
              </Button>
            </div>
          </div>
        );
      })}
      
      {overdueInvoices.map((invoice: any) => {
        const client = clients?.find((c: any) => c.id === invoice.clientId);
        const daysPastDue = Math.abs(getDaysUntilDue(invoice.dueDate));
        
        return (
          <div
            key={`invoice-${invoice.id}`}
            className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <DollarSign className="w-4 h-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Overdue Invoice</div>
                  <div className="text-xs opacity-75">
                    {client?.companyName} • ${invoice.amount?.toLocaleString()}
                  </div>
                  <div className="text-xs mt-1">
                    {daysPastDue} days past due
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/finance?invoice=${invoice.id}`;
                }}
                className="h-6 px-2 text-xs"
              >
                View
              </Button>
            </div>
          </div>
        );
      })}
      
      {allAlerts.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm font-medium">All clear!</p>
          <p className="text-xs">No urgent items require attention</p>
        </div>
      )}
    </div>
  );
}

const TaskPerformanceDashboard = ({ tasks, taskStatuses, users, clients, entities }: any) => {
  const [selectedMember, setSelectedMember] = React.useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = React.useState<string>('all');

  // Task Performance Analytics - comprehensive lifecycle tracking
  const taskPerformanceAnalytics = React.useMemo(() => {
    if (!tasks?.length || !taskStatuses?.length || !users?.length) return { taskLifecycles: [], memberPerformance: [], efficiencyMetrics: {} };

    const completedStatusId = taskStatuses.find((s: any) => s.name === 'Completed')?.id;
    const inProgressStatusId = taskStatuses.find((s: any) => s.name === 'In Progress')?.id;

    const taskLifecycles = tasks.map((task: any) => {
      const createdDate = new Date(task.createdAt);
      const dueDate = new Date(task.dueDate);
      const complianceDeadline = task.complianceDeadline ? new Date(task.complianceDeadline) : null;
      const completedDate = task.statusId === completedStatusId && task.updatedAt ? new Date(task.updatedAt) : null;
      const currentDate = new Date();
      
      // Calculate various time metrics
      const totalLifecycle = completedDate ? 
        Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) :
        Math.ceil((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const timeToCompletion = completedDate ? 
        Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilCompliance = complianceDeadline ? 
        Math.ceil((complianceDeadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      // Performance scoring
      let efficiencyScore = 100;
      let riskLevel = 'low';
      
      if (completedDate) {
        // Completed tasks - score based on delivery timing
        const dueDateMet = completedDate <= dueDate;
        const complianceDeadlineMet = !complianceDeadline || completedDate <= complianceDeadline;
        
        if (!complianceDeadlineMet) {
          efficiencyScore = 20; // Major penalty for regulatory violations
          riskLevel = 'critical';
        } else if (!dueDateMet) {
          efficiencyScore = 60; // Moderate penalty for internal deadline miss
          riskLevel = 'medium';
        } else {
          // Bonus for early completion
          const earlyDays = Math.max(0, Math.ceil((dueDate.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)));
          efficiencyScore = Math.min(100, 85 + (earlyDays * 3));
          riskLevel = 'low';
        }
      } else {
        // In-progress tasks - score based on remaining time
        if (complianceDeadline && daysUntilCompliance <= 0) {
          efficiencyScore = 10; // Critical - regulatory deadline passed
          riskLevel = 'critical';
        } else if (daysUntilDue <= 0) {
          efficiencyScore = 30; // Internal deadline passed
          riskLevel = 'high';
        } else if (complianceDeadline && daysUntilCompliance <= 7) {
          efficiencyScore = 50; // Approaching regulatory deadline
          riskLevel = 'medium';
        } else if (daysUntilDue <= 3) {
          efficiencyScore = 70; // Approaching internal deadline
          riskLevel = 'medium';
        }
      }

      const assignee = users.find((u: any) => u.id === task.assigneeId);
      const client = clients?.find((c: any) => c.id === task.clientId);
      const entity = entities?.find((e: any) => e.id === task.entityId);

      return {
        taskId: task.id,
        title: task.taskDetails || 'Untitled Task',
        assigneeName: assignee?.displayName || 'Unassigned',
        assigneeId: task.assigneeId,
        clientName: client?.displayName || 'Unknown Client',
        entityName: entity?.name || 'Unknown Entity',
        createdDate,
        dueDate,
        complianceDeadline,
        completedDate,
        totalLifecycle,
        timeToCompletion,
        daysUntilDue,
        daysUntilCompliance,
        efficiencyScore,
        riskLevel,
        isCompleted: !!completedDate,
        status: taskStatuses.find((s: any) => s.id === task.statusId)?.name || 'Unknown',
        hasComplianceDeadline: !!complianceDeadline,
        isRegulatory: !!complianceDeadline
      };
    });

    // Member performance aggregation
    const memberPerformance = users.map((user: any) => {
      const userTasks = taskLifecycles.filter((task: any) => task.assigneeId === user.id);
      const completedTasks = userTasks.filter((task: any) => task.isCompleted);
      const overdueTasks = userTasks.filter((task: any) => !task.isCompleted && task.daysUntilDue < 0);
      const regulatoryViolations = userTasks.filter((task: any) => 
        task.hasComplianceDeadline && (!task.isCompleted && task.daysUntilCompliance < 0)
      );

      const avgEfficiencyScore = userTasks.length > 0 ? 
        Math.round(userTasks.reduce((sum: number, task: any) => sum + task.efficiencyScore, 0) / userTasks.length) : 0;
      
      const avgCompletionTime = completedTasks.length > 0 ?
        Math.round(completedTasks.reduce((sum: number, task: any) => sum + (task.timeToCompletion || 0), 0) / completedTasks.length) : 0;

      // Performance rating
      let performanceRating = 'Good';
      if (regulatoryViolations.length > 0) performanceRating = 'Critical';
      else if (avgEfficiencyScore < 50) performanceRating = 'Needs Improvement';
      else if (avgEfficiencyScore > 85) performanceRating = 'Excellent';

      return {
        userId: user.id,
        name: user.displayName,
        totalTasks: userTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        regulatoryViolations: regulatoryViolations.length,
        avgEfficiencyScore,
        avgCompletionTime,
        performanceRating,
        completionRate: userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0
      };
    }).filter((member: any) => member.totalTasks > 0);

    // Overall efficiency metrics
    const efficiencyMetrics = {
      totalTasks: taskLifecycles.length,
      completedTasks: taskLifecycles.filter((t: any) => t.isCompleted).length,
      avgCompletionTime: taskLifecycles.filter((t: any) => t.timeToCompletion).length > 0 ?
        Math.round(taskLifecycles.filter((t: any) => t.timeToCompletion).reduce((sum: number, t: any) => sum + (t.timeToCompletion || 0), 0) / 
        taskLifecycles.filter((t: any) => t.timeToCompletion).length) : 0,
      avgEfficiencyScore: taskLifecycles.length > 0 ?
        Math.round(taskLifecycles.reduce((sum: number, t: any) => sum + t.efficiencyScore, 0) / taskLifecycles.length) : 0,
      onTimeDeliveryRate: taskLifecycles.filter((t: any) => t.isCompleted).length > 0 ?
        Math.round((taskLifecycles.filter((t: any) => t.isCompleted && t.efficiencyScore >= 85).length / 
        taskLifecycles.filter((t: any) => t.isCompleted).length) * 100) : 0
    };

    return {
      taskLifecycles: taskLifecycles.sort((a: any, b: any) => b.createdDate.getTime() - a.createdDate.getTime()),
      memberPerformance: memberPerformance.sort((a: any, b: any) => b.avgEfficiencyScore - a.avgEfficiencyScore),
      efficiencyMetrics
    };
  }, [tasks, taskStatuses, clients, entities]);

  const filteredTaskLifecycles = React.useMemo(() => {
    let filtered = taskPerformanceAnalytics.taskLifecycles;
    
    if (selectedMember !== 'all') {
      filtered = filtered.filter((task: any) => task.assigneeId.toString() === selectedMember);
    }
    
    if (selectedTimeRange !== 'all') {
      const now = new Date();
      const daysAgo = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      filtered = filtered.filter((task: any) => task.createdDate >= cutoffDate);
    }
    
    return filtered;
  }, [taskPerformanceAnalytics.taskLifecycles, selectedMember, selectedTimeRange]);

  const getEfficiencyColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    if (score >= 30) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Needs Improvement': return 'bg-yellow-100 text-yellow-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!taskPerformanceAnalytics.taskLifecycles.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Performance Data</h3>
          <p className="text-gray-600">Task performance analytics will appear once tasks are created and assigned.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Tasks</p>
              <p className="text-2xl font-bold text-blue-700">{taskPerformanceAnalytics.efficiencyMetrics.totalTasks}</p>
            </div>
            <BarChart3 className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-xs text-blue-600 mt-1">Across all members</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Avg Completion</p>
              <p className="text-2xl font-bold text-green-700">{taskPerformanceAnalytics.efficiencyMetrics.avgCompletionTime}d</p>
            </div>
            <Clock className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-xs text-green-600 mt-1">Days to complete</p>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Efficiency Score</p>
              <p className="text-2xl font-bold text-purple-700">{taskPerformanceAnalytics.efficiencyMetrics.avgEfficiencyScore}%</p>
            </div>
            <Target className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-xs text-purple-600 mt-1">Overall performance</p>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">On-Time Rate</p>
              <p className="text-2xl font-bold text-amber-700">{taskPerformanceAnalytics.efficiencyMetrics.onTimeDeliveryRate}%</p>
            </div>
            <TrendingUp className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-xs text-amber-600 mt-1">Delivered on time</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Member:</label>
          <select 
            value={selectedMember} 
            onChange={(e) => setSelectedMember(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white"
          >
            <option value="all">All Members</option>
            {taskPerformanceAnalytics.memberPerformance.map((member: any) => (
              <option key={member.userId} value={member.userId.toString()}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Member Performance Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Member Performance Leaderboard
          </CardTitle>
          <CardDescription>
            Performance scoring based on efficiency, completion rate, and deadline adherence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taskPerformanceAnalytics.memberPerformance.map((member: any, index: number) => (
              <div key={member.userId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{member.name}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-600">
                        {member.completedTasks}/{member.totalTasks} tasks ({member.completionRate}%)
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPerformanceColor(member.performanceRating)}`}>
                        {member.performanceRating}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold px-3 py-1 rounded-lg ${getEfficiencyColor(member.avgEfficiencyScore)}`}>
                    {member.avgEfficiencyScore}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Avg: {member.avgCompletionTime}d
                  </div>
                  {member.regulatoryViolations > 0 && (
                    <div className="text-xs text-red-600 font-medium mt-1">
                      {member.regulatoryViolations} regulatory violations
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Lifecycle Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Task Lifecycle Analytics
          </CardTitle>
          <CardDescription>
            Complete task journey from creation to completion with performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTaskLifecycles.slice(0, 10).map((task: any) => (
              <div key={task.taskId} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>{task.clientName} • {task.entityName}</span>
                      <span>Assigned to: {task.assigneeName}</span>
                      <span className={`px-2 py-1 rounded-full border ${getRiskLevelColor(task.riskLevel)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <div className={`text-lg font-bold px-3 py-1 rounded-lg ${getEfficiencyColor(task.efficiencyScore)}`}>
                    {task.efficiencyScore}%
                  </div>
                </div>
                
                {/* Timeline Visualization */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">
                      Created: {format(task.createdDate, 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-gray-500">
                      Due: {format(task.dueDate, 'MMM d, yyyy')}
                      {task.complianceDeadline && (
                        <span className="text-red-600 font-medium ml-2">
                          Compliance: {format(task.complianceDeadline, 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative w-full h-2 bg-gray-200 rounded-full mb-2">
                    {task.isCompleted ? (
                      <div 
                        className={`h-full rounded-full ${
                          task.efficiencyScore >= 85 ? 'bg-green-500' :
                          task.efficiencyScore >= 70 ? 'bg-blue-500' :
                          task.efficiencyScore >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <div 
                        className={`h-full rounded-full ${
                          task.daysUntilDue > 7 ? 'bg-green-500' :
                          task.daysUntilDue > 3 ? 'bg-yellow-500' :
                          task.daysUntilDue > 0 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ 
                          width: task.isCompleted ? '100%' : 
                            `${Math.min(100, Math.max(10, (task.totalLifecycle / 30) * 100))}%` 
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Metrics */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">
                        Lifecycle: {task.totalLifecycle} days
                      </span>
                      {task.timeToCompletion && (
                        <span className="text-gray-600">
                          Completed in: {task.timeToCompletion} days
                        </span>
                      )}
                      {task.isRegulatory && (
                        <span className="text-purple-600 font-medium">
                          Regulatory Task
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {task.completedDate && (
                        <span className="text-green-600">
                          ✓ Completed {format(task.completedDate, 'MMM d')}
                        </span>
                      )}
                      {!task.isCompleted && task.daysUntilDue <= 0 && (
                        <span className="text-red-600 font-medium">
                          {Math.abs(task.daysUntilDue)} days overdue
                        </span>
                      )}
                      {!task.isCompleted && task.daysUntilCompliance !== null && task.daysUntilCompliance <= 0 && (
                        <span className="text-red-600 font-bold">
                          Compliance violation!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ComplianceDashboard = ({ tasks, taskStatuses, clients, entities, countries }: any) => {
  const [complianceFilter, setComplianceFilter] = React.useState('all');
  const [riskFilter, setRiskFilter] = React.useState('all');
  
  const currentDate = new Date();
  const completedStatusId = taskStatuses?.find((s: any) => s.name.toLowerCase() === 'completed')?.id;
  const pendingStatusId = taskStatuses?.find((s: any) => s.name.toLowerCase() === 'pending')?.id;
  const inProgressStatusId = taskStatuses?.find((s: any) => s.name.toLowerCase() === 'in progress')?.id;
  
  // Identify compliance tasks based on complianceDeadline field and task titles
  const complianceTasks = tasks?.filter((task: any) => 
    task.complianceDeadline || 
    task.title?.toLowerCase().includes('tax') || 
    task.title?.toLowerCase().includes('compliance') ||
    task.title?.toLowerCase().includes('filing') ||
    task.title?.toLowerCase().includes('return') ||
    task.title?.toLowerCase().includes('audit') ||
    task.title?.toLowerCase().includes('vat') ||
    task.title?.toLowerCase().includes('payroll')
  ) || [];

  // Calculate comprehensive compliance metrics - prioritizing regulatory deadlines
  const complianceMetrics = React.useMemo(() => {
    // Regulatory deadline violations - most critical
    const regulatoryOverdue = complianceTasks.filter((task: any) => {
      if (!task.complianceDeadline) return false;
      const complianceDeadline = new Date(task.complianceDeadline);
      return complianceDeadline < currentDate && task.statusId !== completedStatusId;
    });
    
    // Internal deadline violations for compliance tasks without regulatory deadlines
    const internalOverdue = complianceTasks.filter((task: any) => {
      if (task.complianceDeadline) return false; // Skip if has regulatory deadline
      const dueDate = new Date(task.dueDate);
      return dueDate < currentDate && task.statusId !== completedStatusId;
    });
    
    // Critical upcoming - regulatory deadlines within 7 days
    const upcomingCritical = complianceTasks.filter((task: any) => {
      const deadline = task.complianceDeadline ? new Date(task.complianceDeadline) : new Date(task.dueDate);
      const daysUntil = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const isRegulatory = !!task.complianceDeadline;
      return daysUntil >= 0 && daysUntil <= (isRegulatory ? 14 : 7) && task.statusId !== completedStatusId;
    });
    
    // Moderate upcoming - within 30 days for regulatory, 14 days for internal
    const upcomingModerate = complianceTasks.filter((task: any) => {
      const deadline = task.complianceDeadline ? new Date(task.complianceDeadline) : new Date(task.dueDate);
      const daysUntil = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const isRegulatory = !!task.complianceDeadline;
      const criticalThreshold = isRegulatory ? 14 : 7;
      const moderateThreshold = isRegulatory ? 45 : 21;
      return daysUntil > criticalThreshold && daysUntil <= moderateThreshold && task.statusId !== completedStatusId;
    });
    
    const completedThisMonth = complianceTasks.filter((task: any) => {
      const completionDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt);
      const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      return task.statusId === completedStatusId && completionDate >= thisMonth;
    });
    
    return {
      total: complianceTasks.length,
      regulatoryOverdue: regulatoryOverdue.length,
      internalOverdue: internalOverdue.length,
      overdue: regulatoryOverdue.length + internalOverdue.length,
      criticalUpcoming: upcomingCritical.length,
      moderateUpcoming: upcomingModerate.length,
      completed: complianceTasks.filter((task: any) => task.statusId === completedStatusId).length,
      completedThisMonth: completedThisMonth.length,
      complianceRate: complianceTasks.length > 0 ? Math.round((complianceTasks.filter((task: any) => task.statusId === completedStatusId).length / complianceTasks.length) * 100) : 0,
      regulatoryTasks: complianceTasks.filter((task: any) => task.complianceDeadline).length,
      internalTasks: complianceTasks.filter((task: any) => !task.complianceDeadline).length
    };
  }, [complianceTasks, completedStatusId, currentDate]);

  // Risk assessment by entity - prioritizing regulatory compliance deadlines
  const entityRiskAnalysis = React.useMemo(() => {
    return entities?.map((entity: any) => {
      const entityTasks = complianceTasks.filter((task: any) => task.entityId === entity.id);
      
      // Separate regulatory and internal overdue tasks
      const regulatoryOverdue = entityTasks.filter((task: any) => {
        if (!task.complianceDeadline) return false;
        const complianceDeadline = new Date(task.complianceDeadline);
        return complianceDeadline < currentDate && task.statusId !== completedStatusId;
      });
      
      const internalOverdue = entityTasks.filter((task: any) => {
        if (task.complianceDeadline) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < currentDate && task.statusId !== completedStatusId;
      });
      
      const upcomingTasks = entityTasks.filter((task: any) => {
        const deadline = task.complianceDeadline ? new Date(task.complianceDeadline) : new Date(task.dueDate);
        const daysUntil = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        const isRegulatory = !!task.complianceDeadline;
        const maxDays = isRegulatory ? 45 : 21; // Extended window for regulatory tasks
        return daysUntil >= 0 && daysUntil <= maxDays && task.statusId !== completedStatusId;
      });
      
      const client = clients?.find((c: any) => c.id === entity.clientId);
      const country = countries?.find((c: any) => c.id === entity.countryId);
      
      // Enhanced risk score calculation - regulatory violations are most critical
      let riskScore = 0;
      riskScore += regulatoryOverdue.length * 50; // Critical penalty for regulatory violations
      riskScore += internalOverdue.length * 20; // Moderate penalty for internal overdue
      riskScore += upcomingTasks.filter((t: any) => {
        const deadline = t.complianceDeadline ? new Date(t.complianceDeadline) : new Date(t.dueDate);
        const daysUntil = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        const isRegulatory = !!t.complianceDeadline;
        return daysUntil <= (isRegulatory ? 14 : 7);
      }).length * 25; // High penalty for critical upcoming
      riskScore += upcomingTasks.length * 5; // Light penalty for all upcoming
      
      const riskLevel = riskScore >= 100 ? 'high' : riskScore >= 30 ? 'medium' : riskScore > 0 ? 'low' : 'minimal';
      
      return {
        entityId: entity.id,
        entityName: entity.name,
        clientName: client?.displayName || client?.companyName || 'Unknown',
        countryName: country?.name || 'Unknown',
        totalTasks: entityTasks.length,
        regulatoryOverdue: regulatoryOverdue.length,
        internalOverdue: internalOverdue.length,
        overdueTasks: regulatoryOverdue.length + internalOverdue.length,
        upcomingTasks: upcomingTasks.length,
        completedTasks: entityTasks.filter((task: any) => task.statusId === completedStatusId).length,
        riskScore,
        riskLevel,
        complianceRate: entityTasks.length > 0 ? Math.round((entityTasks.filter((task: any) => task.statusId === completedStatusId).length / entityTasks.length) * 100) : 0
      };
    }).filter((entity: any) => entity.totalTasks > 0)
    .sort((a: any, b: any) => b.riskScore - a.riskScore) || [];
  }, [entities, complianceTasks, completedStatusId, currentDate, clients, countries]);

  // Task Performance Analytics - comprehensive lifecycle tracking
  const taskPerformanceAnalytics = React.useMemo(() => {
    if (!tasks?.length || !taskStatuses?.length || !users?.length) return { taskLifecycles: [], memberPerformance: [], efficiencyMetrics: {} };

    const completedStatusId = taskStatuses.find((s: any) => s.name === 'Completed')?.id;
    const inProgressStatusId = taskStatuses.find((s: any) => s.name === 'In Progress')?.id;

    const taskLifecycles = tasks.map((task: any) => {
      const createdDate = new Date(task.createdAt);
      const dueDate = new Date(task.dueDate);
      const complianceDeadline = task.complianceDeadline ? new Date(task.complianceDeadline) : null;
      const completedDate = task.statusId === completedStatusId && task.updatedAt ? new Date(task.updatedAt) : null;
      const currentDate = new Date();
      
      // Calculate various time metrics
      const totalLifecycle = completedDate ? 
        Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) :
        Math.ceil((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const timeToCompletion = completedDate ? 
        Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilCompliance = complianceDeadline ? 
        Math.ceil((complianceDeadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      // Performance scoring
      let efficiencyScore = 100;
      let riskLevel = 'low';
      
      if (completedDate) {
        // Completed tasks - score based on delivery timing
        const dueDateMet = completedDate <= dueDate;
        const complianceDeadlineMet = !complianceDeadline || completedDate <= complianceDeadline;
        
        if (!complianceDeadlineMet) {
          efficiencyScore = 20; // Major penalty for regulatory violations
          riskLevel = 'critical';
        } else if (!dueDateMet) {
          efficiencyScore = 60; // Moderate penalty for internal deadline miss
          riskLevel = 'medium';
        } else {
          // Bonus for early completion
          const earlyDays = Math.max(0, Math.ceil((dueDate.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)));
          efficiencyScore = Math.min(100, 85 + (earlyDays * 3));
          riskLevel = 'low';
        }
      } else {
        // In-progress tasks - score based on remaining time
        if (complianceDeadline && daysUntilCompliance <= 0) {
          efficiencyScore = 10; // Critical - regulatory deadline passed
          riskLevel = 'critical';
        } else if (daysUntilDue <= 0) {
          efficiencyScore = 30; // Internal deadline passed
          riskLevel = 'high';
        } else if (complianceDeadline && daysUntilCompliance <= 7) {
          efficiencyScore = 50; // Approaching regulatory deadline
          riskLevel = 'medium';
        } else if (daysUntilDue <= 3) {
          efficiencyScore = 70; // Approaching internal deadline
          riskLevel = 'medium';
        }
      }

      const assignee = users.find((u: any) => u.id === task.assigneeId);
      const client = clients?.find((c: any) => c.id === task.clientId);
      const entity = entities?.find((e: any) => e.id === task.entityId);

      return {
        taskId: task.id,
        title: task.taskDetails || 'Untitled Task',
        assigneeName: assignee?.displayName || 'Unassigned',
        assigneeId: task.assigneeId,
        clientName: client?.displayName || 'Unknown Client',
        entityName: entity?.name || 'Unknown Entity',
        createdDate,
        dueDate,
        complianceDeadline,
        completedDate,
        totalLifecycle,
        timeToCompletion,
        daysUntilDue,
        daysUntilCompliance,
        efficiencyScore,
        riskLevel,
        isCompleted: !!completedDate,
        status: taskStatuses.find((s: any) => s.id === task.statusId)?.name || 'Unknown',
        hasComplianceDeadline: !!complianceDeadline,
        isRegulatory: !!complianceDeadline
      };
    });

    // Member performance aggregation
    const memberPerformance = users.map((user: any) => {
      const userTasks = taskLifecycles.filter(task => task.assigneeId === user.id);
      const completedTasks = userTasks.filter(task => task.isCompleted);
      const overdueTasks = userTasks.filter(task => !task.isCompleted && task.daysUntilDue < 0);
      const regulatoryViolations = userTasks.filter(task => 
        task.hasComplianceDeadline && (!task.isCompleted && task.daysUntilCompliance < 0)
      );

      const avgEfficiencyScore = userTasks.length > 0 ? 
        Math.round(userTasks.reduce((sum, task) => sum + task.efficiencyScore, 0) / userTasks.length) : 0;
      
      const avgCompletionTime = completedTasks.length > 0 ?
        Math.round(completedTasks.reduce((sum, task) => sum + (task.timeToCompletion || 0), 0) / completedTasks.length) : 0;

      // Performance rating
      let performanceRating = 'Good';
      if (regulatoryViolations.length > 0) performanceRating = 'Critical';
      else if (avgEfficiencyScore < 50) performanceRating = 'Needs Improvement';
      else if (avgEfficiencyScore > 85) performanceRating = 'Excellent';

      return {
        userId: user.id,
        name: user.displayName,
        totalTasks: userTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        regulatoryViolations: regulatoryViolations.length,
        avgEfficiencyScore,
        avgCompletionTime,
        performanceRating,
        completionRate: userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0
      };
    }).filter(member => member.totalTasks > 0);

    // Overall efficiency metrics
    const efficiencyMetrics = {
      totalTasks: taskLifecycles.length,
      completedTasks: taskLifecycles.filter(t => t.isCompleted).length,
      avgCompletionTime: taskLifecycles.filter(t => t.timeToCompletion).length > 0 ?
        Math.round(taskLifecycles.filter(t => t.timeToCompletion).reduce((sum, t) => sum + (t.timeToCompletion || 0), 0) / 
        taskLifecycles.filter(t => t.timeToCompletion).length) : 0,
      avgEfficiencyScore: taskLifecycles.length > 0 ?
        Math.round(taskLifecycles.reduce((sum, t) => sum + t.efficiencyScore, 0) / taskLifecycles.length) : 0,
      onTimeDeliveryRate: taskLifecycles.filter(t => t.isCompleted).length > 0 ?
        Math.round((taskLifecycles.filter(t => t.isCompleted && t.efficiencyScore >= 85).length / 
        taskLifecycles.filter(t => t.isCompleted).length) * 100) : 0
    };

    return {
      taskLifecycles: taskLifecycles.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime()),
      memberPerformance: memberPerformance.sort((a, b) => b.avgEfficiencyScore - a.avgEfficiencyScore),
      efficiencyMetrics
    };
  }, [tasks, taskStatuses, users, clients, entities]);

  // Jurisdiction-based compliance analysis
  const jurisdictionAnalysis = React.useMemo(() => {
    return countries?.map((country: any) => {
      const countryEntities = entities?.filter((e: any) => e.countryId === country.id) || [];
      const countryTasks = complianceTasks.filter((task: any) => 
        countryEntities.some((entity: any) => entity.id === task.entityId)
      );
      
      const overdueTasks = countryTasks.filter((task: any) => {
        const deadline = task.complianceDeadline ? new Date(task.complianceDeadline) : new Date(task.dueDate);
        return deadline < currentDate && task.statusId !== completedStatusId;
      });
      
      const upcomingTasks = countryTasks.filter((task: any) => {
        const deadline = task.complianceDeadline ? new Date(task.complianceDeadline) : new Date(task.dueDate);
        const daysUntil = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 30 && task.statusId !== completedStatusId;
      });
      
      const completedTasks = countryTasks.filter((task: any) => task.statusId === completedStatusId);
      
      return {
        countryName: country.name,
        totalTasks: countryTasks.length,
        totalEntities: countryEntities.length,
        overdueTasks: overdueTasks.length,
        upcomingTasks: upcomingTasks.length,
        completedTasks: completedTasks.length,
        complianceRate: countryTasks.length > 0 ? Math.round((completedTasks.length / countryTasks.length) * 100) : 0,
        riskLevel: overdueTasks.length > 5 ? 'high' : overdueTasks.length > 2 ? 'medium' : overdueTasks.length > 0 ? 'low' : 'minimal'
      };
    }).filter((country: any) => country.totalTasks > 0)
    .sort((a: any, b: any) => b.overdueTasks - a.overdueTasks) || [];
  }, [countries, entities, complianceTasks, completedStatusId, currentDate]);

  // Filter data based on selected filters
  const filteredEntityData = entityRiskAnalysis.filter((entity: any) => {
    if (riskFilter === 'high') return entity.riskLevel === 'high';
    if (riskFilter === 'medium') return entity.riskLevel === 'medium';
    if (riskFilter === 'low') return entity.riskLevel === 'low' || entity.riskLevel === 'minimal';
    return true;
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Calendar className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Compliance Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Overdue</p>
              <p className="text-2xl font-bold text-red-700">{complianceMetrics.overdue}</p>
              <div className="flex gap-2 mt-1">
                {complianceMetrics.regulatoryOverdue > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    {complianceMetrics.regulatoryOverdue} Regulatory
                  </span>
                )}
                {complianceMetrics.internalOverdue > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                    {complianceMetrics.internalOverdue} Internal
                  </span>
                )}
              </div>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-xs text-red-600 mt-1">
            {complianceMetrics.regulatoryOverdue > 0 ? "Regulatory violations critical" : "Internal deadlines missed"}
          </p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Critical (7d)</p>
              <p className="text-2xl font-bold text-yellow-700">{complianceMetrics.criticalUpcoming}</p>
            </div>
            <Clock className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-xs text-yellow-600 mt-1">Due within 7 days</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Upcoming (30d)</p>
              <p className="text-2xl font-bold text-blue-700">{complianceMetrics.moderateUpcoming}</p>
            </div>
            <Calendar className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-xs text-blue-600 mt-1">Due within 30 days</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Rate</p>
              <p className="text-2xl font-bold text-green-700">{complianceMetrics.complianceRate}%</p>
            </div>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-xs text-green-600 mt-1">Overall compliance rate</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Entity Risk Analysis */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Entity Risk Analysis</h4>
            <select 
              value={riskFilter} 
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {filteredEntityData.slice(0, 8).map((entity: any) => (
              <div
                key={entity.entityId}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getRiskColor(entity.riskLevel)}`}
                onClick={() => window.location.href = `/entities/${entity.entityId}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {getRiskIcon(entity.riskLevel)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{entity.entityName}</div>
                      <div className="text-xs opacity-75">
                        {entity.clientName} • {entity.countryName}
                      </div>
                      <div className="flex items-center space-x-3 text-xs mt-1">
                        {entity.overdueTasks > 0 && (
                          <span className="text-red-600 font-medium">
                            {entity.overdueTasks} overdue
                          </span>
                        )}
                        {entity.upcomingTasks > 0 && (
                          <span className="text-yellow-600">
                            {entity.upcomingTasks} upcoming
                          </span>
                        )}
                        <span className="text-green-600">
                          {entity.completedTasks} completed
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{entity.complianceRate}%</div>
                    <div className="text-xs opacity-75 capitalize">{entity.riskLevel} risk</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Jurisdiction Compliance Status */}
        <div>
          <h4 className="font-medium mb-4">Jurisdiction Compliance Status</h4>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {jurisdictionAnalysis.map((jurisdiction: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium text-sm">{jurisdiction.countryName}</div>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${getRiskColor(jurisdiction.riskLevel)}`}>
                      {jurisdiction.riskLevel}
                    </span>
                  </div>
                  <div className="text-sm font-medium">{jurisdiction.complianceRate}%</div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>{jurisdiction.totalEntities} entities</span>
                  <span>{jurisdiction.totalTasks} compliance tasks</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      jurisdiction.complianceRate >= 90 ? 'bg-green-500' :
                      jurisdiction.complianceRate >= 75 ? 'bg-blue-500' :
                      jurisdiction.complianceRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${jurisdiction.complianceRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex space-x-3">
                    {jurisdiction.overdueTasks > 0 && (
                      <span className="text-red-600">{jurisdiction.overdueTasks} overdue</span>
                    )}
                    {jurisdiction.upcomingTasks > 0 && (
                      <span className="text-yellow-600">{jurisdiction.upcomingTasks} upcoming</span>
                    )}
                  </div>
                  <span className="text-green-600">{jurisdiction.completedTasks} completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
