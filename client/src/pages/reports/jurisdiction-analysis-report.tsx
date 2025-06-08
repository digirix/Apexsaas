import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AIInsightsPanel } from "@/components/reports/ai-insights-panel";
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
  PieChart,
  Users,
  FileText
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { usePDFExport } from "@/utils/pdf-export";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ff6b6b', '#4ecdc4'];

export default function JurisdictionAnalysisReport() {
  const [filters, setFilters] = useState({
    country: "all",
    taxJurisdiction: "all",
    entityType: "all",
    client: "all",
    entity: "all",
    taskCategory: "all",
    timeframe: "30"
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });
  const { data: taxJurisdictions = [] } = useQuery({ queryKey: ["/api/v1/setup/tax-jurisdictions"] });
  const { data: entityTypes = [] } = useQuery({ queryKey: ["/api/v1/setup/entity-types"] });
  const { data: taskCategories = [] } = useQuery({ queryKey: ["/api/v1/setup/task-categories"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });

  // Filter dependent data
  const filteredTaxJurisdictions = useMemo(() => {
    if (filters.country === "all") return taxJurisdictions;
    return (taxJurisdictions as any[]).filter((tj: any) => tj.countryId?.toString() === filters.country);
  }, [taxJurisdictions, filters.country]);

  const filteredEntityTypes = useMemo(() => {
    if (filters.country === "all") return entityTypes;
    return (entityTypes as any[]).filter((et: any) => et.countryId?.toString() === filters.country);
  }, [entityTypes, filters.country]);

  const filteredClients = useMemo(() => {
    if (filters.country === "all") return clients;
    return (clients as any[]).filter((c: any) => c.countryId?.toString() === filters.country);
  }, [clients, filters.country]);

  const filteredEntities = useMemo(() => {
    if (filters.client === "all") return entities;
    return (entities as any[]).filter((e: any) => e.clientId?.toString() === filters.client);
  }, [entities, filters.client]);

  // Calculate jurisdiction analytics
  const jurisdictionAnalytics = useMemo(() => {
    if (!tasks?.length || !entities?.length) {
      return {
        totalJurisdictions: 0,
        totalEntities: 0,
        totalTasks: 0,
        completedTasks: 0,
        jurisdictionBreakdown: [],
        complianceByJurisdiction: [],
        revenueByJurisdiction: [],
        taskDistribution: [],
        riskAnalysis: [],
        entityDistribution: []
      };
    }

    const currentDate = new Date();
    const completedStatusId = (taskStatuses as any[]).find((s: any) => s.name === 'Completed')?.id;

    // Filter tasks based on criteria
    const filteredTasks = (tasks as any[]).filter((task: any) => {
      // Time filtering
      if (filters.timeframe !== "all") {
        const taskDate = new Date(task.createdAt);
        const days = parseInt(filters.timeframe);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        if (taskDate < cutoffDate) return false;
      }

      // Entity filtering chain
      const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
      if (!entity) return false;

      if (filters.entity !== "all" && entity.id?.toString() !== filters.entity) return false;
      if (filters.client !== "all" && entity.clientId?.toString() !== filters.client) return false;
      if (filters.entityType !== "all" && entity.entityTypeId?.toString() !== filters.entityType) return false;
      
      // Country filtering through entity
      const client = (clients as any[]).find((c: any) => c.id === entity.clientId);
      if (filters.country !== "all" && client?.countryId?.toString() !== filters.country) return false;

      // Tax jurisdiction filtering
      if (filters.taxJurisdiction !== "all" && entity.taxJurisdictionId?.toString() !== filters.taxJurisdiction) return false;

      // Task category filtering
      if (filters.taskCategory !== "all" && task.taskCategoryId?.toString() !== filters.taskCategory) return false;

      return true;
    });

    // Get unique jurisdictions from filtered data
    const uniqueJurisdictionIds = [...new Set(filteredTasks.map((task: any) => {
      const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
      return entity?.taxJurisdictionId;
    }))].filter(Boolean);

    // Jurisdiction breakdown analysis
    const jurisdictionBreakdown = uniqueJurisdictionIds.map(jurisdictionId => {
      const jurisdiction = (taxJurisdictions as any[]).find((tj: any) => tj.id === jurisdictionId);
      const jurisdictionTasks = filteredTasks.filter((task: any) => {
        const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
        return entity?.taxJurisdictionId === jurisdictionId;
      });

      const jurisdictionEntities = (entities as any[]).filter((e: any) => e.taxJurisdictionId === jurisdictionId);
      const completedTasks = jurisdictionTasks.filter((task: any) => task.statusId === completedStatusId);
      const overdueTasks = jurisdictionTasks.filter((task: any) => {
        if (task.statusId === completedStatusId || !task.dueDate) return false;
        return new Date(task.dueDate) < currentDate;
      });

      const totalRevenue = jurisdictionTasks.reduce((sum, task) => sum + (task.serviceRate || 0), 0);
      const complianceTasks = jurisdictionTasks.filter((task: any) => task.complianceDeadline);

      return {
        id: jurisdictionId,
        name: jurisdiction?.name || 'Unknown',
        entityCount: jurisdictionEntities.length,
        taskCount: jurisdictionTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        complianceTasks: complianceTasks.length,
        totalRevenue,
        completionRate: jurisdictionTasks.length > 0 ? Math.round((completedTasks.length / jurisdictionTasks.length) * 100) : 0,
        complianceRate: complianceTasks.length > 0 ? Math.round((complianceTasks.filter(t => t.statusId === completedStatusId).length / complianceTasks.length) * 100) : 100,
        avgRevenue: jurisdictionTasks.length > 0 ? Math.round(totalRevenue / jurisdictionTasks.length) : 0
      };
    }).sort((a, b) => b.taskCount - a.taskCount);

    // Compliance analysis by jurisdiction
    const complianceByJurisdiction = jurisdictionBreakdown.map(jurisdiction => ({
      name: jurisdiction.name,
      totalCompliance: jurisdiction.complianceTasks,
      completedCompliance: filteredTasks.filter((task: any) => {
        const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
        return entity?.taxJurisdictionId === jurisdiction.id && 
               task.complianceDeadline && 
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

    // Task distribution by category across jurisdictions
    const taskCategoryDistribution = (taskCategories as any[]).map(category => {
      const categoryData = { category: category.name };
      uniqueJurisdictionIds.forEach(jurisdictionId => {
        const jurisdiction = (taxJurisdictions as any[]).find((tj: any) => tj.id === jurisdictionId);
        const count = filteredTasks.filter((task: any) => {
          const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
          return entity?.taxJurisdictionId === jurisdictionId && task.taskCategoryId === category.id;
        }).length;
        categoryData[jurisdiction?.name || 'Unknown'] = count;
      });
      return categoryData;
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
    const entityDistribution = (entityTypes as any[]).map(type => {
      const typeEntities = (entities as any[]).filter((e: any) => e.entityTypeId === type.id);
      const jurisdictionCounts = {};
      
      uniqueJurisdictionIds.forEach(jurisdictionId => {
        const jurisdiction = (taxJurisdictions as any[]).find((tj: any) => tj.id === jurisdictionId);
        jurisdictionCounts[jurisdiction?.name || 'Unknown'] = typeEntities.filter((e: any) => e.taxJurisdictionId === jurisdictionId).length;
      });

      return {
        entityType: type.name,
        total: typeEntities.length,
        ...jurisdictionCounts
      };
    });

    return {
      totalJurisdictions: uniqueJurisdictionIds.length,
      totalEntities: filteredTasks.map(t => (entities as any[]).find(e => e.id === t.entityId)).filter(Boolean).length,
      totalTasks: filteredTasks.length,
      completedTasks: filteredTasks.filter(t => t.statusId === completedStatusId).length,
      jurisdictionBreakdown,
      complianceByJurisdiction,
      revenueByJurisdiction,
      taskDistribution: taskCategoryDistribution,
      riskAnalysis,
      entityDistribution
    };
  }, [tasks, entities, clients, taxJurisdictions, entityTypes, taskCategories, taskStatuses, filters]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('jurisdiction-analysis-report', {
        title: 'Tax Jurisdiction Analysis Report',
        subtitle: `Generated for ${filters.timeframe === 'all' ? 'All Time' : `Last ${filters.timeframe} Days`}`,
        reportType: 'JurisdictionAnalysis',
        filters
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <AppLayout title="Tax Jurisdiction Analysis Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tax Jurisdiction Analysis</h1>
            <p className="text-muted-foreground">Analyze compliance and performance across tax jurisdictions</p>
          </div>
          <div className="flex items-center gap-2">
            <AIInsightsPanel 
              reportType="jurisdiction-analysis" 
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
              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                <Filter className="w-3 h-3" />
                Filters:
              </div>
              
              {/* Timeframe Filter */}
              <Select value={filters.timeframe} onValueChange={(value) => setFilters(prev => ({ ...prev, timeframe: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue>
                    {filters.timeframe === "7" ? "Last 7 days" :
                     filters.timeframe === "30" ? "Last 30 days" :
                     filters.timeframe === "90" ? "Last 90 days" :
                     filters.timeframe === "365" ? "Last year" :
                     filters.timeframe === "all" ? "All time" : "Timeframe"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              {/* Country Filter */}
              <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                country: value,
                entityType: "all",
                taxJurisdiction: "all",
                client: "all",
                entity: "all"
              }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue>
                    {filters.country === "all" ? "Country" : 
                     (countries as any[]).find((c: any) => c.id.toString() === filters.country)?.name || "Country"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {(countries as any[]).map((country: any) => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tax Jurisdiction Filter */}
              <Select value={filters.taxJurisdiction} onValueChange={(value) => setFilters(prev => ({ ...prev, taxJurisdiction: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue>
                    {filters.taxJurisdiction === "all" ? "Tax Jurisdiction" : 
                     (filteredTaxJurisdictions as any[]).find((tj: any) => tj.id.toString() === filters.taxJurisdiction)?.name || "Tax Jurisdiction"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jurisdictions</SelectItem>
                  {(filteredTaxJurisdictions as any[]).map((jurisdiction: any) => (
                    <SelectItem key={jurisdiction.id} value={jurisdiction.id.toString()}>
                      {jurisdiction.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Entity Type Filter */}
              <Select value={filters.entityType} onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue>
                    {filters.entityType === "all" ? "Entity Type" : 
                     (filteredEntityTypes as any[]).find((et: any) => et.id.toString() === filters.entityType)?.name || "Entity Type"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(filteredEntityTypes as any[]).map((type: any) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Client Filter */}
              <Select value={filters.client} onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                client: value,
                entity: "all"
              }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue>
                    {filters.client === "all" ? "Client" : 
                     (filteredClients as any[]).find((c: any) => c.id.toString() === filters.client)?.displayName || "Client"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {(filteredClients as any[]).map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Entity Filter */}
              <Select value={filters.entity} onValueChange={(value) => setFilters(prev => ({ ...prev, entity: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue>
                    {filters.entity === "all" ? "Entity" : 
                     (filteredEntities as any[]).find((e: any) => e.id.toString() === filters.entity)?.name || "Entity"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {(filteredEntities as any[]).map((entity: any) => (
                    <SelectItem key={entity.id} value={entity.id.toString()}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Task Category Filter */}
              <Select value={filters.taskCategory} onValueChange={(value) => setFilters(prev => ({ ...prev, taskCategory: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue>
                    {filters.taskCategory === "all" ? "Task Category" : 
                     (taskCategories as any[]).find((tc: any) => tc.id.toString() === filters.taskCategory)?.name || "Task Category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(taskCategories as any[]).map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs border-gray-300"
                onClick={() => setFilters({
                  country: "all",
                  taxJurisdiction: "all",
                  entityType: "all",
                  client: "all",
                  entity: "all",
                  taskCategory: "all",
                  timeframe: "30"
                })}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Score Cards - Half Height */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="h-20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Jurisdictions</p>
                  <p className="text-lg font-bold">{jurisdictionAnalytics.totalJurisdictions}</p>
                </div>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Entities</p>
                  <p className="text-lg font-bold">{jurisdictionAnalytics.totalEntities}</p>
                </div>
                <Building className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Tasks</p>
                  <p className="text-lg font-bold">{jurisdictionAnalytics.totalTasks}</p>
                </div>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-lg font-bold">
                    {jurisdictionAnalytics.totalTasks > 0 
                      ? Math.round((jurisdictionAnalytics.completedTasks / jurisdictionAnalytics.totalTasks) * 100)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jurisdiction Analysis Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Jurisdiction Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Entities</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead>Compliance Rate</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jurisdictionAnalytics.jurisdictionBreakdown.map((jurisdiction, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{jurisdiction.name}</TableCell>
                    <TableCell>{jurisdiction.entityCount}</TableCell>
                    <TableCell>{jurisdiction.taskCount}</TableCell>
                    <TableCell>{jurisdiction.completedTasks}</TableCell>
                    <TableCell>
                      {jurisdiction.overdueTasks > 0 && (
                        <Badge variant="destructive">{jurisdiction.overdueTasks}</Badge>
                      )}
                      {jurisdiction.overdueTasks === 0 && <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={jurisdiction.completionRate} className="h-2 w-16" />
                        <span className="text-sm">{jurisdiction.completionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={jurisdiction.complianceRate} className="h-2 w-16" />
                        <span className="text-sm">{jurisdiction.complianceRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>${jurisdiction.totalRevenue.toLocaleString()}</TableCell>
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
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Overdue Tasks</TableHead>
                  <TableHead>Compliance Gaps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jurisdictionAnalytics.riskAnalysis.map((risk, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{risk.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        risk.riskLevel === 'High' ? 'destructive' : 
                        risk.riskLevel === 'Medium' ? 'secondary' : 'outline'
                      }>
                        {risk.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={risk.riskScore} className="h-2 w-16" />
                        <span className="text-sm">{risk.riskScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>{risk.overdueTasks}</TableCell>
                    <TableCell>{risk.complianceGaps}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Revenue by Jurisdiction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jurisdictionAnalytics.revenueByJurisdiction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Task Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={jurisdictionAnalytics.jurisdictionBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="taskCount"
                  >
                    {jurisdictionAnalytics.jurisdictionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}