import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Users, 
  TrendingUp, 
  Clock,
  Award,
  AlertCircle,
  Filter,
  Download,
  User,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function TeamEfficiencyReport() {
  const [timeFrame, setTimeFrame] = React.useState("30");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });

  const completedStatusId = taskStatuses?.find((s: any) => s.name === 'Completed')?.id;

  // Team efficiency analysis
  const teamEfficiencyAnalysis = React.useMemo(() => {
    if (!tasks?.length || !users?.length || !taskStatuses?.length) return { teamMembers: [], overallMetrics: {} };

    const currentDate = new Date();

    const teamMembers = users.map((user: any) => {
      const userTasks = tasks.filter((task: any) => task.assigneeId === user.id);
      const completedTasks = userTasks.filter((task: any) => task.statusId === completedStatusId);
      const pendingTasks = userTasks.filter((task: any) => task.statusId !== completedStatusId);
      
      // Calculate workload metrics
      const totalWorkload = userTasks.length;
      const activeWorkload = pendingTasks.length;
      const completionRate = totalWorkload > 0 ? Math.round((completedTasks.length / totalWorkload) * 100) : 0;

      // Calculate average completion time
      const completedTasksWithTime = completedTasks.filter((task: any) => task.updatedAt);
      const avgCompletionTime = completedTasksWithTime.length > 0 ? 
        Math.round(completedTasksWithTime.reduce((sum: number, task: any) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.updatedAt);
          return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / completedTasksWithTime.length) : 0;

      // Calculate efficiency score
      let efficiencyScore = 0;
      if (totalWorkload > 0) {
        const onTimeCompletions = completedTasks.filter((task: any) => {
          if (!task.updatedAt) return false;
          const completed = new Date(task.updatedAt);
          const due = new Date(task.dueDate);
          return completed <= due;
        });
        const onTimeRate = completedTasks.length > 0 ? (onTimeCompletions.length / completedTasks.length) : 0;
        efficiencyScore = Math.round(onTimeRate * 100);
      }

      // Calculate overdue tasks
      const overdueTasks = pendingTasks.filter((task: any) => {
        const dueDate = new Date(task.dueDate);
        return dueDate < currentDate;
      });

      // Performance rating
      let performanceRating = 'Average';
      if (efficiencyScore >= 90 && avgCompletionTime <= 3) performanceRating = 'Excellent';
      else if (efficiencyScore >= 80 && avgCompletionTime <= 5) performanceRating = 'Good';
      else if (efficiencyScore < 60 || avgCompletionTime > 10) performanceRating = 'Needs Improvement';

      // Productivity score (0-100)
      let productivityScore = 50; // Base score
      if (completionRate >= 80) productivityScore += 20;
      else if (completionRate >= 60) productivityScore += 10;
      
      if (efficiencyScore >= 90) productivityScore += 20;
      else if (efficiencyScore >= 70) productivityScore += 10;
      
      if (avgCompletionTime <= 3) productivityScore += 10;
      else if (avgCompletionTime <= 5) productivityScore += 5;
      else if (avgCompletionTime > 10) productivityScore -= 10;

      productivityScore = Math.min(100, Math.max(0, productivityScore));

      return {
        userId: user.id,
        name: user.displayName,
        totalTasks: totalWorkload,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate,
        avgCompletionTime,
        efficiencyScore,
        productivityScore,
        performanceRating,
        workloadBalance: totalWorkload === 0 ? 'Light' : totalWorkload <= 5 ? 'Light' : totalWorkload <= 10 ? 'Moderate' : 'Heavy'
      };
    }).filter(member => member.totalTasks > 0);

    // Overall team metrics
    const totalTeamTasks = teamMembers.reduce((sum, member) => sum + member.totalTasks, 0);
    const totalCompleted = teamMembers.reduce((sum, member) => sum + member.completedTasks, 0);
    const avgTeamEfficiency = teamMembers.length > 0 ? 
      Math.round(teamMembers.reduce((sum, member) => sum + member.efficiencyScore, 0) / teamMembers.length) : 0;
    const avgTeamProductivity = teamMembers.length > 0 ? 
      Math.round(teamMembers.reduce((sum, member) => sum + member.productivityScore, 0) / teamMembers.length) : 0;

    const overallMetrics = {
      totalTeamTasks,
      totalCompleted,
      teamCompletionRate: totalTeamTasks > 0 ? Math.round((totalCompleted / totalTeamTasks) * 100) : 0,
      avgTeamEfficiency,
      avgTeamProductivity,
      activeMembers: teamMembers.length,
      topPerformer: teamMembers.length > 0 ? teamMembers.reduce((top, member) => 
        member.productivityScore > top.productivityScore ? member : top
      ) : null
    };

    return {
      teamMembers: teamMembers.sort((a, b) => b.productivityScore - a.productivityScore),
      overallMetrics
    };
  }, [tasks, users, taskStatuses, completedStatusId]);

  // Chart data preparation
  const efficiencyChartData = teamEfficiencyAnalysis.teamMembers.map(member => ({
    name: member.name,
    productivity: member.productivityScore,
    efficiency: member.efficiencyScore,
    completion: member.completionRate,
    workload: member.totalTasks
  }));

  const workloadDistribution = teamEfficiencyAnalysis.teamMembers.reduce((acc: any, member) => {
    const category = member.workloadBalance;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const workloadData = Object.entries(workloadDistribution).map(([category, count]) => ({
    category,
    count,
    color: category === 'Light' ? '#22C55E' : category === 'Moderate' ? '#3B82F6' : '#EF4444'
  }));

  const performanceData = teamEfficiencyAnalysis.teamMembers.map(member => ({
    name: member.name,
    productivity: member.productivityScore,
    efficiency: member.efficiencyScore,
    completion: member.completionRate,
    avgTime: Math.max(0, 20 - member.avgCompletionTime) * 5 // Inverse scale for radar chart
  }));

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'Good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Average': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Needs Improvement': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getWorkloadColor = (balance: string) => {
    switch (balance) {
      case 'Light': return 'bg-green-100 text-green-800 border-green-200';
      case 'Moderate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Heavy': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <AppLayout title="Team Efficiency Report">
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Team Efficiency Report</h1>
              <p className="text-slate-600">Detailed insights into team productivity and performance</p>
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
            <Clock className="h-4 w-4 text-slate-500" />
            <Select value={timeFrame} onValueChange={setTimeFrame}>
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
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                <SelectItem value="accounting">Accounting</SelectItem>
                <SelectItem value="tax">Tax</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
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
              <CardTitle className="text-sm font-medium text-slate-600">Active Team Members</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {teamEfficiencyAnalysis.overallMetrics.activeMembers || 0}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Currently working on tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Team Productivity</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {teamEfficiencyAnalysis.overallMetrics.avgTeamProductivity || 0}%
            </div>
            <Progress value={teamEfficiencyAnalysis.overallMetrics.avgTeamProductivity || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Team Efficiency</CardTitle>
              <Target className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {teamEfficiencyAnalysis.overallMetrics.avgTeamEfficiency || 0}%
            </div>
            <Progress value={teamEfficiencyAnalysis.overallMetrics.avgTeamEfficiency || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Completion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {teamEfficiencyAnalysis.overallMetrics.teamCompletionRate || 0}%
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {teamEfficiencyAnalysis.overallMetrics.totalCompleted || 0} of {teamEfficiencyAnalysis.overallMetrics.totalTeamTasks || 0} tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer Highlight */}
      {teamEfficiencyAnalysis.overallMetrics.topPerformer && (
        <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-green-900">Top Performer</CardTitle>
                <CardDescription className="text-green-700">Outstanding team member this period</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  {teamEfficiencyAnalysis.overallMetrics.topPerformer.name}
                </h3>
                <p className="text-green-700">
                  Productivity Score: {teamEfficiencyAnalysis.overallMetrics.topPerformer.productivityScore}% | 
                  Efficiency: {teamEfficiencyAnalysis.overallMetrics.topPerformer.efficiencyScore}% | 
                  Completed: {teamEfficiencyAnalysis.overallMetrics.topPerformer.completedTasks} tasks
                </p>
              </div>
              <Badge className="bg-green-600 text-white">
                {teamEfficiencyAnalysis.overallMetrics.topPerformer.performanceRating}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Team Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance Comparison</CardTitle>
            <CardDescription>Productivity and efficiency metrics by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={efficiencyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="productivity" fill="#22C55E" name="Productivity Score" />
                <Bar dataKey="efficiency" fill="#3B82F6" name="Efficiency Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Multi-dimensional performance analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={performanceData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Productivity" dataKey="productivity" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} />
                <Radar name="Efficiency" dataKey="efficiency" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Individual Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Performance Analysis</CardTitle>
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
                  <th className="text-left p-3 font-medium text-slate-600">Pending</th>
                  <th className="text-left p-3 font-medium text-slate-600">Overdue</th>
                  <th className="text-left p-3 font-medium text-slate-600">Completion Rate</th>
                  <th className="text-left p-3 font-medium text-slate-600">Avg Completion Time</th>
                  <th className="text-left p-3 font-medium text-slate-600">Productivity Score</th>
                  <th className="text-left p-3 font-medium text-slate-600">Workload</th>
                  <th className="text-left p-3 font-medium text-slate-600">Performance</th>
                </tr>
              </thead>
              <tbody>
                {teamEfficiencyAnalysis.teamMembers.map((member, index) => (
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
                    <td className="p-3 text-slate-600">{member.pendingTasks}</td>
                    <td className="p-3">
                      {member.overdueTasks > 0 ? (
                        <Badge className="bg-red-100 text-red-800">
                          {member.overdueTasks}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
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
                    <td className="p-3 text-slate-600">{member.avgCompletionTime} days</td>
                    <td className="p-3">
                      <Badge className={`${member.productivityScore >= 80 ? 'bg-green-100 text-green-800' : 
                        member.productivityScore >= 60 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {member.productivityScore}%
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={getWorkloadColor(member.workloadBalance)}>
                        {member.workloadBalance}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={getPerformanceColor(member.performanceRating)}>
                        {member.performanceRating}
                      </Badge>
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