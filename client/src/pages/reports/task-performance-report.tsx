import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Award,
  AlertCircle,
  CheckCircle,
  Filter,
  Download,
  Calendar,
  User,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function TaskPerformanceReport() {
  const [dateRange, setDateRange] = React.useState("30");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });

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

  // Chart data preparation
  const performanceChartData = taskPerformanceAnalytics.memberPerformance.map(member => ({
    name: member.name,
    efficiency: member.avgEfficiencyScore,
    completed: member.completedTasks,
    total: member.totalTasks,
    completionRate: member.completionRate
  }));

  const efficiencyDistribution = [
    { name: 'Excellent (85+)', value: taskPerformanceAnalytics.memberPerformance.filter(m => m.avgEfficiencyScore >= 85).length, color: '#22C55E' },
    { name: 'Good (70-84)', value: taskPerformanceAnalytics.memberPerformance.filter(m => m.avgEfficiencyScore >= 70 && m.avgEfficiencyScore < 85).length, color: '#3B82F6' },
    { name: 'Needs Improvement (<70)', value: taskPerformanceAnalytics.memberPerformance.filter(m => m.avgEfficiencyScore < 70).length, color: '#EF4444' }
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Needs Improvement': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Task Performance Analytics</h1>
              <p className="text-slate-600">Comprehensive analysis of task efficiency and team performance</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
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
            <Select value={dateRange} onValueChange={setDateRange}>
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
            <User className="h-4 w-4 text-slate-500" />
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {taskStatuses.map((status: any) => (
                  <SelectItem key={status.id} value={status.id.toString()}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Total Tasks</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {taskPerformanceAnalytics.efficiencyMetrics.totalTasks || 0}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {taskPerformanceAnalytics.efficiencyMetrics.completedTasks || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Efficiency Score</CardTitle>
              <Target className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {taskPerformanceAnalytics.efficiencyMetrics.avgEfficiencyScore || 0}%
            </div>
            <Progress 
              value={taskPerformanceAnalytics.efficiencyMetrics.avgEfficiencyScore || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Completion Time</CardTitle>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {taskPerformanceAnalytics.efficiencyMetrics.avgCompletionTime || 0}
            </div>
            <p className="text-sm text-slate-500 mt-1">days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">On-Time Delivery</CardTitle>
              <CheckCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {taskPerformanceAnalytics.efficiencyMetrics.onTimeDeliveryRate || 0}%
            </div>
            <Progress 
              value={taskPerformanceAnalytics.efficiencyMetrics.onTimeDeliveryRate || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Team Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance Overview</CardTitle>
            <CardDescription>Efficiency scores and task completion by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="efficiency" fill="#3B82F6" name="Efficiency Score" />
                <Bar dataKey="completionRate" fill="#10B981" name="Completion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
            <CardDescription>Team members by performance category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={efficiencyDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {efficiencyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Performance Details</CardTitle>
          <CardDescription>Detailed performance metrics for each team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 font-medium text-slate-600">Team Member</th>
                  <th className="text-left p-3 font-medium text-slate-600">Total Tasks</th>
                  <th className="text-left p-3 font-medium text-slate-600">Completed</th>
                  <th className="text-left p-3 font-medium text-slate-600">Completion Rate</th>
                  <th className="text-left p-3 font-medium text-slate-600">Efficiency Score</th>
                  <th className="text-left p-3 font-medium text-slate-600">Avg Completion Time</th>
                  <th className="text-left p-3 font-medium text-slate-600">Performance</th>
                  <th className="text-left p-3 font-medium text-slate-600">Risk Factors</th>
                </tr>
              </thead>
              <tbody>
                {taskPerformanceAnalytics.memberPerformance.map((member, index) => (
                  <tr key={member.userId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-slate-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{member.totalTasks}</td>
                    <td className="p-3 text-slate-600">{member.completedTasks}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${member.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-600">{member.completionRate}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`${member.avgEfficiencyScore >= 85 ? 'bg-green-100 text-green-800' : 
                        member.avgEfficiencyScore >= 70 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                        {member.avgEfficiencyScore}%
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600">{member.avgCompletionTime} days</td>
                    <td className="p-3">
                      <Badge className={getPerformanceColor(member.performanceRating)}>
                        {member.performanceRating}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {member.overdueTasks > 0 && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            {member.overdueTasks} overdue
                          </Badge>
                        )}
                        {member.regulatoryViolations > 0 && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            {member.regulatoryViolations} violations
                          </Badge>
                        )}
                        {member.overdueTasks === 0 && member.regulatoryViolations === 0 && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            No issues
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}