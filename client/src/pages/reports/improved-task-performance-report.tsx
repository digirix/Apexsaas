import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ReportsLayout } from "@/components/layout/reports-layout";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  CheckCircle,
  AlertTriangle,
  Filter,
  Download,
  Calendar,
  Search
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function TaskPerformanceReport() {
  // Filter states
  const [selectedTeamMember, setSelectedTeamMember] = React.useState("all");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [selectedPriority, setSelectedPriority] = React.useState("all");
  const [dateRange, setDateRange] = React.useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date()
  });
  const [searchTerm, setSearchTerm] = React.useState("");

  // Fetch data
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });

  const currentDate = new Date();
  const completedStatusId = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.name === 'Completed')?.id : null;

  // Filter tasks based on selected criteria
  const filteredTasks = React.useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    
    return tasks.filter((task: any) => {
      // Team member filter
      if (selectedTeamMember !== "all" && task.assignedTo !== parseInt(selectedTeamMember)) {
        return false;
      }
      
      // Status filter
      if (selectedStatus !== "all" && task.statusId !== parseInt(selectedStatus)) {
        return false;
      }
      
      // Priority filter
      if (selectedPriority !== "all" && task.priority !== selectedPriority) {
        return false;
      }
      
      // Date range filter
      const taskDate = new Date(task.createdAt);
      if (dateRange.from && taskDate < dateRange.from) return false;
      if (dateRange.to && taskDate > dateRange.to) return false;
      
      // Search filter
      if (searchTerm && !task.taskDetails?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [tasks, selectedTeamMember, selectedStatus, selectedPriority, dateRange, searchTerm]);

  // Performance calculations based on filtered data
  const performanceMetrics = React.useMemo(() => {
    if (!Array.isArray(filteredTasks) || !Array.isArray(users)) return {
      totalTasks: 0,
      completedTasks: 0,
      avgCompletionTime: 0,
      onTimeDeliveryRate: 0,
      teamMembers: []
    };

    const completedTasks = filteredTasks.filter((task: any) => task.statusId === completedStatusId);
    const totalTasks = filteredTasks.length;

    // Calculate average completion time
    const tasksWithCompletionTime = completedTasks.filter((task: any) => task.updatedAt);
    const avgCompletionTime = tasksWithCompletionTime.length > 0 ? 
      Math.round(tasksWithCompletionTime.reduce((sum: number, task: any) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.updatedAt);
        return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / tasksWithCompletionTime.length) : 0;

    // Calculate on-time delivery rate
    const onTimeTasksCount = filteredTasks.filter((task: any) => {
      if (!task.dueDate || task.statusId !== completedStatusId) return false;
      const dueDate = new Date(task.dueDate);
      const completedDate = task.updatedAt ? new Date(task.updatedAt) : currentDate;
      return completedDate <= dueDate;
    }).length;

    const onTimeDeliveryRate = totalTasks > 0 ? Math.round((onTimeTasksCount / totalTasks) * 100) : 0;

    // Team member performance
    const teamMembers = Array.isArray(users) ? users.map((member: any) => {
      const memberTasks = filteredTasks.filter((task: any) => task.assignedTo === member.id);
      const memberCompleted = memberTasks.filter((task: any) => task.statusId === completedStatusId);
      const memberOverdue = memberTasks.filter((task: any) => {
        if (task.statusId === completedStatusId) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < currentDate;
      });

      const completionRate = memberTasks.length > 0 ? 
        Math.round((memberCompleted.length / memberTasks.length) * 100) : 0;

      const efficiency = memberTasks.length > 0 ? 
        Math.max(0, 100 - (memberOverdue.length / memberTasks.length) * 100) : 0;

      return {
        id: member.id,
        name: member.displayName,
        totalTasks: memberTasks.length,
        completedTasks: memberCompleted.length,
        overdueCount: memberOverdue.length,
        completionRate: Math.round(completionRate),
        efficiency: Math.round(efficiency)
      };
    }).filter((member: any) => member.totalTasks > 0) : [];

    return {
      totalTasks,
      completedTasks: completedTasks.length,
      avgCompletionTime,
      onTimeDeliveryRate,
      teamMembers
    };
  }, [filteredTasks, users, completedStatusId, currentDate]);

  // Chart data
  const completionTrendData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayTasks = filteredTasks.filter((task: any) => 
        task.updatedAt && task.updatedAt.startsWith(date) && task.statusId === completedStatusId
      );
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        completed: dayTasks.length
      };
    });
  }, [filteredTasks, completedStatusId]);

  const statusDistribution = React.useMemo(() => {
    if (!Array.isArray(taskStatuses)) return [];
    
    return taskStatuses.map((status: any) => ({
      name: status.name,
      value: filteredTasks.filter((task: any) => task.statusId === status.id).length,
      color: status.name === 'Completed' ? '#22C55E' : 
             status.name === 'In Progress' ? '#3B82F6' : 
             status.name === 'Pending' ? '#EAB308' : '#64748B'
    })).filter((item: any) => item.value > 0);
  }, [filteredTasks, taskStatuses]);

  return (
    <ReportsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Task Performance Analytics</h1>
            <p className="text-slate-600">Comprehensive task performance insights and team productivity metrics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Member</label>
                <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="All members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All members</SelectItem>
                    {Array.isArray(users) && users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Array.isArray(taskStatuses) && taskStatuses.map((status: any) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search Tasks</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search task details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reset Filters</label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedTeamMember("all");
                    setSelectedStatus("all");
                    setSelectedPriority("all");
                    setSearchTerm("");
                  }}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Total Tasks</CardTitle>
                <Target className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{performanceMetrics.totalTasks}</div>
              <p className="text-sm text-slate-500">
                {performanceMetrics.completedTasks} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {performanceMetrics.totalTasks > 0 ? 
                  Math.round((performanceMetrics.completedTasks / performanceMetrics.totalTasks) * 100) : 0}%
              </div>
              <Progress 
                value={performanceMetrics.totalTasks > 0 ? 
                  (performanceMetrics.completedTasks / performanceMetrics.totalTasks) * 100 : 0} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Avg Completion Time</CardTitle>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{performanceMetrics.avgCompletionTime}</div>
              <p className="text-sm text-slate-500">days average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">On-Time Delivery</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{performanceMetrics.onTimeDeliveryRate}%</div>
              <Progress value={performanceMetrics.onTimeDeliveryRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Charts - Compact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completion Trend (Last 7 Days)</CardTitle>
              <CardDescription>Daily task completion pattern</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={completionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="completed" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Status Distribution</CardTitle>
              <CardDescription>Current task status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry: any, index: number) => (
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance Overview
            </CardTitle>
            <CardDescription>Individual team member performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 font-medium text-slate-600">Team Member</th>
                    <th className="text-left p-3 font-medium text-slate-600">Total Tasks</th>
                    <th className="text-left p-3 font-medium text-slate-600">Completed</th>
                    <th className="text-left p-3 font-medium text-slate-600">Overdue</th>
                    <th className="text-left p-3 font-medium text-slate-600">Completion Rate</th>
                    <th className="text-left p-3 font-medium text-slate-600">Efficiency Score</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceMetrics.teamMembers.map((member: any) => (
                    <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{member.name}</div>
                      </td>
                      <td className="p-3 text-slate-600">{member.totalTasks}</td>
                      <td className="p-3 text-slate-600">{member.completedTasks}</td>
                      <td className="p-3">
                        {member.overdueCount > 0 ? (
                          <Badge className="bg-red-100 text-red-800">
                            {member.overdueCount}
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
                      <td className="p-3">
                        <Badge className={
                          member.efficiency >= 90 ? "bg-green-100 text-green-800" :
                          member.efficiency >= 70 ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }>
                          {member.efficiency}%
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
    </ReportsLayout>
  );
}