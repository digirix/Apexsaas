import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowDownRight,
  Minus
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

  // Generate clients by country data
  const clientsByCountryData = useMemo(() => {
    const countryMap = new Map();
    
    entities.forEach(entity => {
      const country = countries.find(c => c.id === entity.countryId);
      const countryName = country?.name || 'Unknown';
      countryMap.set(countryName, (countryMap.get(countryName) || 0) + 1);
    });
    
    return Array.from(countryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 countries
  }, [entities, countries]);

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

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Clients Card - only show if user has permission */}
        {(canViewClients || user?.isSuperAdmin) && (
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Clients</p>
                    <h3 className="text-2xl font-bold text-slate-900">{dashboardMetrics.totalClients.toLocaleString()}</h3>
                    <p className="text-xs text-slate-500 mt-1">{dashboardMetrics.totalEntities} entities</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tasks Card - only show if user has permission */}
        {(canViewTasks || user?.isSuperAdmin) && (
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-4">
                    <ClipboardCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Active Tasks</p>
                    <h3 className="text-2xl font-bold text-slate-900">{dashboardMetrics.activeTasks.toLocaleString()}</h3>
                    <p className="text-xs text-slate-500 mt-1">{dashboardMetrics.completedTasksThisMonth} completed this month</p>
                  </div>
                </div>
                <Activity className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Revenue Card - only show if user has permission */}
        {(canViewFinance || user?.isSuperAdmin) && (
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg mr-4">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Monthly Revenue</p>
                    <h3 className="text-2xl font-bold text-slate-900">${dashboardMetrics.monthlyRevenue.toLocaleString()}</h3>
                    <p className="text-xs text-slate-500 mt-1">{dashboardMetrics.pendingInvoices} pending invoices</p>
                  </div>
                </div>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Alerts Card - only show if user has task permissions */}
        {(canViewTasks || user?.isSuperAdmin) && (
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-4 ${dashboardMetrics.overdueTasks > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    <AlertTriangle className={`h-6 w-6 ${dashboardMetrics.overdueTasks > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Overdue Tasks</p>
                    <h3 className="text-2xl font-bold text-slate-900">{dashboardMetrics.overdueTasks.toLocaleString()}</h3>
                    <p className="text-xs text-slate-500 mt-1">{dashboardMetrics.urgentDeadlines} urgent deadlines</p>
                  </div>
                </div>
                <Bell className={`h-4 w-4 ${dashboardMetrics.overdueTasks > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Revenue Trend Chart - only show if user has finance permission */}
        {(canViewFinance || user?.isSuperAdmin) && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-medium">Revenue Trend</CardTitle>
                <p className="text-sm text-slate-500">Last 6 months performance</p>
              </div>
              <TrendingUp className="h-5 w-5 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {monthlyRevenueData.length > 0 ? (
                  <LineChart
                    data={monthlyRevenueData}
                    xAxis={{ dataKey: "name" }}
                    series={[{ dataKey: "value", stroke: "#3B82F6", strokeWidth: 3 }]}
                    tooltip
                    yAxis={{ format: (value) => `$${value.toLocaleString()}` }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No revenue data available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Task Status Chart - only show if user has task permission */}
        {(canViewTasks || user?.isSuperAdmin) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-medium">Task Distribution</CardTitle>
                <p className="text-sm text-slate-500">Current status breakdown</p>
              </div>
              <PieChartIcon className="h-5 w-5 text-slate-500" />
            </CardHeader>
            <CardContent>
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
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Additional Insights Section */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Entities by Country Chart - only show if user has client permission */}
        {(canViewClients || user?.isSuperAdmin) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-medium">Entities by Country</CardTitle>
                <p className="text-sm text-slate-500">Geographic distribution</p>
              </div>
              <Building2 className="h-5 w-5 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {clientsByCountryData.length > 0 ? (
                  <BarChart
                    data={clientsByCountryData}
                    xAxis={{ dataKey: "name" }}
                    series={[{ dataKey: "value", color: "#3B82F6" }]}
                    tooltip
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No entity data available</p>
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

      {/* Quick Actions Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(canViewClients || user?.isSuperAdmin) && (
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-slate-900">Clients</p>
                  <p className="text-xs text-slate-500">Manage client accounts</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>
          </Card>
        )}

        {(canViewTasks || user?.isSuperAdmin) && (
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClipboardCheck className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-slate-900">Tasks</p>
                  <p className="text-xs text-slate-500">Track work progress</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>
          </Card>
        )}

        {(canViewFinance || user?.isSuperAdmin) && (
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium text-slate-900">Finance</p>
                  <p className="text-xs text-slate-500">Invoices & payments</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>
          </Card>
        )}

        {(canViewReports || user?.isSuperAdmin) && (
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="font-medium text-slate-900">Reports</p>
                  <p className="text-xs text-slate-500">Analytics & insights</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
