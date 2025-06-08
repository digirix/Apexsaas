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
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  Award,
  Activity,
  Download,
  Star,
  Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { usePDFExport } from "@/utils/pdf-export";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export default function TeamEfficiencyReport() {
  const [filters, setFilters] = useState({
    period: "30",
    country: "all",
    department: "all",
    teamMember: "all",
    taskCategory: "all",
    status: "all"
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: departments = [] } = useQuery({ queryKey: ["/api/v1/setup/departments"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });
  const { data: taskCategories = [] } = useQuery({ queryKey: ["/api/v1/setup/task-categories"] });

  // Apply filtering
  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];

    return tasks.filter((task: any) => {
      // Period filtering
      if (filters.period !== "all") {
        const periodDays = parseInt(filters.period);
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - periodDays);
        const taskDate = new Date(task.createdAt);
        if (taskDate < periodStart) return false;
      }

      // Team member filtering
      if (filters.teamMember !== "all" && task.assigneeId !== parseInt(filters.teamMember)) {
        return false;
      }

      // Department filtering
      if (filters.department !== "all") {
        const assignee = (users as any[]).find((u: any) => u.id === task.assigneeId);
        if (!assignee || assignee.departmentId !== parseInt(filters.department)) {
          return false;
        }
      }

      // Task category filtering
      if (filters.taskCategory !== "all" && task.categoryId !== parseInt(filters.taskCategory)) {
        return false;
      }

      // Status filtering
      if (filters.status !== "all" && task.statusId !== parseInt(filters.status)) {
        return false;
      }

      return true;
    });
  }, [tasks, users, filters]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!filteredTasks.length || !Array.isArray(users) || !Array.isArray(taskStatuses)) {
      return {
        teamOverview: {
          totalTasks: 0,
          completedTasks: 0,
          avgCompletionTime: 0,
          teamEfficiency: 0,
          performanceRating: 0,
          topPerformer: null
        },
        departmentPerformance: [],
        memberPerformance: [],
        timelineAnalysis: [],
        productivityTrends: []
      };
    }

    const completedStatus = (taskStatuses as any[]).find((s: any) => s.name === "Completed");
    const completedTasks = filteredTasks.filter((task: any) => 
      completedStatus && task.statusId === completedStatus.id
    );

    // Calculate average completion time for completed tasks
    const completionTimes = completedTasks
      .filter((task: any) => task.updatedAt && task.createdAt)
      .map((task: any) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.updatedAt);
        return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
      });

    const avgCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum: number, time: number) => sum + time, 0) / completionTimes.length 
      : 0;

    // Team efficiency calculation
    const teamEfficiency = filteredTasks.length > 0 
      ? (completedTasks.length / filteredTasks.length) * 100 
      : 0;

    // Department performance analysis
    const departmentStats = (departments as any[]).map((dept: any) => {
      const deptUsers = (users as any[]).filter((u: any) => u.departmentId === dept.id);
      const deptTasks = filteredTasks.filter((task: any) => 
        deptUsers.some((u: any) => u.id === task.assigneeId)
      );
      const deptCompleted = deptTasks.filter((task: any) => 
        completedStatus && task.statusId === completedStatus.id
      );

      return {
        name: dept.name,
        totalTasks: deptTasks.length,
        completedTasks: deptCompleted.length,
        efficiency: deptTasks.length > 0 ? (deptCompleted.length / deptTasks.length) * 100 : 0,
        avgTime: 0 // Simplified for now
      };
    });

    // Member performance analysis
    const memberStats = (users as any[]).map((member: any) => {
      const memberTasks = filteredTasks.filter((task: any) => task.assigneeId === member.id);
      const memberCompleted = memberTasks.filter((task: any) => 
        completedStatus && task.statusId === completedStatus.id
      );

      const memberCompletionTimes = memberCompleted
        .filter((task: any) => task.updatedAt && task.createdAt)
        .map((task: any) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.updatedAt);
          return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });

      return {
        name: member.displayName || member.username,
        id: member.id,
        totalTasks: memberTasks.length,
        completedTasks: memberCompleted.length,
        efficiency: memberTasks.length > 0 ? (memberCompleted.length / memberTasks.length) * 100 : 0,
        avgCompletionTime: memberCompletionTimes.length > 0 
          ? memberCompletionTimes.reduce((sum: number, time: number) => sum + time, 0) / memberCompletionTimes.length 
          : 0,
        productivity: memberTasks.length > 0 ? memberCompleted.length / (memberTasks.length || 1) : 0
      };
    }).filter((member: any) => member.totalTasks > 0);

    // Timeline analysis for charts
    const timelineData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayTasks = filteredTasks.filter((task: any) => {
        const taskDate = new Date(task.createdAt);
        return taskDate.toDateString() === date.toDateString();
      });
      const dayCompleted = dayTasks.filter((task: any) => 
        completedStatus && task.statusId === completedStatus.id
      );

      timelineData.push({
        date: date.toLocaleDateString(),
        tasks: dayTasks.length,
        completed: dayCompleted.length,
        efficiency: dayTasks.length > 0 ? (dayCompleted.length / dayTasks.length) * 100 : 0
      });
    }

    // Find top performer
    const topPerformer = memberStats.length > 0 
      ? memberStats.reduce((a: any, b: any) => a.efficiency > b.efficiency ? a : b)
      : null;

    return {
      teamOverview: {
        totalTasks: filteredTasks.length,
        completedTasks: completedTasks.length,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
        teamEfficiency: Math.round(teamEfficiency * 10) / 10,
        performanceRating: Math.min(5, Math.round((teamEfficiency / 20) * 10) / 10),
        topPerformer
      },
      departmentPerformance: departmentStats,
      memberPerformance: memberStats.sort((a: any, b: any) => b.efficiency - a.efficiency),
      timelineAnalysis: timelineData,
      productivityTrends: memberStats.slice(0, 5)
    };
  }, [filteredTasks, users, taskStatuses, departments]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF({
        title: 'Team Efficiency Analysis Report',
        subtitle: `Generated for ${filters.period === 'all' ? 'All Time' : `Last ${filters.period} Days`}`,
        reportType: 'TeamEfficiency',
        filters: {
          period: filters.period,
          country: filters.country !== 'all' ? (countries as any[]).find(c => c.id === parseInt(filters.country))?.name : 'All',
          department: filters.department !== 'all' ? (departments as any[]).find(d => d.id === parseInt(filters.department))?.name : 'All',
          teamMember: filters.teamMember !== 'all' ? (users as any[]).find(u => u.id === parseInt(filters.teamMember))?.displayName : 'All',
          taskCategory: filters.taskCategory !== 'all' ? (taskCategories as any[]).find(c => c.id === parseInt(filters.taskCategory))?.name : 'All',
          status: filters.status !== 'all' ? (taskStatuses as any[]).find(s => s.id === parseInt(filters.status))?.name : 'All'
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <AppLayout title="Team Efficiency Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team Efficiency Analysis</h1>
            <p className="text-muted-foreground">Monitor team performance and productivity metrics</p>
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
                <SelectTrigger className="h-6 w-20">
                  <SelectValue>
                    {filters.period === "7" ? "7d" : 
                     filters.period === "30" ? "30d" : 
                     filters.period === "90" ? "90d" : 
                     filters.period === "365" ? "1y" : 
                     filters.period === "all" ? "All" : "Period"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7d</SelectItem>
                  <SelectItem value="30">30d</SelectItem>
                  <SelectItem value="90">90d</SelectItem>
                  <SelectItem value="365">1y</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>

              {/* Country Filter */}
              <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}>
                <SelectTrigger className="h-6 w-20">
                  <SelectValue>
                    {filters.country === "all" ? "Country" : 
                     (countries as any[]).find(c => c.id.toString() === filters.country)?.name || "Country"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Array.isArray(countries) && countries.map((country: any) => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department Filter */}
              <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                <SelectTrigger className="h-6 w-20">
                  <SelectValue>
                    {filters.department === "all" ? "Dept" : 
                     (departments as any[]).find(d => d.id.toString() === filters.department)?.name || "Dept"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Array.isArray(departments) && departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Team Member Filter */}
              <Select value={filters.teamMember} onValueChange={(value) => setFilters(prev => ({ ...prev, teamMember: value }))}>
                <SelectTrigger className="h-6 w-20">
                  <SelectValue>
                    {filters.teamMember === "all" ? "Member" : 
                     (users as any[]).find(u => u.id.toString() === filters.teamMember)?.displayName || 
                     (users as any[]).find(u => u.id.toString() === filters.teamMember)?.username || "Member"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Array.isArray(users) && users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.displayName || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Task Category Filter */}
              <Select value={filters.taskCategory} onValueChange={(value) => setFilters(prev => ({ ...prev, taskCategory: value }))}>
                <SelectTrigger className="h-6 w-20">
                  <SelectValue>
                    {filters.taskCategory === "all" ? "Category" : 
                     (taskCategories as any[]).find(c => c.id.toString() === filters.taskCategory)?.name || "Category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Array.isArray(taskCategories) && taskCategories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="h-6 w-20">
                  <SelectValue>
                    {filters.status === "all" ? "Status" : 
                     (taskStatuses as any[]).find(s => s.id.toString() === filters.status)?.name || "Status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Array.isArray(taskStatuses) && taskStatuses.map((status: any) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Cards - Reduced Height */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <Card className="h-16">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                  <p className="text-lg font-bold">{analytics.teamOverview.totalTasks}</p>
                </div>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-16">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-lg font-bold text-green-600">{analytics.teamOverview.completedTasks}</p>
                </div>
                <Target className="h-4 w-4 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-16">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Efficiency</p>
                  <p className="text-lg font-bold text-blue-600">{analytics.teamOverview.teamEfficiency}%</p>
                </div>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-16">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Time</p>
                  <p className="text-lg font-bold">{analytics.teamOverview.avgCompletionTime}d</p>
                </div>
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-16">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-3 w-3 ${i < analytics.teamOverview.performanceRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                </div>
                <Award className="h-4 w-4 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-16">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Top Performer</p>
                  <p className="text-sm font-bold truncate">
                    {analytics.teamOverview.topPerformer?.name || 'N/A'}
                  </p>
                </div>
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Member Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Individual Performance
            </CardTitle>
            <CardDescription>Detailed performance metrics for each team member</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Total Tasks</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead>Avg Time (days)</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.memberPerformance.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.totalTasks}</TableCell>
                    <TableCell>{member.completedTasks}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={member.efficiency} className="w-20" />
                        <span className="text-sm">{member.efficiency.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.avgCompletionTime.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant={member.efficiency >= 80 ? "default" : member.efficiency >= 60 ? "secondary" : "destructive"}>
                        {member.efficiency >= 80 ? "Excellent" : member.efficiency >= 60 ? "Good" : "Needs Improvement"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Department Performance
              </CardTitle>
              <CardDescription>Efficiency comparison across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.departmentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="efficiency" fill="#8884d8" name="Efficiency %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Timeline Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Daily Efficiency Trend
              </CardTitle>
              <CardDescription>7-day efficiency performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.timelineAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="efficiency" stroke="#8884d8" name="Efficiency %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}