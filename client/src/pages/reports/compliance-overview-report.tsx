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
  AlertTriangle, 
  Shield, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  MapPin,
  Building,
  FileText,
  TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { usePDFExport } from "@/utils/pdf-export";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export default function ComplianceOverviewReport() {
  const [filters, setFilters] = useState({
    jurisdiction: "all",
    riskLevel: "all",
    timeFrame: "30",
    entityType: "all",
    complianceType: "all",
    status: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });

  // Filter compliance tasks and apply filters
  const filteredComplianceTasks = useMemo(() => {
    if (!tasks?.length) return [];

    // First identify compliance tasks
    const complianceTasks = tasks.filter((task: any) => 
      task.complianceDeadline || 
      task.taskDetails?.toLowerCase().includes('tax') || 
      task.taskDetails?.toLowerCase().includes('compliance') ||
      task.taskDetails?.toLowerCase().includes('filing') ||
      task.taskDetails?.toLowerCase().includes('return') ||
      task.taskDetails?.toLowerCase().includes('audit') ||
      task.complianceFrequency ||
      task.taskType === 'Compliance'
    );

    return complianceTasks.filter((task: any) => {
      // Time filtering
      const taskDate = task.complianceDeadline ? new Date(task.complianceDeadline) : new Date(task.createdAt);
      if (filters.dateFrom && filters.dateTo) {
        if (taskDate < filters.dateFrom || taskDate > filters.dateTo) return false;
      } else if (filters.timeFrame !== "all") {
        const timeframeDays = parseInt(filters.timeFrame);
        const timeframeStart = new Date();
        timeframeStart.setDate(timeframeStart.getDate() - timeframeDays);
        if (taskDate < timeframeStart) return false;
      }

      // Jurisdiction filtering (through entity)
      if (filters.jurisdiction !== "all") {
        const taskEntity = entities.find((e: any) => e.id === task.entityId);
        if (!taskEntity || taskEntity.taxJurisdiction !== filters.jurisdiction) return false;
      }

      // Entity type filtering
      if (filters.entityType !== "all") {
        const taskEntity = entities.find((e: any) => e.id === task.entityId);
        if (!taskEntity || taskEntity.entityType !== filters.entityType) return false;
      }

      // Status filtering
      if (filters.status !== "all" && task.statusId !== parseInt(filters.status)) {
        return false;
      }

      // Compliance type filtering
      if (filters.complianceType !== "all") {
        const taskDetails = task.taskDetails?.toLowerCase() || '';
        switch (filters.complianceType) {
          case 'tax':
            if (!taskDetails.includes('tax') && !taskDetails.includes('return')) return false;
            break;
          case 'audit':
            if (!taskDetails.includes('audit')) return false;
            break;
          case 'filing':
            if (!taskDetails.includes('filing')) return false;
            break;
          case 'regulatory':
            if (!taskDetails.includes('regulatory') && !taskDetails.includes('compliance')) return false;
            break;
        }
      }

      return true;
    });
  }, [tasks, entities, filters]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!filteredComplianceTasks.length) {
      return {
        totalCompliance: 0,
        upcomingDeadlines: 0,
        overdueItems: 0,
        completedCompliance: 0,
        complianceRate: 0,
        riskDistribution: [],
        jurisdictionBreakdown: [],
        statusDistribution: [],
        deadlineTrend: [],
        entityCompliance: []
      };
    }

    const completedStatusId = taskStatuses.find((s: any) => s.name.toLowerCase() === 'completed')?.id;
    const currentDate = new Date();

    // Basic metrics
    const completedTasks = filteredComplianceTasks.filter((task: any) => task.statusId === completedStatusId);
    const upcomingDeadlines = filteredComplianceTasks.filter((task: any) => {
      if (!task.complianceDeadline || task.statusId === completedStatusId) return false;
      const deadline = new Date(task.complianceDeadline);
      const daysDiff = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 0 && daysDiff <= 30;
    });

    const overdueItems = filteredComplianceTasks.filter((task: any) => {
      if (!task.complianceDeadline || task.statusId === completedStatusId) return false;
      return new Date(task.complianceDeadline) < currentDate;
    });

    const complianceRate = filteredComplianceTasks.length > 0 ? 
      Math.round((completedTasks.length / filteredComplianceTasks.length) * 100) : 0;

    // Risk distribution based on deadlines
    const riskDistribution = [
      {
        name: 'Low Risk',
        value: filteredComplianceTasks.filter((task: any) => {
          if (!task.complianceDeadline || task.statusId === completedStatusId) return false;
          const deadline = new Date(task.complianceDeadline);
          const daysDiff = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff > 30;
        }).length,
        color: '#82ca9d'
      },
      {
        name: 'Medium Risk',
        value: upcomingDeadlines.length,
        color: '#ffc658'
      },
      {
        name: 'High Risk',
        value: overdueItems.length,
        color: '#ff7300'
      }
    ].filter(item => item.value > 0);

    // Jurisdiction breakdown
    const jurisdictionMap = new Map();
    filteredComplianceTasks.forEach((task: any) => {
      const entity = entities.find((e: any) => e.id === task.entityId);
      const jurisdiction = entity?.taxJurisdiction || 'Unknown';
      jurisdictionMap.set(jurisdiction, (jurisdictionMap.get(jurisdiction) || 0) + 1);
    });

    const jurisdictionBreakdown = Array.from(jurisdictionMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / filteredComplianceTasks.length) * 100)
    }));

    // Status distribution
    const statusDistribution = taskStatuses.map((status: any) => {
      const count = filteredComplianceTasks.filter((task: any) => task.statusId === status.id).length;
      return {
        name: status.name,
        value: count,
        percentage: filteredComplianceTasks.length > 0 ? Math.round((count / filteredComplianceTasks.length) * 100) : 0
      };
    }).filter(item => item.value > 0);

    // Entity compliance summary
    const entityMap = new Map();
    filteredComplianceTasks.forEach((task: any) => {
      const entity = entities.find((e: any) => e.id === task.entityId);
      const entityName = entity?.name || 'Unknown Entity';
      const entityId = task.entityId;
      
      if (!entityMap.has(entityId)) {
        entityMap.set(entityId, {
          name: entityName,
          total: 0,
          completed: 0,
          overdue: 0,
          upcoming: 0
        });
      }
      
      const entityData = entityMap.get(entityId);
      entityData.total++;
      
      if (task.statusId === completedStatusId) {
        entityData.completed++;
      } else if (task.complianceDeadline) {
        const deadline = new Date(task.complianceDeadline);
        if (deadline < currentDate) {
          entityData.overdue++;
        } else {
          const daysDiff = Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 30) {
            entityData.upcoming++;
          }
        }
      }
    });

    const entityCompliance = Array.from(entityMap.values()).map((entity: any) => ({
      ...entity,
      complianceRate: entity.total > 0 ? Math.round((entity.completed / entity.total) * 100) : 0
    }));

    // Deadline trend (next 30 days)
    const deadlineTrend = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayDeadlines = filteredComplianceTasks.filter((task: any) => {
        if (!task.complianceDeadline) return false;
        const taskDeadline = new Date(task.complianceDeadline);
        return taskDeadline.toDateString() === date.toDateString();
      });
      
      if (dayDeadlines.length > 0) {
        deadlineTrend.push({
          date: format(date, 'MMM dd'),
          deadlines: dayDeadlines.length
        });
      }
    }

    return {
      totalCompliance: filteredComplianceTasks.length,
      upcomingDeadlines: upcomingDeadlines.length,
      overdueItems: overdueItems.length,
      completedCompliance: completedTasks.length,
      complianceRate,
      riskDistribution,
      jurisdictionBreakdown,
      statusDistribution,
      deadlineTrend,
      entityCompliance
    };
  }, [filteredComplianceTasks, taskStatuses, entities]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('compliance-overview-report', {
        title: 'Compliance Overview Report',
        subtitle: `Generated for ${filters.timeFrame === 'all' ? 'All Time' : `Last ${filters.timeFrame} Days`}`,
        reportType: 'ComplianceOverview',
        filters: {
          timeFrame: filters.timeFrame,
          jurisdiction: filters.jurisdiction !== 'all' ? filters.jurisdiction : 'All',
          entityType: filters.entityType,
          complianceType: filters.complianceType,
          status: filters.status !== 'all' ? taskStatuses.find(s => s.id === parseInt(filters.status))?.name : 'All',
          dateRange: filters.dateFrom && filters.dateTo ? `${format(filters.dateFrom, 'MMM dd, yyyy')} - ${format(filters.dateTo, 'MMM dd, yyyy')}` : 'N/A'
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <AppLayout title="Compliance Overview Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Compliance Overview</h1>
            <p className="text-muted-foreground">Monitor compliance deadlines and regulatory requirements</p>
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
              {/* Time Frame Filter */}
              <div className="space-y-2">
                <Label>Time Frame</Label>
                <Select value={filters.timeFrame} onValueChange={(value) => setFilters(prev => ({ ...prev, timeFrame: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Next 30 days</SelectItem>
                    <SelectItem value="60">Next 60 days</SelectItem>
                    <SelectItem value="90">Next 90 days</SelectItem>
                    <SelectItem value="365">Next year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Jurisdiction Filter */}
              <div className="space-y-2">
                <Label>Tax Jurisdiction</Label>
                <Select value={filters.jurisdiction} onValueChange={(value) => setFilters(prev => ({ ...prev, jurisdiction: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jurisdictions</SelectItem>
                    {[...new Set(entities.map((e: any) => e.taxJurisdiction))].filter(Boolean).map((jurisdiction: string) => (
                      <SelectItem key={jurisdiction} value={jurisdiction}>
                        {jurisdiction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Entity Type Filter */}
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={filters.entityType} onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {[...new Set(entities.map((e: any) => e.entityType))].filter(Boolean).map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Compliance Type Filter */}
              <div className="space-y-2">
                <Label>Compliance Type</Label>
                <Select value={filters.complianceType} onValueChange={(value) => setFilters(prev => ({ ...prev, complianceType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="tax">Tax Compliance</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="filing">Filing Requirements</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
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
                    jurisdiction: "all",
                    riskLevel: "all",
                    timeFrame: "30",
                    entityType: "all",
                    complianceType: "all",
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
        <div id="compliance-overview-report" className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Compliance Items</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalCompliance}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.completedCompliance} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                <Shield className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.complianceRate}%</div>
                <Progress value={analytics.complianceRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.upcomingDeadlines}</div>
                <p className="text-xs text-muted-foreground">
                  Next 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.overdueItems}</div>
                <p className="text-xs text-muted-foreground">
                  Requires immediate attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Entity Compliance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Entity Compliance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Upcoming</TableHead>
                    <TableHead>Compliance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.entityCompliance.map((entity: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{entity.name}</TableCell>
                      <TableCell>{entity.total}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {entity.completed}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entity.overdue > 0 ? (
                          <Badge variant="destructive">
                            {entity.overdue}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entity.upcoming > 0 ? (
                          <Badge variant="secondary">
                            {entity.upcoming}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={entity.complianceRate} className="w-16" />
                          <span className="text-sm">{entity.complianceRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.riskDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {analytics.riskDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Jurisdiction Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance by Jurisdiction</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.jurisdictionBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
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

            {/* Deadline Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadline Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.deadlineTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="deadlines" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}