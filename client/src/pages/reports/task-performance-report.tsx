import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  Filter,
  Download,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Activity,
  Timer
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { usePDFExport } from "@/utils/pdf-export";
import { AIInsightsPanel } from "@/components/reports/ai-insights-panel";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export default function TaskPerformanceReport() {
  // Enhanced filtering states
  const [filters, setFilters] = useState({
    period: "30",
    teamMember: "all",
    taskType: "all", 
    status: "all",
    client: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    priority: "all"
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: taskCategories = [] } = useQuery({ queryKey: ["/api/v1/setup/task-categories"] });

  // Apply comprehensive filtering
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

      // Team member filtering
      if (filters.teamMember !== "all" && task.assigneeId !== parseInt(filters.teamMember)) {
        return false;
      }

      // Task type filtering
      if (filters.taskType !== "all" && task.taskType !== filters.taskType) {
        return false;
      }

      // Status filtering
      if (filters.status !== "all" && task.statusId !== parseInt(filters.status)) {
        return false;
      }

      // Client filtering
      if (filters.client !== "all" && task.clientId !== parseInt(filters.client)) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Calculate analytics based on filtered data
  const analytics = useMemo(() => {
    if (!filteredTasks.length || !taskStatuses.length) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueCount: 0,
        avgCompletionTime: 0,
        onTimeDeliveryRate: 0,
        efficiencyScore: 0,
        teamPerformance: [],
        statusDistribution: [],
        completionTrend: [],
        performanceByType: []
      };
    }

    const completedStatusId = taskStatuses.find((s: any) => s.name === 'Completed')?.id;
    const inProgressStatusId = taskStatuses.find((s: any) => s.name === 'In Progress')?.id;
    
    const completedTasks = filteredTasks.filter((task: any) => task.statusId === completedStatusId);
    const inProgressTasks = filteredTasks.filter((task: any) => task.statusId === inProgressStatusId);
    
    // Calculate overdue tasks
    const currentDate = new Date();
    const overdueCount = filteredTasks.filter((task: any) => {
      if (!task.dueDate || task.statusId === completedStatusId) return false;
      return new Date(task.dueDate) < currentDate;
    }).length;

    // Calculate completion times
    const completionTimes = completedTasks
      .filter((task: any) => task.updatedAt)
      .map((task: any) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.updatedAt);
        return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });

    const avgCompletionTime = completionTimes.length > 0 ? 
      Math.round(completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length) : 0;

    // Calculate on-time delivery rate
    const onTimeDeliveries = completedTasks.filter((task: any) => {
      if (!task.updatedAt || !task.dueDate) return false;
      const completed = new Date(task.updatedAt);
      const due = new Date(task.dueDate);
      return completed <= due;
    });

    const onTimeDeliveryRate = completedTasks.length > 0 ? 
      Math.round((onTimeDeliveries.length / completedTasks.length) * 100) : 0;

    // Calculate efficiency score
    const completionRate = filteredTasks.length > 0 ? 
      Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;
    const efficiencyScore = Math.round((completionRate * 0.6) + (onTimeDeliveryRate * 0.4));

    // Team performance analysis
    const teamPerformance = users.map((user: any) => {
      const userTasks = filteredTasks.filter((task: any) => task.assigneeId === user.id);
      const userCompleted = userTasks.filter((task: any) => task.statusId === completedStatusId);
      
      const userCompletionTimes = userCompleted
        .filter((task: any) => task.updatedAt)
        .map((task: any) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.updatedAt);
          return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });

      const userAvgTime = userCompletionTimes.length > 0 ? 
        Math.round(userCompletionTimes.reduce((sum, time) => sum + time, 0) / userCompletionTimes.length) : 0;

      const userCompletionRate = userTasks.length > 0 ? 
        Math.round((userCompleted.length / userTasks.length) * 100) : 0;

      return {
        name: user.displayName || user.username,
        totalTasks: userTasks.length,
        completedTasks: userCompleted.length,
        completionRate: userCompletionRate,
        avgCompletionTime: userAvgTime,
        efficiency: Math.round((userCompletionRate * 0.7) + (userAvgTime > 0 ? (10 / userAvgTime) * 30 : 0))
      };
    }).filter(member => member.totalTasks > 0);

    // Status distribution for pie chart
    const statusDistribution = taskStatuses.map((status: any) => {
      const count = filteredTasks.filter((task: any) => task.statusId === status.id).length;
      return {
        name: status.name,
        value: count,
        percentage: filteredTasks.length > 0 ? Math.round((count / filteredTasks.length) * 100) : 0
      };
    }).filter(item => item.value > 0);

    // Performance by task type
    const taskTypeGroups = [...new Set(filteredTasks.map((task: any) => task.taskType))];
    const performanceByType = taskTypeGroups.map((type: string) => {
      const typeTasks = filteredTasks.filter((task: any) => task.taskType === type);
      const typeCompleted = typeTasks.filter((task: any) => task.statusId === completedStatusId);
      return {
        type,
        total: typeTasks.length,
        completed: typeCompleted.length,
        completionRate: typeTasks.length > 0 ? Math.round((typeCompleted.length / typeTasks.length) * 100) : 0
      };
    });

    // Completion trend (last 7 days)
    const completionTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayTasks = completedTasks.filter((task: any) => {
        if (!task.updatedAt) return false;
        const taskDate = new Date(task.updatedAt);
        return taskDate.toDateString() === date.toDateString();
      });
      
      completionTrend.push({
        date: format(date, 'MMM dd'),
        completed: dayTasks.length
      });
    }

    return {
      totalTasks: filteredTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      overdueCount,
      avgCompletionTime,
      onTimeDeliveryRate,
      efficiencyScore,
      teamPerformance,
      statusDistribution,
      completionTrend,
      performanceByType
    };
  }, [filteredTasks, taskStatuses, users]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('task-performance-report', {
        title: 'Task Performance Analytics Report',
        subtitle: `Generated for ${filters.period === 'all' ? 'All Time' : `Last ${filters.period} Days`}`,
        reportType: 'TaskPerformance',
        filters: {
          period: filters.period,
          teamMember: filters.teamMember !== 'all' ? users.find(u => u.id === parseInt(filters.teamMember))?.displayName : 'All',
          taskType: filters.taskType,
          status: filters.status !== 'all' ? taskStatuses.find(s => s.id === parseInt(filters.status))?.name : 'All',
          client: filters.client !== 'all' ? clients.find(c => c.id === parseInt(filters.client))?.name : 'All',
          dateRange: filters.dateFrom && filters.dateTo ? `${format(filters.dateFrom, 'MMM dd, yyyy')} - ${format(filters.dateTo, 'MMM dd, yyyy')}` : 'N/A'
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <AppLayout title="Task Performance Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Task Performance Analytics</h1>
            <p className="text-muted-foreground">Monitor team productivity and task completion metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <AIInsightsPanel 
              reportType="task-performance" 
              filters={filters}
            />
            <Button onClick={handleExportPDF} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Compact Filters */}
        <Card className="bg-gray-50/50">
          <CardContent className="p-2">
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
                <Filter className="w-3 h-3" />
                Filters:
              </div>
              {/* Period Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Period:</span>
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

              {/* Team Member Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Team:</span>
                <Select value={filters.teamMember} onValueChange={(value) => setFilters(prev => ({ ...prev, teamMember: value }))}>
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

              {/* Task Category Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Type:</span>
                <Select value={filters.taskType} onValueChange={(value) => setFilters(prev => ({ ...prev, taskType: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {taskCategories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Status:</span>
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

              {/* Client Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Client:</span>
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

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilters({
                  period: "30",
                  teamMember: "all",
                  taskType: "all",
                  status: "all",
                  client: "all",
                  dateFrom: null,
                  dateTo: null,
                  priority: "all"
                })}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <div id="task-performance-report" className="space-y-6">
          {/* Compact Score Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.completedTasks} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.efficiencyScore}%</div>
                <Progress value={analytics.efficiencyScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
                <Timer className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgCompletionTime}</div>
                <p className="text-xs text-muted-foreground">days average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-time Delivery</CardTitle>
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.onTimeDeliveryRate}%</div>
                <Progress value={analytics.onTimeDeliveryRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>



          {/* Team Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Total Tasks</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Avg Time (Days)</TableHead>
                    <TableHead>Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.teamPerformance.map((member: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.totalTasks}</TableCell>
                      <TableCell>{member.completedTasks}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={member.completionRate} className="w-16" />
                          <span className="text-sm">{member.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.avgCompletionTime}</TableCell>
                      <TableCell>
                        <Badge variant={member.efficiency >= 80 ? "default" : member.efficiency >= 60 ? "secondary" : "destructive"}>
                          {member.efficiency}%
                        </Badge>
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
                <CardTitle>Completion Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.completionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {analytics.statusDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance by Task Type */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Task Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.performanceByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Total Tasks" />
                    <Bar dataKey="completed" fill="#82ca9d" name="Completed Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Efficiency Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Team Efficiency Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="#8884d8" name="Efficiency %" />
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