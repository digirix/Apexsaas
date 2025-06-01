import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Building2,
  FileText,
  Target,
  Activity,
  Zap,
  Bell,
  ExternalLink,
  Plus,
  ArrowUpRight,
  Users,
  ClipboardCheck
} from "lucide-react";
import { format, isAfter, isBefore, addDays, isToday, isTomorrow, differenceInDays } from "date-fns";
import { useMemo } from "react";

export default function DashboardPage() {
  const { user, permissions } = useAuth();
  
  // Check permissions for different modules
  const canViewClients = permissions?.some((p: any) => p.module === 'clients' && p.canRead);
  const canViewTasks = permissions?.some((p: any) => p.module === 'tasks' && p.canRead);
  const canViewFinance = permissions?.some((p: any) => p.module === 'finance' && p.canRead);
  
  // Fetch data based on permissions
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/v1/clients"],
    enabled: canViewClients || user?.isSuperAdmin,
  });

  const { data: entities = [] } = useQuery({
    queryKey: ["/api/v1/entities"],
    enabled: canViewClients || user?.isSuperAdmin,
  });

  const { data: tasks = [] } = useQuery({
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

  const { data: users = [] } = useQuery({
    queryKey: ["/api/v1/users"],
    enabled: user?.isSuperAdmin,
  });

  // Calculate critical metrics
  const criticalMetrics = useMemo(() => {
    const now = new Date();
    const urgentThreshold = addDays(now, 3); // Next 3 days for critical alerts
    const weekThreshold = addDays(now, 7); // Next 7 days for weekly priorities
    
    const completedStatusId = (taskStatuses as any[])?.find((s: any) => s.name === 'Completed')?.id;
    
    // Critical actionable alerts - overdue + very urgent compliance
    const overdueTasks = (tasks as any[])?.filter((task: any) => {
      const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
      const isDue = task.dueDate && isBefore(new Date(task.dueDate), now);
      return status?.id !== completedStatusId && isDue;
    }) || [];
    
    const urgentCompliance = (tasks as any[])?.filter((task: any) => {
      if (!task.complianceDeadline) return false;
      const complianceDate = new Date(task.complianceDeadline);
      const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
      return status?.id !== completedStatusId && 
             isAfter(complianceDate, now) && 
             isBefore(complianceDate, urgentThreshold);
    }) || [];
    
    const actionableAlerts = overdueTasks.length + urgentCompliance.length;
    
    // Active tasks
    const activeTasks = (tasks as any[])?.filter((task: any) => {
      const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
      return status?.id !== completedStatusId;
    }).length || 0;
    
    // Compliance health calculation
    const totalComplianceTasks = (tasks as any[])?.filter((task: any) => task.complianceDeadline).length || 0;
    const completedComplianceTasks = (tasks as any[])?.filter((task: any) => {
      const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
      return task.complianceDeadline && status?.id === completedStatusId;
    }).length || 0;
    
    const complianceHealth = totalComplianceTasks > 0 ? 
      Math.round((completedComplianceTasks / totalComplianceTasks) * 100) : 100;
    
    return {
      actionableAlerts,
      activeTasks,
      complianceHealth,
      totalClients: (clients as any[])?.length || 0,
      overdueTasks: overdueTasks.length,
      urgentCompliance: urgentCompliance.length
    };
  }, [tasks, taskStatuses, clients]);

  // Priority tasks for main tab
  const priorityTasks = useMemo(() => {
    const now = new Date();
    const weekThreshold = addDays(now, 7);
    const completedStatusId = (taskStatuses as any[])?.find((s: any) => s.name === 'Completed')?.id;
    
    return (tasks as any[])?.filter((task: any) => {
      const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
      if (status?.id === completedStatusId) return false;
      
      // Include overdue tasks
      if (task.dueDate && isBefore(new Date(task.dueDate), now)) return true;
      
      // Include urgent compliance deadlines
      if (task.complianceDeadline) {
        const complianceDate = new Date(task.complianceDeadline);
        if (isBefore(complianceDate, weekThreshold)) return true;
      }
      
      // Include tasks due this week
      if (task.dueDate && isBefore(new Date(task.dueDate), weekThreshold)) return true;
      
      return false;
    }).sort((a: any, b: any) => {
      // Sort by urgency: overdue compliance > overdue internal > upcoming compliance > upcoming internal
      const now = new Date();
      
      const aOverdueCompliance = a.complianceDeadline && isBefore(new Date(a.complianceDeadline), now);
      const bOverdueCompliance = b.complianceDeadline && isBefore(new Date(b.complianceDeadline), now);
      if (aOverdueCompliance !== bOverdueCompliance) return aOverdueCompliance ? -1 : 1;
      
      const aOverdue = a.dueDate && isBefore(new Date(a.dueDate), now);
      const bOverdue = b.dueDate && isBefore(new Date(b.dueDate), now);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      
      // Sort by compliance deadline first, then due date
      const aDate = a.complianceDeadline ? new Date(a.complianceDeadline) : new Date(a.dueDate);
      const bDate = b.complianceDeadline ? new Date(b.complianceDeadline) : new Date(b.dueDate);
      return aDate.getTime() - bDate.getTime();
    }).slice(0, 8) || []; // Limit to 8 most critical tasks
  }, [tasks, taskStatuses]);

  // Status distribution for compact chart
  const statusDistribution = useMemo(() => {
    const completedStatusId = (taskStatuses as any[])?.find((s: any) => s.name === 'Completed')?.id;
    const totalTasks = (tasks as any[])?.length || 0;
    
    if (totalTasks === 0) return { completed: 0, inProgress: 0, overdue: 0 };
    
    const completed = (tasks as any[])?.filter((task: any) => {
      const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
      return status?.id === completedStatusId;
    }).length || 0;
    
    const overdue = (tasks as any[])?.filter((task: any) => {
      const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
      const isDue = task.dueDate && isBefore(new Date(task.dueDate), new Date());
      return status?.id !== completedStatusId && isDue;
    }).length || 0;
    
    const inProgress = totalTasks - completed - overdue;
    
    return {
      completed: Math.round((completed / totalTasks) * 100),
      inProgress: Math.round((inProgress / totalTasks) * 100),
      overdue: Math.round((overdue / totalTasks) * 100)
    };
  }, [tasks, taskStatuses]);

  // Compliance hotspots
  const complianceHotspots = useMemo(() => {
    const now = new Date();
    const completedStatusId = (taskStatuses as any[])?.find((s: any) => s.name === 'Completed')?.id;
    
    const entityRisks = (entities as any[])?.map((entity: any) => {
      const entityTasks = (tasks as any[])?.filter((task: any) => task.entityId === entity.id) || [];
      const overdueTasks = entityTasks.filter((task: any) => {
        const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
        const isDue = task.dueDate && isBefore(new Date(task.dueDate), now);
        return status?.id !== completedStatusId && isDue;
      });
      
      const urgentCompliance = entityTasks.filter((task: any) => {
        if (!task.complianceDeadline) return false;
        const complianceDate = new Date(task.complianceDeadline);
        const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
        return status?.id !== completedStatusId && 
               isAfter(complianceDate, now) && 
               isBefore(complianceDate, addDays(now, 14));
      });
      
      const client = (clients as any[])?.find((c: any) => c.id === entity.clientId);
      const country = (countries as any[])?.find((c: any) => c.id === entity.countryId);
      
      return {
        entityId: entity.id,
        entityName: entity.name,
        clientName: client?.displayName || 'Unknown Client',
        countryName: country?.name || 'Unknown',
        riskScore: (overdueTasks.length * 20) + (urgentCompliance.length * 10),
        overdueTasks: overdueTasks.length,
        urgentCompliance: urgentCompliance.length,
        totalTasks: entityTasks.length
      };
    }).filter((entity: any) => entity.riskScore > 0)
    .sort((a: any, b: any) => b.riskScore - a.riskScore)
    .slice(0, 5) || [];
    
    return entityRisks;
  }, [entities, tasks, taskStatuses, clients, countries]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const recent = (tasks as any[])?.filter((task: any) => {
      const updatedAt = new Date(task.updatedAt || task.createdAt);
      const daysDiff = differenceInDays(new Date(), updatedAt);
      return daysDiff <= 7; // Last 7 days
    }).sort((a: any, b: any) => {
      const aDate = new Date(a.updatedAt || a.createdAt);
      const bDate = new Date(b.updatedAt || b.createdAt);
      return bDate.getTime() - aDate.getTime();
    }).slice(0, 6) || [];
    
    return recent.map((task: any) => {
      const status = (taskStatuses as any[])?.find((s: any) => s.id === task.statusId);
      const client = (clients as any[])?.find((c: any) => c.id === task.clientId);
      const entity = (entities as any[])?.find((e: any) => e.id === task.entityId);
      const updatedAt = new Date(task.updatedAt || task.createdAt);
      
      return {
        taskId: task.id,
        taskDetails: task.taskDetails,
        statusName: status?.name || 'Unknown',
        clientName: client?.displayName || 'Unknown Client',
        entityName: entity?.name || 'Unknown Entity',
        updatedAt,
        isCompleted: status?.name === 'Completed'
      };
    });
  }, [tasks, taskStatuses, clients, entities]);

  const getUrgencyColor = (task: any) => {
    const now = new Date();
    
    // Check for overdue compliance
    if (task.complianceDeadline && isBefore(new Date(task.complianceDeadline), now)) {
      return 'bg-red-100 border-red-300 text-red-800';
    }
    
    // Check for overdue internal
    if (task.dueDate && isBefore(new Date(task.dueDate), now)) {
      return 'bg-orange-100 border-orange-300 text-orange-800';
    }
    
    // Check for urgent compliance (next 3 days)
    if (task.complianceDeadline) {
      const complianceDate = new Date(task.complianceDeadline);
      const daysUntil = differenceInDays(complianceDate, now);
      if (daysUntil <= 3) {
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      }
    }
    
    return 'bg-blue-100 border-blue-300 text-blue-800';
  };

  const getUrgencyLabel = (task: any) => {
    const now = new Date();
    
    if (task.complianceDeadline && isBefore(new Date(task.complianceDeadline), now)) {
      return 'Compliance Overdue';
    }
    
    if (task.dueDate && isBefore(new Date(task.dueDate), now)) {
      return 'Overdue';
    }
    
    if (task.complianceDeadline) {
      const complianceDate = new Date(task.complianceDeadline);
      const daysUntil = differenceInDays(complianceDate, now);
      if (daysUntil <= 3) {
        return `Compliance Due ${daysUntil === 0 ? 'Today' : `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}`;
      }
    }
    
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const daysUntil = differenceInDays(dueDate, now);
      if (daysUntil <= 7) {
        return `Due ${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}`;
      }
    }
    
    return 'Upcoming';
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.displayName}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/tasks">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Row - Critical KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Actionable Alerts - Most Important */}
          <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Critical Alerts</p>
                  <p className="text-2xl font-bold text-red-900">{criticalMetrics.actionableAlerts}</p>
                  <p className="text-xs text-red-600">Requires immediate attention</p>
                </div>
                <div className="p-2 bg-red-500 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              {criticalMetrics.actionableAlerts > 0 && (
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-red-700 hover:bg-red-200">
                    View Tasks <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Active Tasks */}
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Active Tasks</p>
                  <p className="text-2xl font-bold text-blue-900">{criticalMetrics.activeTasks}</p>
                  <p className="text-xs text-blue-600">In progress</p>
                </div>
                <div className="p-2 bg-blue-500 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Health */}
          <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Compliance Health</p>
                  <p className="text-2xl font-bold text-green-900">{criticalMetrics.complianceHealth}%</p>
                  <p className="text-xs text-green-600">Overall compliance rate</p>
                </div>
                <div className="p-2 bg-green-500 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <Progress value={criticalMetrics.complianceHealth} className="mt-2" />
            </CardContent>
          </Card>

          {/* Client Count */}
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Active Clients</p>
                  <p className="text-2xl font-bold text-purple-900">{criticalMetrics.totalClients}</p>
                  <p className="text-xs text-purple-600">Total client portfolio</p>
                </div>
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Column - Task & Workflow Hub */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Task & Workflow Hub</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="priorities" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="priorities">Priorities</TabsTrigger>
                    <TabsTrigger value="status">Status</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="priorities" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Critical & Upcoming Tasks</h3>
                        <Badge variant="outline">{priorityTasks.length} items</Badge>
                      </div>
                      
                      {priorityTasks.length > 0 ? (
                        <ScrollArea className="h-80">
                          <div className="space-y-2">
                            {priorityTasks.map((task: any) => {
                              const client = (clients as any[])?.find((c: any) => c.id === task.clientId);
                              const entity = (entities as any[])?.find((e: any) => e.id === task.entityId);
                              
                              return (
                                <div key={task.id} className={`p-3 border rounded-lg ${getUrgencyColor(task)}`}>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{task.taskDetails}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        {client?.displayName} • {entity?.name}
                                      </p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs">
                                          {getUrgencyLabel(task)}
                                        </Badge>
                                        {task.complianceDeadline && (
                                          <Badge variant="outline" className="text-xs">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            Compliance
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <Link href={`/tasks`}>
                                      <Button variant="ghost" size="sm">
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No critical tasks at the moment</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="status" className="mt-4">
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900">Task Status Overview</h3>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-700">{statusDistribution.completed}%</div>
                          <div className="text-sm text-green-600">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-700">{statusDistribution.inProgress}%</div>
                          <div className="text-sm text-blue-600">In Progress</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-2xl font-bold text-red-700">{statusDistribution.overdue}%</div>
                          <div className="text-sm text-red-600">Overdue</div>
                        </div>
                      </div>
                      
                      <div className="text-center pt-4">
                        <Link href="/reports/task-performance">
                          <Button variant="outline" size="sm">
                            View Detailed Analytics <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Recent Activity</h3>
                        <Badge variant="outline">Last 7 days</Badge>
                      </div>
                      
                      {recentActivity.length > 0 ? (
                        <ScrollArea className="h-80">
                          <div className="space-y-2">
                            {recentActivity.map((activity: any) => (
                              <div key={activity.taskId} className="p-3 border rounded-lg bg-gray-50">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${activity.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                  <p className="font-medium text-sm flex-1">{activity.taskDetails}</p>
                                  <span className="text-xs text-gray-500">
                                    {format(activity.updatedAt, 'MMM d')}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 ml-4">
                                  {activity.clientName} • {activity.entityName}
                                </p>
                                <Badge variant="outline" className="text-xs ml-4 mt-1">
                                  {activity.statusName}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No recent activity</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Column - Compliance & Client Insights */}
          <div className="space-y-6">
            {/* Compliance Hotspots */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Compliance Hotspots</CardTitle>
                <CardDescription>Entities requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {complianceHotspots.length > 0 ? (
                  <div className="space-y-3">
                    {complianceHotspots.map((hotspot: any) => (
                      <div key={hotspot.entityId} className="p-3 border rounded-lg bg-red-50 border-red-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-red-900">{hotspot.entityName}</p>
                            <p className="text-xs text-red-700">{hotspot.clientName} • {hotspot.countryName}</p>
                            <div className="flex gap-2 mt-2">
                              {hotspot.overdueTasks > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {hotspot.overdueTasks} overdue
                                </Badge>
                              )}
                              {hotspot.urgentCompliance > 0 && (
                                <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                                  {hotspot.urgentCompliance} urgent
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-red-800">Risk: {hotspot.riskScore}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="text-center pt-2">
                      <Link href="/reports/compliance-overview">
                        <Button variant="outline" size="sm">
                          View Full Report <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All compliance on track</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Performance Snapshot */}
            {user?.isSuperAdmin && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">Team Snapshot</CardTitle>
                  <CardDescription>High-level team metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Team Members</span>
                      <span className="font-semibold">{(users as any[])?.length || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Overall Completion Rate</span>
                      <span className="font-semibold">{statusDistribution.completed}%</span>
                    </div>
                    
                    <Progress value={statusDistribution.completed} />
                    
                    <div className="text-center pt-2">
                      <Link href="/reports/team-efficiency">
                        <Button variant="outline" size="sm">
                          Team Analytics <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Actions Footer */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Quick Actions</h3>
              <div className="flex gap-2">
                <Link href="/tasks">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </Link>
                <Link href="/clients">
                  <Button variant="outline" size="sm">
                    <Building2 className="h-4 w-4 mr-2" />
                    Manage Clients
                  </Button>
                </Link>
                <Link href="/compliance-calendar">
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar
                  </Button>
                </Link>
                <Link href="/reports">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Reports
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}