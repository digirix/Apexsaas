import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  Calendar,
  Filter,
  Download,
  BarChart3,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function TaskPerformanceReport() {
  const [selectedPeriod, setSelectedPeriod] = React.useState("30");
  const [selectedTeamMember, setSelectedTeamMember] = React.useState("all");

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });

  const completedStatusId = taskStatuses?.find((s: any) => s.name === 'Completed')?.id;
  const currentDate = new Date();

  // Task performance analysis
  const taskPerformanceAnalytics = React.useMemo(() => {
    if (!tasks?.length || !users?.length || !taskStatuses?.length) {
      return { efficiencyMetrics: {}, teamPerformance: [] };
    }

    const periodDays = parseInt(selectedPeriod);
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const filteredTasks = tasks.filter((task: any) => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= periodStart;
    });

    const completedTasks = filteredTasks.filter((task: any) => task.statusId === completedStatusId);
    
    // Calculate completion times for completed tasks
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

    // Calculate efficiency score (combination of completion rate and on-time delivery)
    const completionRate = filteredTasks.length > 0 ? 
      Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;
    
    const avgEfficiencyScore = Math.round((completionRate * 0.6) + (onTimeDeliveryRate * 0.4));

    const efficiencyMetrics = {
      totalTasks: filteredTasks.length,
      completedTasks: completedTasks.length,
      avgCompletionTime,
      avgEfficiencyScore,
      onTimeDeliveryRate
    };

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

      const userAvgCompletionTime = userCompletionTimes.length > 0 ? 
        Math.round(userCompletionTimes.reduce((sum, time) => sum + time, 0) / userCompletionTimes.length) : 0;

      const userOnTimeDeliveries = userCompleted.filter((task: any) => {
        if (!task.updatedAt || !task.dueDate) return false;
        const completed = new Date(task.updatedAt);
        const due = new Date(task.dueDate);
        return completed <= due;
      });

      const userOnTimeRate = userCompleted.length > 0 ? 
        Math.round((userOnTimeDeliveries.length / userCompleted.length) * 100) : 0;

      const userCompletionRate = userTasks.length > 0 ? 
        Math.round((userCompleted.length / userTasks.length) * 100) : 0;

      const userEfficiencyScore = Math.round((userCompletionRate * 0.6) + (userOnTimeRate * 0.4));

      // Calculate overdue and regulatory violations
      const overdueTasks = userTasks.filter((task: any) => {
        const dueDate = new Date(task.dueDate);
        return dueDate < currentDate && task.statusId !== completedStatusId;
      });

      const regulatoryViolations = userTasks.filter((task: any) => {
        if (!task.complianceDeadline) return false;
        const complianceDate = new Date(task.complianceDeadline);
        return complianceDate < currentDate && task.statusId !== completedStatusId;
      });

      const performanceRating = userEfficiencyScore >= 85 ? 'Excellent' :
                              userEfficiencyScore >= 70 ? 'Good' :
                              userEfficiencyScore >= 50 ? 'Needs Improvement' : 'Critical';

      return {
        name: user.displayName || user.username,
        totalTasks: userTasks.length,
        completedTasks: userCompleted.length,
        completionRate: userCompletionRate,
        avgCompletionTime: userAvgCompletionTime,
        avgEfficiencyScore: userEfficiencyScore,
        onTimeDeliveryRate: userOnTimeRate,
        overdueTasks: overdueTasks.length,
        regulatoryViolations: regulatoryViolations.length,
        performanceRating
      };
    }).filter(member => member.totalTasks > 0)
    .sort((a, b) => b.avgEfficiencyScore - a.avgEfficiencyScore);

    return { efficiencyMetrics, teamPerformance };
  }, [tasks, users, taskStatuses, selectedPeriod, completedStatusId, currentDate]);

  // Chart data preparation
  const performanceChartData = taskPerformanceAnalytics.teamPerformance.map(member => ({
    name: member.name,
    completionRate: member.completionRate,
    efficiency: member.avgEfficiencyScore,
    onTimeRate: member.onTimeDeliveryRate
  }));

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
    <AppLayout title="Task Performance Analytics">
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
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
              <Users className="h-4 w-4 text-slate-500" />
              <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All team members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All team members</SelectItem>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.displayName || user.username}
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
              <Progress value={taskPerformanceAnalytics.efficiencyMetrics.avgEfficiencyScore || 0} className="mt-2" />
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
              <p className="text-sm text-slate-500 mt-1">days average</p>
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
              <Progress value={taskPerformanceAnalytics.efficiencyMetrics.onTimeDeliveryRate || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Comparison</CardTitle>
              <CardDescription>Efficiency scores and completion rates by team member</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completionRate" fill="#3B82F6" name="Completion Rate %" />
                  <Bar dataKey="efficiency" fill="#10B981" name="Efficiency Score %" />
                  <Bar dataKey="onTimeRate" fill="#8B5CF6" name="On-Time Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Task completion and efficiency trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="efficiency" stroke="#10B981" name="Efficiency Score %" />
                  <Line type="monotone" dataKey="onTimeRate" stroke="#8B5CF6" name="On-Time Rate %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Team Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Team Performance Analysis</CardTitle>
            <CardDescription>Comprehensive breakdown of individual team member performance</CardDescription>
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
                    <th className="text-left p-3 font-medium text-slate-600">Performance Rating</th>
                    <th className="text-left p-3 font-medium text-slate-600">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {taskPerformanceAnalytics.teamPerformance.map((member: any, index: number) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
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
    </AppLayout>
  );
}