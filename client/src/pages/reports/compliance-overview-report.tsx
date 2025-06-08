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
import { AIInsightsPanel } from "@/components/reports/ai-insights-panel";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export default function ComplianceOverviewReport() {
  const [filters, setFilters] = useState({
    country: "all",
    jurisdiction: "all",
    riskLevel: "all",
    timeFrame: "30",
    entityType: "all",
    taskCategory: "all",
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
  const { data: taxJurisdictions = [] } = useQuery({ queryKey: ["/api/v1/setup/tax-jurisdictions"] });
  const { data: entityTypes = [] } = useQuery({ queryKey: ["/api/v1/setup/entity-types"] });
  const { data: taskCategories = [] } = useQuery({ queryKey: ["/api/v1/setup/task-categories"] });

  // Filter tax jurisdictions based on selected country
  const filteredTaxJurisdictions = useMemo(() => {
    if (filters.country === "all") return taxJurisdictions;
    return (taxJurisdictions as any[]).filter((tj: any) => tj.countryId === parseInt(filters.country));
  }, [taxJurisdictions, filters.country]);

  // Filter entity types based on selected country
  const filteredEntityTypes = useMemo(() => {
    if (filters.country === "all") return entityTypes;
    return (entityTypes as any[]).filter((et: any) => et.countryId === parseInt(filters.country));
  }, [entityTypes, filters.country]);

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

      // Task category filtering
      if (filters.taskCategory !== "all" && task.categoryId !== parseInt(filters.taskCategory)) {
        return false;
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
          country: filters.country !== 'all' ? (countries as any[]).find(c => c.id === parseInt(filters.country))?.name : 'All',
          jurisdiction: filters.jurisdiction !== 'all' ? (filteredTaxJurisdictions as any[]).find(j => j.id === parseInt(filters.jurisdiction))?.name : 'All',
          entityType: filters.entityType !== 'all' ? (filteredEntityTypes as any[]).find(t => t.id === parseInt(filters.entityType))?.name : 'All',
          taskCategory: filters.taskCategory !== 'all' ? (taskCategories as any[]).find(c => c.id === parseInt(filters.taskCategory))?.name : 'All',
          status: filters.status !== 'all' ? (taskStatuses as any[]).find(s => s.id === parseInt(filters.status))?.name : 'All',
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
          <div className="flex items-center gap-2">
            <AIInsightsPanel 
              reportType="compliance-overview" 
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
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
                <Filter className="w-3 h-3" />
                Filters:
              </div>
              
              {/* Time Frame Filter */}
              <div>
                <Select value={filters.timeFrame} onValueChange={(value) => setFilters(prev => ({ ...prev, timeFrame: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue placeholder="Time" />
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

              {/* Country Filter */}
              <div>
                <Select value={filters.country} onValueChange={(value) => {
                  setFilters(prev => ({ 
                    ...prev, 
                    country: value,
                    jurisdiction: "all", // Reset dependent filters
                    entityType: "all"
                  }));
                }}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {countries.map((country: any) => (
                      <SelectItem key={country.id} value={country.id.toString()}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tax Jurisdiction Filter */}
              <div>
                <Select value={filters.jurisdiction} onValueChange={(value) => setFilters(prev => ({ ...prev, jurisdiction: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue placeholder="Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filteredTaxJurisdictions.map((jurisdiction: any) => (
                      <SelectItem key={jurisdiction.id} value={jurisdiction.id.toString()}>
                        {jurisdiction.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Entity Type Filter */}
              <div>
                <Select value={filters.entityType} onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue placeholder="Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filteredEntityTypes.map((type: any) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Category Filter */}
              <div>
                <Select value={filters.taskCategory} onValueChange={(value) => setFilters(prev => ({ ...prev, taskCategory: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue placeholder="Category" />
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
              <div>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue placeholder="Status" />
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

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilters({
                  country: "all",
                  jurisdiction: "all",
                  riskLevel: "all",
                  timeFrame: "30",
                  entityType: "all",
                  taskCategory: "all",
                  status: "all",
                  dateFrom: null,
                  dateTo: null
                })}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <div id="compliance-overview-report" className="space-y-6">
          {/* Score Cards - Half Height */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="h-16">
              <CardContent className="p-3 flex items-center justify-between h-full">
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground">Total Compliance Items</div>
                  <div className="text-lg font-bold">{analytics.totalCompliance}</div>
                  <div className="text-xs text-muted-foreground">{analytics.completedCompliance} completed</div>
                </div>
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>

            <Card className="h-16">
              <CardContent className="p-3 flex items-center justify-between h-full">
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground">Compliance Rate</div>
                  <div className="text-lg font-bold">{analytics.complianceRate}%</div>
                  <Progress value={analytics.complianceRate} className="h-1 mt-1" />
                </div>
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>

            <Card className="h-16">
              <CardContent className="p-3 flex items-center justify-between h-full">
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground">Upcoming Deadlines</div>
                  <div className="text-lg font-bold">{analytics.upcomingDeadlines}</div>
                  <div className="text-xs text-muted-foreground">Next 30 days</div>
                </div>
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>

            <Card className="h-16">
              <CardContent className="p-3 flex items-center justify-between h-full">
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground">Overdue Items</div>
                  <div className="text-lg font-bold text-red-600">{analytics.overdueItems}</div>
                  <div className="text-xs text-muted-foreground">Requires attention</div>
                </div>
                <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
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