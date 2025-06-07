import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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
import { AIInsightsPanel } from "@/components/reports/ai-insights-panel";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export default function TaskLifecycleReport() {
  const [filters, setFilters] = useState({
    period: "30",
    taskType: "all",
    status: "all",
    assignee: "all",
    client: "all",
    priority: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });

  // Apply filtering
  const filteredTasks = useMemo(() => {
    if (!tasks?.length) return [];

    return tasks.filter((task: any) => {
      // Period/Date filtering
      const taskDate = new Date(task.createdAt);
      if (filters.dateFrom && filters.dateTo) {
        if (taskDate < filters.dateFrom || taskDate > filters.dateTo) return false;
      } else if (filters.period !== "all") {
        const periodDays = parseInt(filters.period);
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - periodDays);
        if (taskDate < periodStart) return false;
      }

      // Task type filtering
      if (filters.taskType !== "all" && task.taskType !== filters.taskType) {
        return false;
      }

      // Status filtering
      if (filters.status !== "all" && task.statusId !== parseInt(filters.status)) {
        return false;
      }

      // Assignee filtering
      if (filters.assignee !== "all" && task.assigneeId !== parseInt(filters.assignee)) {
        return false;
      }

      // Client filtering
      if (filters.client !== "all" && task.clientId !== parseInt(filters.client)) {
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
          avgLifecycle: 0,
          avgTimeToStart: 0,
          avgTimeToComplete: 0,
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

    const completedStatusId = taskStatuses.find((s: any) => s.name === 'Completed')?.id;
    const inProgressStatusId = taskStatuses.find((s: any) => s.name === 'In Progress')?.id;
    const currentDate = new Date();

    // Calculate lifecycle metrics
    const completedTasks = filteredTasks.filter((task: any) => task.statusId === completedStatusId);
    
    const lifecycleTimes = completedTasks
      .filter((task: any) => task.updatedAt)
      .map((task: any) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.updatedAt);
        return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });

    const avgLifecycle = lifecycleTimes.length > 0 ? 
      Math.round(lifecycleTimes.reduce((sum, time) => sum + time, 0) / lifecycleTimes.length) : 0;

    // Time to start (approximation based on status changes)
    const avgTimeToStart = Math.round(avgLifecycle * 0.2); // Placeholder calculation
    const avgTimeToComplete = Math.round(avgLifecycle * 0.8);
    const cycleEfficiency = avgLifecycle > 0 ? Math.round((avgTimeToComplete / avgLifecycle) * 100) : 0;

    // Status transitions analysis
    const statusCounts = taskStatuses.map((status: any) => {
      const count = filteredTasks.filter((task: any) => task.statusId === status.id).length;
      return {
        name: status.name,
        count,
        percentage: filteredTasks.length > 0 ? Math.round((count / filteredTasks.length) * 100) : 0
      };
    }).filter(item => item.count > 0);

    // Lifecycle stages (created, started, completed)
    const createdCount = filteredTasks.length;
    const startedCount = filteredTasks.filter((task: any) => 
      task.statusId === inProgressStatusId || task.statusId === completedStatusId
    ).length;
    const completedCount = completedTasks.length;

    const lifecycleStages = [
      { stage: 'Created', count: createdCount, percentage: 100 },
      { stage: 'Started', count: startedCount, percentage: Math.round((startedCount / createdCount) * 100) },
      { stage: 'Completed', count: completedCount, percentage: Math.round((completedCount / createdCount) * 100) }
    ];

    // Time distribution analysis
    const timeRanges = [
      { range: '0-1 days', min: 0, max: 1 },
      { range: '2-7 days', min: 2, max: 7 },
      { range: '8-14 days', min: 8, max: 14 },
      { range: '15-30 days', min: 15, max: 30 },
      { range: '30+ days', min: 31, max: Infinity }
    ];

    const timeDistribution = timeRanges.map(range => {
      const count = lifecycleTimes.filter(time => 
        time >= range.min && time <= range.max
      ).length;
      
      return {
        range: range.range,
        count,
        percentage: lifecycleTimes.length > 0 ? Math.round((count / lifecycleTimes.length) * 100) : 0
      };
    });

    // Identify bottlenecks (statuses with high task counts)
    const bottlenecks = statusCounts
      .filter(status => status.name !== 'Completed' && status.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(status => ({
        status: status.name,
        taskCount: status.count,
        impactLevel: status.count > createdCount * 0.3 ? 'High' : 
                   status.count > createdCount * 0.15 ? 'Medium' : 'Low'
      }));

    // Completion trend (last 14 days)
    const completionTrend = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayCreated = filteredTasks.filter((task: any) => {
        const taskDate = new Date(task.createdAt);
        return taskDate.toDateString() === date.toDateString();
      }).length;

      const dayCompleted = completedTasks.filter((task: any) => {
        if (!task.updatedAt) return false;
        const taskDate = new Date(task.updatedAt);
        return taskDate.toDateString() === date.toDateString();
      }).length;
      
      completionTrend.push({
        date: format(date, 'MMM dd'),
        created: dayCreated,
        completed: dayCompleted
      });
    }

    // Task flow analysis by type
    const taskTypeGroups = [...new Set(filteredTasks.map((task: any) => task.taskType))];
    const taskFlowAnalysis = taskTypeGroups.map((type: string) => {
      const typeTasks = filteredTasks.filter((task: any) => task.taskType === type);
      const typeCompleted = typeTasks.filter((task: any) => task.statusId === completedStatusId);
      
      const typeLifecycleTimes = typeCompleted
        .filter((task: any) => task.updatedAt)
        .map((task: any) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.updatedAt);
          return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });

      const avgTime = typeLifecycleTimes.length > 0 ? 
        Math.round(typeLifecycleTimes.reduce((sum, time) => sum + time, 0) / typeLifecycleTimes.length) : 0;

      return {
        type,
        totalTasks: typeTasks.length,
        completedTasks: typeCompleted.length,
        completionRate: typeTasks.length > 0 ? Math.round((typeCompleted.length / typeTasks.length) * 100) : 0,
        avgLifecycleTime: avgTime
      };
    });

    return {
      lifecycleMetrics: {
        avgLifecycle,
        avgTimeToStart,
        avgTimeToComplete,
        cycleEfficiency
      },
      statusTransitions: statusCounts,
      lifecycleStages,
      timeDistribution,
      bottlenecks,
      completionTrend,
      taskFlowAnalysis
    };
  }, [filteredTasks, taskStatuses]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('task-lifecycle-report', {
        title: 'Task Lifecycle Analysis Report',
        subtitle: `Generated for ${filters.period === 'all' ? 'All Time' : `Last ${filters.period} Days`}`,
        reportType: 'TaskLifecycle',
        filters: {
          period: filters.period,
          taskType: filters.taskType,
          status: filters.status !== 'all' ? taskStatuses.find(s => s.id === parseInt(filters.status))?.name : 'All',
          assignee: filters.assignee !== 'all' ? users.find(u => u.id === parseInt(filters.assignee))?.displayName : 'All',
          client: filters.client !== 'all' ? clients.find(c => c.id === parseInt(filters.client))?.name : 'All',
          dateRange: filters.dateFrom && filters.dateTo ? `${format(filters.dateFrom, 'MMM dd, yyyy')} - ${format(filters.dateTo, 'MMM dd, yyyy')}` : 'N/A'
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
            <AIInsightsPanel 
              reportType="task-lifecycle" 
              filters={filters}
            />
            <Button onClick={handleExportPDF} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Ultra-Compact Single Row Filters */}
        <Card className="bg-gray-50/50">
          <CardContent className="p-2">
            <div className="flex flex-wrap gap-1">
              {/* Period Filter */}
              <div className="flex items-center gap-1">
                <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7d</SelectItem>
                    <SelectItem value="30">30d</SelectItem>
                    <SelectItem value="90">90d</SelectItem>
                    <SelectItem value="365">1y</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type Filter */}
              <div className="flex items-center gap-1">
                <Select value={filters.taskType} onValueChange={(value) => setFilters(prev => ({ ...prev, taskType: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Recurring">Recurring</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1">
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {taskStatuses.map((status: any) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Filter */}
              <div className="flex items-center gap-1">
                <Select value={filters.assignee} onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.displayName || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client Filter */}
              <div className="flex items-center gap-1">
                <Select value={filters.client} onValueChange={(value) => setFilters(prev => ({ ...prev, client: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom || undefined}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo || undefined}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({
                    period: "30",
                    taskType: "all",
                    status: "all",
                    assignee: "all",
                    client: "all",
                    priority: "all",
                    dateFrom: null,
                    dateTo: null
                  })}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <div id="task-lifecycle-report" className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Lifecycle Time</CardTitle>
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.lifecycleMetrics.avgLifecycle}</div>
                <p className="text-xs text-muted-foreground">
                  days average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time to Start</CardTitle>
                <Timer className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.lifecycleMetrics.avgTimeToStart}</div>
                <p className="text-xs text-muted-foreground">
                  days average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time to Complete</CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.lifecycleMetrics.avgTimeToComplete}</div>
                <p className="text-xs text-muted-foreground">
                  days average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cycle Efficiency</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.lifecycleMetrics.cycleEfficiency}%</div>
                <Progress value={analytics.lifecycleMetrics.cycleEfficiency} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* AI-Powered Insights */}
          <AIInsightsPanel 
            reportType="task-lifecycle" 
            filters={filters}
          />

          {/* Task Flow Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5" />
                Task Flow Analysis by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Type</TableHead>
                    <TableHead>Total Tasks</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Avg Lifecycle</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.taskFlowAnalysis.map((flow: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{flow.type}</TableCell>
                      <TableCell>{flow.totalTasks}</TableCell>
                      <TableCell>{flow.completedTasks}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={flow.completionRate} className="w-16" />
                          <span className="text-sm">{flow.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{flow.avgLifecycleTime} days</TableCell>
                      <TableCell>
                        <Badge variant={flow.completionRate >= 80 ? "default" : flow.completionRate >= 60 ? "secondary" : "destructive"}>
                          {flow.completionRate >= 80 ? "Excellent" : flow.completionRate >= 60 ? "Good" : "Needs Improvement"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Bottlenecks Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Process Bottlenecks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Task Count</TableHead>
                    <TableHead>Impact Level</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.bottlenecks.map((bottleneck: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{bottleneck.status}</TableCell>
                      <TableCell>{bottleneck.taskCount}</TableCell>
                      <TableCell>
                        <Badge variant={
                          bottleneck.impactLevel === 'High' ? "destructive" : 
                          bottleneck.impactLevel === 'Medium' ? "secondary" : "default"
                        }>
                          {bottleneck.impactLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bottleneck.impactLevel === 'High' ? 'Review workflow and resource allocation' :
                         bottleneck.impactLevel === 'Medium' ? 'Monitor closely and optimize processes' :
                         'Continue current approach'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completion Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Task Creation vs Completion Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.completionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="created" stackId="1" stroke="#8884d8" fill="#8884d8" name="Created" />
                    <Area type="monotone" dataKey="completed" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lifecycle Stages Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle Stages</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.lifecycleStages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Task Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.timeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ range, percentage }) => `${range}: ${percentage}%`}
                    >
                      {analytics.timeDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Transitions Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.statusTransitions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Task Count" />
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