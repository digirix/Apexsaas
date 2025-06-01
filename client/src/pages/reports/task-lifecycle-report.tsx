import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Play, 
  Pause, 
  CheckCircle,
  AlertCircle,
  Filter,
  Download,
  Calendar,
  TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter } from 'recharts';

export default function TaskLifecycleReport() {
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [timeRange, setTimeRange] = React.useState("30");

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });

  const completedStatusId = taskStatuses?.find((s: any) => s.name === 'Completed')?.id;
  const inProgressStatusId = taskStatuses?.find((s: any) => s.name === 'In Progress')?.id;

  // Task lifecycle analysis
  const taskLifecycleAnalysis = React.useMemo(() => {
    if (!tasks?.length || !taskStatuses?.length) return { lifecycles: [], metrics: {} };

    const currentDate = new Date();

    const lifecycles = tasks.map((task: any) => {
      const createdDate = new Date(task.createdAt);
      const dueDate = new Date(task.dueDate);
      const completedDate = task.statusId === completedStatusId && task.updatedAt ? new Date(task.updatedAt) : null;

      // Calculate lifecycle metrics
      const ageInDays = Math.ceil((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const timeToCompletion = completedDate ? 
        Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0 && !completedDate;
      const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0 && !completedDate;

      // Lifecycle stage
      let stage = 'Unknown';
      let stageColor = 'slate';
      
      if (completedDate) {
        stage = 'Completed';
        stageColor = 'green';
      } else if (isOverdue) {
        stage = 'Overdue';
        stageColor = 'red';
      } else if (isDueSoon) {
        stage = 'Due Soon';
        stageColor = 'orange';
      } else if (task.statusId === inProgressStatusId) {
        stage = 'In Progress';
        stageColor = 'blue';
      } else {
        stage = 'Pending';
        stageColor = 'yellow';
      }

      // Progress percentage
      let progressPercentage = 0;
      if (completedDate) {
        progressPercentage = 100;
      } else if (task.statusId === inProgressStatusId) {
        const totalDuration = Math.ceil((dueDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const elapsed = ageInDays;
        progressPercentage = Math.min(90, Math.round((elapsed / totalDuration) * 100));
      } else {
        progressPercentage = 10; // Just started
      }

      // Get related data
      const assignee = users?.find((u: any) => u.id === task.assigneeId);
      const client = clients?.find((c: any) => c.id === task.clientId);
      const entity = entities?.find((e: any) => e.id === task.entityId);
      const status = taskStatuses?.find((s: any) => s.id === task.statusId);

      return {
        taskId: task.id,
        title: task.taskDetails || 'Untitled Task',
        assigneeName: assignee?.displayName || 'Unassigned',
        clientName: client?.displayName || 'Unknown Client',
        entityName: entity?.name || 'Unknown Entity',
        statusName: status?.name || 'Unknown',
        createdDate,
        dueDate,
        completedDate,
        ageInDays,
        timeToCompletion,
        daysUntilDue,
        isOverdue,
        isDueSoon,
        stage,
        stageColor,
        progressPercentage,
        isCompleted: !!completedDate,
        complianceDeadline: task.complianceDeadline ? new Date(task.complianceDeadline) : null
      };
    });

    // Calculate metrics
    const totalTasks = lifecycles.length;
    const completedTasks = lifecycles.filter(t => t.isCompleted).length;
    const overdueTasks = lifecycles.filter(t => t.isOverdue).length;
    const dueSoonTasks = lifecycles.filter(t => t.isDueSoon).length;
    const inProgressTasks = lifecycles.filter(t => t.stage === 'In Progress').length;

    const avgTimeToCompletion = completedTasks > 0 ? 
      Math.round(lifecycles.filter(t => t.timeToCompletion).reduce((sum, t) => sum + (t.timeToCompletion || 0), 0) / completedTasks) : 0;

    const avgTaskAge = totalTasks > 0 ? 
      Math.round(lifecycles.reduce((sum, t) => sum + t.ageInDays, 0) / totalTasks) : 0;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Bottleneck analysis
    const bottlenecks = lifecycles.filter(t => !t.isCompleted && t.ageInDays > 10);

    const metrics = {
      totalTasks,
      completedTasks,
      overdueTasks,
      dueSoonTasks,
      inProgressTasks,
      avgTimeToCompletion,
      avgTaskAge,
      completionRate,
      bottleneckCount: bottlenecks.length
    };

    return {
      lifecycles: lifecycles.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime()),
      metrics
    };
  }, [tasks, taskStatuses, users, clients, entities, completedStatusId, inProgressStatusId]);

  // Chart data preparation
  const stageDistribution = taskLifecycleAnalysis.lifecycles.reduce((acc: any, task) => {
    acc[task.stage] = (acc[task.stage] || 0) + 1;
    return acc;
  }, {});

  const stageData = Object.entries(stageDistribution).map(([stage, count]) => ({
    stage,
    count,
    color: stage === 'Completed' ? '#22C55E' : 
           stage === 'In Progress' ? '#3B82F6' : 
           stage === 'Overdue' ? '#EF4444' : 
           stage === 'Due Soon' ? '#F97316' : '#EAB308'
  }));

  // Timeline data for completion trends
  const timelineData = taskLifecycleAnalysis.lifecycles
    .filter(t => t.isCompleted)
    .reduce((acc: any, task) => {
      const month = task.completedDate?.toISOString().substring(0, 7);
      if (month) {
        acc[month] = (acc[month] || 0) + 1;
      }
      return acc;
    }, {});

  const completionTrend = Object.entries(timelineData)
    .map(([month, count]) => ({ month, completions: count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'Due Soon': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Task Lifecycle Analysis</h1>
              <p className="text-slate-600">Track task progression from creation to completion</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-slate-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="due-soon">Due Soon</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Alert for Bottlenecks */}
      {taskLifecycleAnalysis.metrics.bottleneckCount > 0 && (
        <Card className="mb-8 border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Lifecycle Bottlenecks Detected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-800">
              {taskLifecycleAnalysis.metrics.bottleneckCount} task(s) have been in progress for more than 10 days. 
              Consider reviewing these tasks for potential blockers or resource allocation issues.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Total Tasks</CardTitle>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {taskLifecycleAnalysis.metrics.totalTasks}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {taskLifecycleAnalysis.metrics.inProgressTasks} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {taskLifecycleAnalysis.metrics.completionRate}%
            </div>
            <Progress value={taskLifecycleAnalysis.metrics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Completion Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {taskLifecycleAnalysis.metrics.avgTimeToCompletion}
            </div>
            <p className="text-sm text-slate-500 mt-1">days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Overdue Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {taskLifecycleAnalysis.metrics.overdueTasks}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {taskLifecycleAnalysis.metrics.dueSoonTasks} due soon
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Stage Distribution</CardTitle>
            <CardDescription>Current status of all tasks in the lifecycle</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Trend</CardTitle>
            <CardDescription>Monthly task completion over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completions" stroke="#22C55E" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Task Lifecycle Details */}
      <Card>
        <CardHeader>
          <CardTitle>Task Lifecycle Details</CardTitle>
          <CardDescription>Detailed view of each task's lifecycle progression</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 font-medium text-slate-600">Task</th>
                  <th className="text-left p-3 font-medium text-slate-600">Assignee</th>
                  <th className="text-left p-3 font-medium text-slate-600">Client/Entity</th>
                  <th className="text-left p-3 font-medium text-slate-600">Stage</th>
                  <th className="text-left p-3 font-medium text-slate-600">Progress</th>
                  <th className="text-left p-3 font-medium text-slate-600">Age</th>
                  <th className="text-left p-3 font-medium text-slate-600">Due Date</th>
                  <th className="text-left p-3 font-medium text-slate-600">Completion Time</th>
                </tr>
              </thead>
              <tbody>
                {taskLifecycleAnalysis.lifecycles.slice(0, 20).map((task, index) => (
                  <tr key={task.taskId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-medium text-slate-900 max-w-xs truncate">
                        {task.title}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{task.assigneeName}</td>
                    <td className="p-3">
                      <div className="text-slate-600">
                        <div className="font-medium">{task.clientName}</div>
                        <div className="text-sm text-slate-500">{task.entityName}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={getStageColor(task.stage)}>
                        {task.stage}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              task.stage === 'Completed' ? 'bg-green-600' :
                              task.stage === 'In Progress' ? 'bg-blue-600' :
                              task.stage === 'Overdue' ? 'bg-red-600' : 'bg-yellow-600'
                            }`}
                            style={{ width: `${task.progressPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-600">{task.progressPercentage}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{task.ageInDays} days</td>
                    <td className="p-3">
                      <div className="text-slate-600">
                        {task.dueDate.toLocaleDateString()}
                        {task.isOverdue && <span className="text-red-600 ml-1">(Overdue)</span>}
                        {task.isDueSoon && <span className="text-orange-600 ml-1">(Due Soon)</span>}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">
                      {task.timeToCompletion ? `${task.timeToCompletion} days` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {taskLifecycleAnalysis.lifecycles.length > 20 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-500">
                Showing 20 of {taskLifecycleAnalysis.lifecycles.length} tasks
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}