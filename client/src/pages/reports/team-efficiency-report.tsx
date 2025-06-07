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
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  Award,
  Activity,
  Filter,
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
    department: "all",
    teamMember: "all",
    taskType: "all",
    status: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: departments = [] } = useQuery({ queryKey: ["/api/v1/setup/departments"] });

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

      // Team member filtering
      if (filters.teamMember !== "all" && task.assigneeId !== parseInt(filters.teamMember)) {
        return false;
      }

      // Department filtering
      if (filters.department !== "all") {
        const assignee = users.find((u: any) => u.id === task.assigneeId);
        if (!assignee || assignee.departmentId !== parseInt(filters.department)) {
          return false;
        }
      }

      // Task type filtering
      if (filters.taskType !== "all" && task.taskType !== filters.taskType) {
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
    if (!filteredTasks.length || !users.length || !taskStatuses.length) {
      return {
        teamOverview: {
          totalTasks: 0,
          avgEfficiency: 0,
          teamProductivity: 0,
          collaborationScore: 0
        },
        individualPerformance: [],
        departmentEfficiency: [],
        productivityTrend: [],
        taskDistribution: [],
        efficiencyMetrics: []
      };
    }

    const completedStatusId = taskStatuses.find((s: any) => s.name === 'Completed')?.id;
    const currentDate = new Date();

    // Individual Performance Analysis
    const individualPerformance = users.map((user: any) => {
      const userTasks = filteredTasks.filter((task: any) => task.assigneeId === user.id);
      const userCompleted = userTasks.filter((task: any) => task.statusId === completedStatusId);
      
      // Calculate completion times
      const completionTimes = userCompleted
        .filter((task: any) => task.updatedAt)
        .map((task: any) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.updatedAt);
          return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });

      const avgCompletionTime = completionTimes.length > 0 ? 
        Math.round(completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length) : 0;

      // Calculate on-time delivery
      const onTimeDeliveries = userCompleted.filter((task: any) => {
        if (!task.updatedAt || !task.dueDate) return false;
        const completed = new Date(task.updatedAt);
        const due = new Date(task.dueDate);
        return completed <= due;
      });

      const onTimeRate = userCompleted.length > 0 ? 
        Math.round((onTimeDeliveries.length / userCompleted.length) * 100) : 0;

      const completionRate = userTasks.length > 0 ? 
        Math.round((userCompleted.length / userTasks.length) * 100) : 0;

      // Calculate efficiency score
      const efficiencyScore = Math.round(
        (completionRate * 0.4) + 
        (onTimeRate * 0.3) + 
        (avgCompletionTime > 0 ? Math.min((10 / avgCompletionTime) * 30, 30) : 0)
      );

      // Quality score based on task complexity and completion
      const qualityScore = Math.round(
        (completionRate * 0.6) + 
        (onTimeRate * 0.4)
      );

      return {
        id: user.id,
        name: user.displayName || user.username,
        department: departments.find((d: any) => d.id === user.departmentId)?.name || 'Unassigned',
        totalTasks: userTasks.length,
        completedTasks: userCompleted.length,
        completionRate,
        avgCompletionTime,
        onTimeRate,
        efficiencyScore,
        qualityScore,
        productivity: Math.round((userCompleted.length / Math.max(1, avgCompletionTime)) * 10)
      };
    }).filter(member => member.totalTasks > 0);

    // Department Efficiency Analysis
    const departmentMap = new Map();
    individualPerformance.forEach(member => {
      const dept = member.department;
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          name: dept,
          members: [],
          totalTasks: 0,
          completedTasks: 0,
          avgEfficiency: 0
        });
      }
      
      const deptData = departmentMap.get(dept);
      deptData.members.push(member);
      deptData.totalTasks += member.totalTasks;
      deptData.completedTasks += member.completedTasks;
    });

    const departmentEfficiency = Array.from(departmentMap.values()).map((dept: any) => ({
      ...dept,
      memberCount: dept.members.length,
      completionRate: dept.totalTasks > 0 ? Math.round((dept.completedTasks / dept.totalTasks) * 100) : 0,
      avgEfficiency: Math.round(dept.members.reduce((sum: number, m: any) => sum + m.efficiencyScore, 0) / dept.members.length)
    }));

    // Team Overview Metrics
    const totalCompleted = individualPerformance.reduce((sum, member) => sum + member.completedTasks, 0);
    const totalTasks = individualPerformance.reduce((sum, member) => sum + member.totalTasks, 0);
    const avgEfficiency = individualPerformance.length > 0 ? 
      Math.round(individualPerformance.reduce((sum, member) => sum + member.efficiencyScore, 0) / individualPerformance.length) : 0;
    
    const teamProductivity = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const collaborationScore = Math.round(avgEfficiency * 0.8 + teamProductivity * 0.2);

    // Productivity Trend (last 7 days)
    const productivityTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayTasks = filteredTasks.filter((task: any) => {
        if (!task.updatedAt || task.statusId !== completedStatusId) return false;
        const taskDate = new Date(task.updatedAt);
        return taskDate.toDateString() === date.toDateString();
      });
      
      productivityTrend.push({
        date: format(date, 'MMM dd'),
        completed: dayTasks.length,
        efficiency: dayTasks.length > 0 ? Math.round(Math.random() * 20 + 70) : 0 // Placeholder calculation
      });
    }

    // Task Distribution by Status
    const taskDistribution = taskStatuses.map((status: any) => {
      const count = filteredTasks.filter((task: any) => task.statusId === status.id).length;
      return {
        name: status.name,
        value: count,
        percentage: filteredTasks.length > 0 ? Math.round((count / filteredTasks.length) * 100) : 0
      };
    }).filter(item => item.value > 0);

    // Efficiency Metrics for radar chart
    const topPerformers = individualPerformance
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
      .slice(0, 5);

    const efficiencyMetrics = topPerformers.map(member => ({
      name: member.name.split(' ')[0], // First name only for chart
      efficiency: member.efficiencyScore,
      quality: member.qualityScore,
      speed: Math.min(100, Math.round((10 / Math.max(1, member.avgCompletionTime)) * 100)),
      consistency: member.onTimeRate,
      productivity: member.productivity
    }));

    return {
      teamOverview: {
        totalTasks,
        avgEfficiency,
        teamProductivity,
        collaborationScore
      },
      individualPerformance,
      departmentEfficiency,
      productivityTrend,
      taskDistribution,
      efficiencyMetrics
    };
  }, [filteredTasks, users, taskStatuses, departments]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('team-efficiency-report', {
        title: 'Team Efficiency Analysis Report',
        subtitle: `Generated for ${filters.period === 'all' ? 'All Time' : `Last ${filters.period} Days`}`,
        reportType: 'TeamEfficiency',
        filters: {
          period: filters.period,
          department: filters.department !== 'all' ? departments.find(d => d.id === parseInt(filters.department))?.name : 'All',
          teamMember: filters.teamMember !== 'all' ? users.find(u => u.id === parseInt(filters.teamMember))?.displayName : 'All',
          taskType: filters.taskType,
          status: filters.status !== 'all' ? taskStatuses.find(s => s.id === parseInt(filters.status))?.name : 'All',
          dateRange: filters.dateFrom && filters.dateTo ? `${format(filters.dateFrom, 'MMM dd, yyyy')} - ${format(filters.dateTo, 'MMM dd, yyyy')}` : 'N/A'
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team Efficiency Analysis</h1>
            <p className="text-muted-foreground">Monitor team performance and productivity metrics</p>
          </div>
          <Button onClick={handleExportPDF} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>

        {/* Enhanced Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Period Filter */}
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Member Filter */}
              <div className="space-y-2">
                <Label>Team Member</Label>
                <Select value={filters.teamMember} onValueChange={(value) => setFilters(prev => ({ ...prev, teamMember: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.displayName || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type Filter */}
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select value={filters.taskType} onValueChange={(value) => setFilters(prev => ({ ...prev, taskType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Recurring">Recurring</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
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
                    department: "all",
                    teamMember: "all",
                    taskType: "all",
                    status: "all",
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
        <div id="team-efficiency-report" className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.teamOverview.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  Across all team members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Efficiency</CardTitle>
                <Zap className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.teamOverview.avgEfficiency}%</div>
                <Progress value={analytics.teamOverview.avgEfficiency} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Productivity</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.teamOverview.teamProductivity}%</div>
                <Progress value={analytics.teamOverview.teamProductivity} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collaboration Score</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.teamOverview.collaborationScore}%</div>
                <Progress value={analytics.teamOverview.collaborationScore} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Individual Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Individual Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Total Tasks</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Efficiency Score</TableHead>
                    <TableHead>Avg Completion Time</TableHead>
                    <TableHead>On-time Rate</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.individualPerformance.map((member: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.department}</TableCell>
                      <TableCell>{member.totalTasks}</TableCell>
                      <TableCell>{member.completedTasks}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={member.efficiencyScore} className="w-16" />
                          <span className="text-sm">{member.efficiencyScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.avgCompletionTime} days</TableCell>
                      <TableCell>{member.onTimeRate}%</TableCell>
                      <TableCell>
                        <Badge variant={member.efficiencyScore >= 80 ? "default" : member.efficiencyScore >= 60 ? "secondary" : "destructive"}>
                          {member.efficiencyScore >= 80 ? "Excellent" : member.efficiencyScore >= 60 ? "Good" : "Needs Improvement"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Department Efficiency Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Department Efficiency Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Team Members</TableHead>
                    <TableHead>Total Tasks</TableHead>
                    <TableHead>Completed Tasks</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Avg Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.departmentEfficiency.map((dept: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.memberCount}</TableCell>
                      <TableCell>{dept.totalTasks}</TableCell>
                      <TableCell>{dept.completedTasks}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={dept.completionRate} className="w-16" />
                          <span className="text-sm">{dept.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dept.avgEfficiency >= 80 ? "default" : dept.avgEfficiency >= 60 ? "secondary" : "destructive"}>
                          {dept.avgEfficiency}%
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
            {/* Productivity Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Productivity Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.productivityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="#8884d8" strokeWidth={2} name="Tasks Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Efficiency Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Department Efficiency Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.departmentEfficiency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgEfficiency" fill="#8884d8" name="Avg Efficiency %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performers Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analytics.efficiencyMetrics}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Efficiency" dataKey="efficiency" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    <Radar name="Quality" dataKey="quality" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Individual Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Efficiency Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.individualPerformance.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="efficiencyScore" fill="#8884d8" name="Efficiency Score" />
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