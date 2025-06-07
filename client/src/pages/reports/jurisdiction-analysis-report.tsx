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
  MapPin, 
  Globe, 
  Building,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Filter,
  Download,
  BarChart3,
  PieChart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { usePDFExport } from "@/utils/pdf-export";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ff6b6b', '#4ecdc4'];

export default function JurisdictionAnalysisReport() {
  const [filters, setFilters] = useState({
    jurisdiction: "all",
    entityType: "all",
    complianceType: "all",
    timeFrame: "30",
    riskLevel: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });

  // Calculate jurisdiction analytics
  const jurisdictionAnalytics = useMemo(() => {
    if (!tasks?.length || !entities?.length) {
      return {
        totalJurisdictions: 0,
        totalEntities: 0,
        totalTasks: 0,
        totalRevenue: 0,
        jurisdictionBreakdown: [],
        complianceByJurisdiction: [],
        revenueByJurisdiction: [],
        taskDistribution: [],
        riskAnalysis: [],
        entityDistribution: []
      };
    }

    const currentDate = new Date();
    const completedStatusId = taskStatuses.find((s: any) => s.name === 'Completed')?.id;

    // Filter tasks based on criteria
    const filteredTasks = tasks.filter((task: any) => {
      // Date filtering
      const taskDate = new Date(task.createdAt);
      if (filters.dateFrom && filters.dateTo) {
        if (taskDate < filters.dateFrom || taskDate > filters.dateTo) return false;
      } else if (filters.timeFrame !== "all") {
        const days = parseInt(filters.timeFrame);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        if (taskDate < cutoffDate) return false;
      }

      // Jurisdiction filtering
      if (filters.jurisdiction !== "all") {
        const entity = entities.find((e: any) => e.id === task.entityId);
        if (!entity || entity.taxJurisdiction !== filters.jurisdiction) return false;
      }

      // Entity type filtering
      if (filters.entityType !== "all") {
        const entity = entities.find((e: any) => e.id === task.entityId);
        if (!entity || entity.entityType !== filters.entityType) return false;
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

    // Get unique jurisdictions from entities
    const jurisdictions = [...new Set(entities.map((e: any) => e.taxJurisdiction))].filter(Boolean);
    
    // Jurisdiction breakdown analysis
    const jurisdictionMap = new Map();
    
    jurisdictions.forEach(jurisdiction => {
      const jurisdictionEntities = entities.filter((e: any) => e.taxJurisdiction === jurisdiction);
      const jurisdictionTasks = filteredTasks.filter((task: any) => {
        const entity = entities.find((e: any) => e.id === task.entityId);
        return entity?.taxJurisdiction === jurisdiction;
      });

      const completedTasks = jurisdictionTasks.filter((task: any) => task.statusId === completedStatusId);
      const overdueTasks = jurisdictionTasks.filter((task: any) => {
        if (task.statusId === completedStatusId || !task.dueDate) return false;
        return new Date(task.dueDate) < currentDate;
      });

      const totalRevenue = jurisdictionTasks.reduce((sum, task) => {
        return sum + (task.serviceRate || 0);
      }, 0);

      const complianceTasks = jurisdictionTasks.filter((task: any) => 
        task.complianceDeadline || 
        task.taskDetails?.toLowerCase().includes('compliance') ||
        task.taskType === 'Compliance'
      );

      jurisdictionMap.set(jurisdiction, {
        name: jurisdiction,
        entityCount: jurisdictionEntities.length,
        taskCount: jurisdictionTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        complianceTasks: complianceTasks.length,
        totalRevenue,
        completionRate: jurisdictionTasks.length > 0 ? Math.round((completedTasks.length / jurisdictionTasks.length) * 100) : 0,
        complianceRate: complianceTasks.length > 0 ? Math.round((complianceTasks.filter(t => t.statusId === completedStatusId).length / complianceTasks.length) * 100) : 100,
        avgRevenue: jurisdictionTasks.length > 0 ? Math.round(totalRevenue / jurisdictionTasks.length) : 0
      });
    });

    const jurisdictionBreakdown = Array.from(jurisdictionMap.values()).sort((a, b) => b.taskCount - a.taskCount);

    // Compliance analysis by jurisdiction
    const complianceByJurisdiction = jurisdictionBreakdown.map(jurisdiction => ({
      name: jurisdiction.name,
      totalCompliance: jurisdiction.complianceTasks,
      completedCompliance: filteredTasks.filter((task: any) => {
        const entity = entities.find((e: any) => e.id === task.entityId);
        const isCompliance = task.complianceDeadline || task.taskDetails?.toLowerCase().includes('compliance');
        return entity?.taxJurisdiction === jurisdiction.name && 
               isCompliance && 
               task.statusId === completedStatusId;
      }).length,
      complianceRate: jurisdiction.complianceRate
    }));

    // Revenue analysis by jurisdiction
    const revenueByJurisdiction = jurisdictionBreakdown
      .filter(j => j.totalRevenue > 0)
      .map(jurisdiction => ({
        name: jurisdiction.name,
        revenue: jurisdiction.totalRevenue,
        avgRevenue: jurisdiction.avgRevenue,
        percentage: Math.round((jurisdiction.totalRevenue / jurisdictionBreakdown.reduce((sum, j) => sum + j.totalRevenue, 0)) * 100)
      }));

    // Task distribution by type across jurisdictions
    const taskTypes = [...new Set(filteredTasks.map((task: any) => task.taskType))];
    const taskDistribution = taskTypes.map(type => {
      const typeData = { type };
      jurisdictions.forEach(jurisdiction => {
        const count = filteredTasks.filter((task: any) => {
          const entity = entities.find((e: any) => e.id === task.entityId);
          return entity?.taxJurisdiction === jurisdiction && task.taskType === type;
        }).length;
        typeData[jurisdiction] = count;
      });
      return typeData;
    });

    // Risk analysis by jurisdiction
    const riskAnalysis = jurisdictionBreakdown.map(jurisdiction => {
      const riskScore = jurisdiction.overdueTasks * 10 + 
                      (100 - jurisdiction.complianceRate) + 
                      (100 - jurisdiction.completionRate);
      
      let riskLevel = 'Low';
      if (riskScore >= 50) riskLevel = 'High';
      else if (riskScore >= 25) riskLevel = 'Medium';

      return {
        name: jurisdiction.name,
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        overdueTasks: jurisdiction.overdueTasks,
        complianceGaps: 100 - jurisdiction.complianceRate
      };
    });

    // Entity distribution by type and jurisdiction
    const entityTypes = [...new Set(entities.map((e: any) => e.entityType))].filter(Boolean);
    const entityDistribution = entityTypes.map(type => {
      const typeEntities = entities.filter((e: any) => e.entityType === type);
      const jurisdictionCounts = {};
      
      jurisdictions.forEach(jurisdiction => {
        jurisdictionCounts[jurisdiction] = typeEntities.filter((e: any) => e.taxJurisdiction === jurisdiction).length;
      });

      return {
        entityType: type,
        total: typeEntities.length,
        ...jurisdictionCounts
      };
    });

    return {
      totalJurisdictions: jurisdictions.length,
      totalEntities: entities.length,
      totalTasks: filteredTasks.length,
      totalRevenue: jurisdictionBreakdown.reduce((sum, j) => sum + j.totalRevenue, 0),
      jurisdictionBreakdown,
      complianceByJurisdiction,
      revenueByJurisdiction,
      taskDistribution,
      riskAnalysis,
      entityDistribution
    };
  }, [tasks, entities, taskStatuses, filters]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('jurisdiction-analysis-report', {
        title: 'Jurisdiction Analysis Report',
        subtitle: `Generated for ${filters.timeFrame === 'all' ? 'All Time' : `Last ${filters.timeFrame} Days`}`,
        reportType: 'JurisdictionAnalysis',
        filters: {
          timeFrame: filters.timeFrame,
          jurisdiction: filters.jurisdiction,
          entityType: filters.entityType,
          complianceType: filters.complianceType,
          riskLevel: filters.riskLevel,
          dateRange: filters.dateFrom && filters.dateTo ? `${format(filters.dateFrom, 'MMM dd, yyyy')} - ${format(filters.dateTo, 'MMM dd, yyyy')}` : 'N/A'
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <AppLayout title="Jurisdiction Analysis Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Jurisdiction Analysis</h1>
            <p className="text-muted-foreground">Analyze compliance and performance across tax jurisdictions</p>
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
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Jurisdiction Filter */}
              <div className="space-y-2">
                <Label>Jurisdiction</Label>
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

              {/* Risk Level Filter */}
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={filters.riskLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
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
                    entityType: "all",
                    complianceType: "all",
                    timeFrame: "30",
                    riskLevel: "all",
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
        <div id="jurisdiction-analysis-report" className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jurisdictions</CardTitle>
                <Globe className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jurisdictionAnalytics.totalJurisdictions}</div>
                <p className="text-xs text-muted-foreground">
                  Active tax jurisdictions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
                <Building className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jurisdictionAnalytics.totalEntities}</div>
                <p className="text-xs text-muted-foreground">
                  Across all jurisdictions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jurisdictionAnalytics.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  Compliance & operational
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${jurisdictionAnalytics.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Service revenue generated
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Jurisdiction Overview Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Jurisdiction Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Entities</TableHead>
                    <TableHead>Total Tasks</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jurisdictionAnalytics.jurisdictionBreakdown.map((jurisdiction: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{jurisdiction.name}</TableCell>
                      <TableCell>{jurisdiction.entityCount}</TableCell>
                      <TableCell>{jurisdiction.taskCount}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {jurisdiction.completedTasks}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {jurisdiction.overdueTasks > 0 ? (
                          <Badge variant="destructive">
                            {jurisdiction.overdueTasks}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={jurisdiction.completionRate} className="w-16" />
                          <span className="text-sm">{jurisdiction.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>${jurisdiction.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell>${jurisdiction.avgRevenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Risk Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Analysis by Jurisdiction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Overdue Tasks</TableHead>
                    <TableHead>Compliance Gaps</TableHead>
                    <TableHead>Action Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jurisdictionAnalytics.riskAnalysis.map((risk: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{risk.name}</TableCell>
                      <TableCell>{risk.riskScore}</TableCell>
                      <TableCell>
                        <Badge variant={
                          risk.riskLevel === 'High' ? 'destructive' : 
                          risk.riskLevel === 'Medium' ? 'secondary' : 'default'
                        }>
                          {risk.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>{risk.overdueTasks}</TableCell>
                      <TableCell>{risk.complianceGaps}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {risk.riskLevel === 'High' ? 'Immediate attention required' :
                         risk.riskLevel === 'Medium' ? 'Monitor and improve' :
                         'Continue current approach'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Distribution by Jurisdiction */}
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution by Jurisdiction</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={jurisdictionAnalytics.jurisdictionBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="taskCount" fill="#8884d8" name="Total Tasks" />
                    <Bar dataKey="completedTasks" fill="#82ca9d" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Jurisdiction</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={jurisdictionAnalytics.revenueByJurisdiction}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {jurisdictionAnalytics.revenueByJurisdiction.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Compliance Rate by Jurisdiction */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={jurisdictionAnalytics.complianceByJurisdiction}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="complianceRate" fill="#82ca9d" name="Compliance Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Score by Jurisdiction</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={jurisdictionAnalytics.riskAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="riskScore" fill="#ff7300" name="Risk Score" />
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