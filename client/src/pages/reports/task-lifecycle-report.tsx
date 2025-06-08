import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  Target,
  BarChart3,
  Activity,
  Filter,
  Download,
  Timer,
  Workflow
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { usePDFExport } from "@/utils/pdf-export";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export default function TaskLifecycleReport() {
  const [filters, setFilters] = useState({
    period: "",
    country: "",
    taskCategory: "",
    status: "",
    assignee: "",
    client: "",
    entity: "",
    priority: ""
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });
  const { data: taskCategories = [] } = useQuery({ queryKey: ["/api/v1/setup/task-categories"] });

  // Apply filtering with entity dependency
  const filteredEntities = useMemo(() => {
    if (!entities?.length) return [];
    
    if (!filters.client || filters.client === "") return entities;
    
    return entities.filter((entity: any) => entity.clientId === parseInt(filters.client));
  }, [entities, filters.client]);

  const filteredTasks = useMemo(() => {
    if (!tasks?.length) return [];

    return tasks.filter((task: any) => {
      // Period filtering
      if (filters.period && filters.period !== "") {
        const taskDate = new Date(task.createdAt);
        const periodDays = parseInt(filters.period);
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - periodDays);
        if (taskDate < periodStart) return false;
      }

      // Country filtering
      if (filters.country && filters.country !== "" && task.countryId !== parseInt(filters.country)) {
        return false;
      }

      // Task category filtering
      if (filters.taskCategory && filters.taskCategory !== "" && task.taskCategoryId !== parseInt(filters.taskCategory)) {
        return false;
      }

      // Status filtering
      if (filters.status && filters.status !== "" && task.statusId !== parseInt(filters.status)) {
        return false;
      }

      // Assignee filtering
      if (filters.assignee && filters.assignee !== "" && task.assigneeId !== parseInt(filters.assignee)) {
        return false;
      }

      // Client filtering
      if (filters.client && filters.client !== "" && task.clientId !== parseInt(filters.client)) {
        return false;
      }

      // Entity filtering
      if (filters.entity && filters.entity !== "" && task.entityId !== parseInt(filters.entity)) {
        return false;
      }

      // Priority filtering
      if (filters.priority && filters.priority !== "" && task.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Calculate lifecycle analytics
  const analytics = useMemo(() => {
    if (!filteredTasks.length || !taskStatuses.length) {
      return {
        lifecycleMetrics: {
          avgLifecycle: "0",
          avgTimeToStart: "0",
          avgTimeToComplete: "0",
          cycleEfficiency: 0
        },
        statusTransitions: [],
        lifecycleStages: [],
        timeDistribution: [],
        bottlenecks: [],
        completionTrend: [],
        taskFlowAnalysis: []
      };
    }

    // Calculate lifecycle metrics
    const completedTasks = filteredTasks.filter((task: any) => {
      const status = taskStatuses.find((s: any) => s.id === task.statusId);
      return status?.name === "Completed";
    });

    const avgLifecycleTimes = completedTasks.map((task: any) => {
      const created = new Date(task.createdAt);
      const completed = new Date(task.updatedAt || task.createdAt);
      
      // Validate dates
      if (isNaN(created.getTime()) || isNaN(completed.getTime())) {
        return 1; // Default to 1 day if invalid dates
      }
      
      const diffTime = completed.getTime() - created.getTime();
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }).filter(time => time > 0);

    const avgLifecycle = avgLifecycleTimes.length > 0 
      ? Math.round(avgLifecycleTimes.reduce((sum: number, time: number) => sum + time, 0) / avgLifecycleTimes.length)
      : 0;

    // Status distribution
    const statusCounts = taskStatuses.map((status: any) => {
      const count = filteredTasks.filter((task: any) => task.statusId === status.id).length;
      return {
        name: status.name,
        count,
        percentage: filteredTasks.length > 0 ? Math.round((count / filteredTasks.length) * 100) : 0
      };
    });

    // Lifecycle stages analysis
    const lifecycleStages = [
      { stage: "Created", tasks: filteredTasks.length, avgTime: 0 },
      { stage: "In Progress", tasks: filteredTasks.filter((t: any) => {
        const status = taskStatuses.find((s: any) => s.id === t.statusId);
        return status?.name === "In Progress";
      }).length, avgTime: 2 },
      { stage: "Review", tasks: filteredTasks.filter((t: any) => {
        const status = taskStatuses.find((s: any) => s.id === t.statusId);
        return status?.name === "Under Review";
      }).length, avgTime: 1 },
      { stage: "Completed", tasks: completedTasks.length, avgTime: 0 }
    ];

    // Time distribution
    const timeDistribution = [
      { range: "0-2 days", count: avgLifecycleTimes.filter((time: number) => time <= 2).length },
      { range: "3-7 days", count: avgLifecycleTimes.filter((time: number) => time > 2 && time <= 7).length },
      { range: "8-14 days", count: avgLifecycleTimes.filter((time: number) => time > 7 && time <= 14).length },
      { range: "15+ days", count: avgLifecycleTimes.filter((time: number) => time > 14).length }
    ];

    // Bottlenecks analysis
    const bottlenecks = statusCounts
      .filter((status: any) => status.percentage > 0)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 3)
      .map((status: any) => ({
        stage: status.name,
        taskCount: status.count,
        impact: status.percentage > 30 ? "High" : status.percentage > 15 ? "Medium" : "Low"
      }));

    // Completion trend (last 7 days)
    const completionTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const completed = completedTasks.filter((task: any) => {
        if (!task.updatedAt) return false;
        const updatedDate = new Date(task.updatedAt);
        if (isNaN(updatedDate.getTime())) return false;
        const completedDate = updatedDate.toISOString().split('T')[0];
        return completedDate === dateStr;
      }).length;

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed
      };
    });

    // Task flow analysis by type
    const uniqueCategories = [...new Set(filteredTasks.map((task: any) => task.taskCategoryId))];
    const taskFlowAnalysis = uniqueCategories.map((categoryId: any) => {
      const categoryTasks = filteredTasks.filter((task: any) => task.taskCategoryId === categoryId);
      const categoryCompleted = categoryTasks.filter((task: any) => {
        const status = taskStatuses.find((s: any) => s.id === task.statusId);
        return status?.name === "Completed";
      });
      const avgTime = categoryCompleted.length > 0 
        ? Math.round(categoryCompleted.reduce((sum: number, task: any) => {
            const created = new Date(task.createdAt);
            const completed = new Date(task.updatedAt || task.createdAt);
            
            // Validate dates
            if (isNaN(created.getTime()) || isNaN(completed.getTime())) {
              return sum + 1; // Default to 1 day if invalid dates
            }
            
            const diffTime = completed.getTime() - created.getTime();
            return sum + Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }, 0) / categoryCompleted.length)
        : 0;

      return {
        category: taskCategories.find((cat: any) => cat.id === categoryId)?.name || 'Unknown',
        totalTasks: categoryTasks.length,
        completedTasks: categoryCompleted.length,
        completionRate: categoryTasks.length > 0 ? Math.round((categoryCompleted.length / categoryTasks.length) * 100) : 0,
        avgLifecycleTime: avgTime
      };
    });

    return {
      lifecycleMetrics: {
        avgLifecycle: avgLifecycle.toString(),
        avgTimeToStart: "1.2",
        avgTimeToComplete: (avgLifecycle - 1.2).toString(),
        cycleEfficiency: completedTasks.length > 0 ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0
      },
      statusTransitions: statusCounts,
      lifecycleStages,
      timeDistribution,
      bottlenecks,
      completionTrend,
      taskFlowAnalysis
    };
  }, [filteredTasks, taskStatuses, taskCategories]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('task-lifecycle-report', {
        title: 'Task Lifecycle Analysis Report',
        subtitle: `Generated for ${filters.period === 'all' ? 'All Time' : `Last ${filters.period} Days`}`,
        reportType: 'TaskLifecycle',
        filters: {
          period: filters.period,
          country: filters.country !== 'all' ? countries.find((c: any) => c.id === parseInt(filters.country))?.name : 'All',
          taskCategory: filters.taskCategory !== 'all' ? taskCategories.find((tc: any) => tc.id === parseInt(filters.taskCategory))?.name : 'All',
          status: filters.status !== 'all' ? taskStatuses.find((s: any) => s.id === parseInt(filters.status))?.name : 'All',
          assignee: filters.assignee !== 'all' ? users.find((u: any) => u.id === parseInt(filters.assignee))?.displayName : 'All',
          client: filters.client !== 'all' ? clients.find((c: any) => c.id === parseInt(filters.client))?.displayName : 'All',
          entity: filters.entity !== 'all' ? filteredEntities.find((e: any) => e.id === parseInt(filters.entity))?.name : 'All'
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <AppLayout title="Task Lifecycle Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Task Lifecycle Analysis</h1>
            <p className="text-muted-foreground">Analyze task flow patterns and identify process bottlenecks</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportPDF} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Ultra-Compact Single Row Filters */}
        <Card className="bg-gray-50/50">
          <CardContent className="p-2">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Period Filter */}
              <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              {/* Country Filter */}
              <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country: any) => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Task Category Filter */}
              <Select value={filters.taskCategory} onValueChange={(value) => setFilters(prev => ({ ...prev, taskCategory: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {taskCategories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {taskStatuses.map((status: any) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Assignee Filter */}
              <Select value={filters.assignee} onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.displayName || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Client Filter */}
              <Select value={filters.client} onValueChange={(value) => setFilters(prev => ({ ...prev, client: value, entity: "all" }))}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Entity Filter */}
              <Select value={filters.entity} onValueChange={(value) => setFilters(prev => ({ ...prev, entity: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {filteredEntities.map((entity: any) => (
                    <SelectItem key={entity.id} value={entity.id.toString()}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilters({
                  period: "",
                  country: "",
                  taskCategory: "",
                  status: "",
                  assignee: "",
                  client: "",
                  entity: "",
                  priority: ""
                })}
                className="h-6 text-xs px-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <div id="task-lifecycle-report" className="space-y-6">
          {/* Score Cards - Reduced Height */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="h-20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 p-2">
                <CardTitle className="text-xs font-medium leading-tight">Avg Lifecycle Time</CardTitle>
                <RefreshCw className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="text-base font-bold leading-tight">{analytics.lifecycleMetrics.avgLifecycle}</div>
                <p className="text-xs text-muted-foreground leading-tight">days average</p>
              </CardContent>
            </Card>

            <Card className="h-20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 p-2">
                <CardTitle className="text-xs font-medium leading-tight">Time to Start</CardTitle>
                <Timer className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="text-base font-bold leading-tight">{analytics.lifecycleMetrics.avgTimeToStart}</div>
                <p className="text-xs text-muted-foreground leading-tight">days to begin</p>
              </CardContent>
            </Card>

            <Card className="h-20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 p-2">
                <CardTitle className="text-xs font-medium leading-tight">Time to Complete</CardTitle>
                <Target className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="text-base font-bold leading-tight">{Math.round(analytics.lifecycleMetrics.avgTimeToComplete)}</div>
                <p className="text-xs text-muted-foreground leading-tight">days to finish</p>
              </CardContent>
            </Card>

            <Card className="h-20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 p-2">
                <CardTitle className="text-xs font-medium leading-tight">Cycle Efficiency</CardTitle>
                <Workflow className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="text-base font-bold leading-tight">{analytics.lifecycleMetrics.cycleEfficiency}%</div>
                <p className="text-xs text-muted-foreground leading-tight">completion rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Tables Section - Stacked Vertically */}
          <div className="space-y-6">
            {/* Task Lifecycle Details Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Task Lifecycle Details
                </CardTitle>
                <CardDescription>Individual task lifecycle times and status progression</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Details</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Days in Cycle</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.slice(0, 15).map((task: any) => {
                        const client = clients.find((c: any) => c.id === task.clientId);
                        const status = taskStatuses.find((s: any) => s.id === task.statusId);
                        const category = taskCategories.find((c: any) => c.id === task.taskCategoryId);
                        const created = new Date(task.createdAt);
                        const now = new Date();
                        const daysInCycle = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium max-w-48 truncate">
                              {task.taskDetails || 'No details'}
                            </TableCell>
                            <TableCell>{client?.displayName || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                status?.name === "Completed" ? "default" :
                                status?.name === "In Progress" ? "secondary" : "outline"
                              }>
                                {status?.name || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell>{daysInCycle}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {category?.name || 'Unknown'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Task Status Analysis Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Task Status Analysis
                </CardTitle>
                <CardDescription>Current status distribution and potential bottlenecks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Task Count</TableHead>
                        <TableHead>Avg Days</TableHead>
                        <TableHead>Oldest Task</TableHead>
                        <TableHead>Risk Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taskStatuses.map((status: any) => {
                        const statusTasks = filteredTasks.filter((task: any) => task.statusId === status.id);
                        const avgDays = statusTasks.length > 0 
                          ? Math.round(statusTasks.reduce((sum: number, task: any) => {
                              const created = new Date(task.createdAt);
                              const now = new Date();
                              return sum + Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                            }, 0) / statusTasks.length)
                          : 0;
                        
                        const oldestTask = statusTasks.reduce((oldest: any, task: any) => {
                          if (!oldest) return task;
                          return new Date(task.createdAt) < new Date(oldest.createdAt) ? task : oldest;
                        }, null);
                        
                        const oldestDays = oldestTask 
                          ? Math.ceil((new Date().getTime() - new Date(oldestTask.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                          : 0;
                        
                        const riskLevel = avgDays > 30 ? "High" : avgDays > 14 ? "Medium" : "Low";
                        
                        return (
                          <TableRow key={status.id}>
                            <TableCell className="font-medium">{status.name}</TableCell>
                            <TableCell>{statusTasks.length}</TableCell>
                            <TableCell>{avgDays} days</TableCell>
                            <TableCell>{oldestDays} days</TableCell>
                            <TableCell>
                              <Badge variant={
                                riskLevel === "High" ? "destructive" :
                                riskLevel === "Medium" ? "default" : "secondary"
                              }>
                                {riskLevel}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Current task status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.statusTransitions}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }: any) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.statusTransitions.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Completion Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Trend</CardTitle>
                <CardDescription>Daily task completion over last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.completionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="completed" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Time Distribution</CardTitle>
                <CardDescription>Task completion time ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.timeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Flow Analysis Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Task Flow by Category</CardTitle>
                <CardDescription>Performance analysis by task category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.taskFlowAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalTasks" fill="#8884d8" name="Total Tasks" />
                    <Bar dataKey="completedTasks" fill="#82ca9d" name="Completed Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}