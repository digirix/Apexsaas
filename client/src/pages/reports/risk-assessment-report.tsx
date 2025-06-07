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
  Target,
  TrendingDown,
  AlertCircle,
  Activity,
  Filter,
  Download,
  Eye
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { usePDFExport } from "@/utils/pdf-export";
import { AIInsightsPanel } from "@/components/reports/ai-insights-panel";

const COLORS = ['#ff4444', '#ff8800', '#ffaa00', '#88dd88', '#4488ff'];

export default function RiskAssessmentReport() {
  const [filters, setFilters] = useState({
    riskLevel: "all",
    timeframe: "30",
    entityType: "all",
    jurisdiction: "all",
    complianceType: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });

  // Apply filtering and calculate risk assessment
  const riskAnalysis = useMemo(() => {
    if (!tasks?.length || !entities?.length) {
      return {
        overallRisk: 0,
        criticalRisks: 0,
        highRisks: 0,
        mediumRisks: 0,
        lowRisks: 0,
        riskByEntity: [],
        riskByJurisdiction: [],
        riskTrends: [],
        complianceRisks: [],
        mitigationActions: []
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
      } else if (filters.timeframe !== "all") {
        const days = parseInt(filters.timeframe);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        if (taskDate < cutoffDate) return false;
      }

      // Entity type filtering
      if (filters.entityType !== "all") {
        const entity = entities.find((e: any) => e.id === task.entityId);
        if (!entity || entity.entityType !== filters.entityType) return false;
      }

      // Jurisdiction filtering
      if (filters.jurisdiction !== "all") {
        const entity = entities.find((e: any) => e.id === task.entityId);
        if (!entity || entity.taxJurisdiction !== filters.jurisdiction) return false;
      }

      return true;
    });

    // Calculate risk levels for each task
    const tasksWithRisk = filteredTasks.map((task: any) => {
      let riskScore = 0;
      let riskLevel = 'Low';

      // Risk factors
      const isOverdue = task.dueDate && new Date(task.dueDate) < currentDate && task.statusId !== completedStatusId;
      const isCompliance = task.complianceDeadline || task.taskDetails?.toLowerCase().includes('compliance');
      const daysPastDue = isOverdue ? Math.ceil((currentDate.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const isHighValue = task.serviceRate && task.serviceRate > 1000;

      // Calculate risk score
      if (isOverdue) riskScore += daysPastDue > 30 ? 40 : daysPastDue > 14 ? 30 : 20;
      if (isCompliance) riskScore += 25;
      if (isHighValue) riskScore += 15;
      if (task.taskType === 'Compliance') riskScore += 20;

      // Determine risk level
      if (riskScore >= 60) riskLevel = 'Critical';
      else if (riskScore >= 40) riskLevel = 'High';
      else if (riskScore >= 20) riskLevel = 'Medium';
      else riskLevel = 'Low';

      return { ...task, riskScore, riskLevel, isOverdue, daysPastDue };
    });

    // Count risks by level
    const criticalRisks = tasksWithRisk.filter(t => t.riskLevel === 'Critical').length;
    const highRisks = tasksWithRisk.filter(t => t.riskLevel === 'High').length;
    const mediumRisks = tasksWithRisk.filter(t => t.riskLevel === 'Medium').length;
    const lowRisks = tasksWithRisk.filter(t => t.riskLevel === 'Low').length;

    // Calculate overall risk score
    const totalTasks = tasksWithRisk.length;
    const overallRisk = totalTasks > 0 ? Math.round(
      (criticalRisks * 4 + highRisks * 3 + mediumRisks * 2 + lowRisks * 1) / (totalTasks * 4) * 100
    ) : 0;

    // Risk by entity
    const entityRiskMap = new Map();
    tasksWithRisk.forEach(task => {
      const entity = entities.find((e: any) => e.id === task.entityId);
      const entityName = entity?.name || 'Unknown';
      
      if (!entityRiskMap.has(entityName)) {
        entityRiskMap.set(entityName, {
          name: entityName,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          totalTasks: 0,
          averageRisk: 0
        });
      }
      
      const entityData = entityRiskMap.get(entityName);
      entityData.totalTasks++;
      entityData.averageRisk += task.riskScore;
      
      switch (task.riskLevel) {
        case 'Critical': entityData.critical++; break;
        case 'High': entityData.high++; break;
        case 'Medium': entityData.medium++; break;
        case 'Low': entityData.low++; break;
      }
    });

    const riskByEntity = Array.from(entityRiskMap.values()).map((entity: any) => ({
      ...entity,
      averageRisk: Math.round(entity.averageRisk / entity.totalTasks),
      riskLevel: entity.critical > 0 ? 'Critical' : 
                entity.high > 0 ? 'High' : 
                entity.medium > 0 ? 'Medium' : 'Low'
    }));

    // Risk by jurisdiction
    const jurisdictionRiskMap = new Map();
    tasksWithRisk.forEach(task => {
      const entity = entities.find((e: any) => e.id === task.entityId);
      const jurisdiction = entity?.taxJurisdiction || 'Unknown';
      
      if (!jurisdictionRiskMap.has(jurisdiction)) {
        jurisdictionRiskMap.set(jurisdiction, {
          name: jurisdiction,
          riskScore: 0,
          taskCount: 0,
          criticalCount: 0
        });
      }
      
      const jurisdictionData = jurisdictionRiskMap.get(jurisdiction);
      jurisdictionData.taskCount++;
      jurisdictionData.riskScore += task.riskScore;
      if (task.riskLevel === 'Critical') jurisdictionData.criticalCount++;
    });

    const riskByJurisdiction = Array.from(jurisdictionRiskMap.values()).map((jurisdiction: any) => ({
      name: jurisdiction.name,
      averageRisk: Math.round(jurisdiction.riskScore / jurisdiction.taskCount),
      taskCount: jurisdiction.taskCount,
      criticalCount: jurisdiction.criticalCount
    }));

    // Risk trends (last 14 days)
    const riskTrends = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayTasks = tasksWithRisk.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate.toDateString() === date.toDateString();
      });

      const dayRisk = dayTasks.length > 0 ? 
        Math.round(dayTasks.reduce((sum, task) => sum + task.riskScore, 0) / dayTasks.length) : 0;

      riskTrends.push({
        date: format(date, 'MMM dd'),
        risk: dayRisk,
        tasks: dayTasks.length
      });
    }

    // Compliance risks (overdue compliance tasks)
    const complianceRisks = tasksWithRisk
      .filter(task => task.isOverdue && (task.complianceDeadline || task.taskType === 'Compliance'))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map(task => {
        const entity = entities.find((e: any) => e.id === task.entityId);
        const client = clients.find((c: any) => c.id === task.clientId);
        return {
          taskDetails: task.taskDetails,
          entityName: entity?.name || 'Unknown',
          clientName: client?.name || 'Unknown',
          dueDate: task.dueDate,
          daysPastDue: task.daysPastDue,
          riskLevel: task.riskLevel,
          riskScore: task.riskScore
        };
      });

    // Mitigation actions
    const mitigationActions = [
      {
        priority: 'Immediate',
        action: 'Address critical overdue compliance tasks',
        count: criticalRisks,
        impact: 'High'
      },
      {
        priority: 'This Week',
        action: 'Review high-risk tasks and allocate resources',
        count: highRisks,
        impact: 'Medium'
      },
      {
        priority: 'This Month',
        action: 'Implement process improvements for medium-risk areas',
        count: mediumRisks,
        impact: 'Medium'
      }
    ].filter(action => action.count > 0);

    return {
      overallRisk,
      criticalRisks,
      highRisks,
      mediumRisks,
      lowRisks,
      riskByEntity,
      riskByJurisdiction,
      riskTrends,
      complianceRisks,
      mitigationActions
    };
  }, [tasks, entities, clients, taskStatuses, filters]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF('risk-assessment-report', {
        title: 'Risk Assessment Report',
        subtitle: `Generated for ${filters.timeframe === 'all' ? 'All Time' : `Last ${filters.timeframe} Days`}`,
        reportType: 'RiskAssessment',
        filters: {
          timeframe: filters.timeframe,
          riskLevel: filters.riskLevel,
          entityType: filters.entityType,
          jurisdiction: filters.jurisdiction,
          complianceType: filters.complianceType,
          dateRange: filters.dateFrom && filters.dateTo ? `${format(filters.dateFrom, 'MMM dd, yyyy')} - ${format(filters.dateTo, 'MMM dd, yyyy')}` : 'N/A'
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <AppLayout title="Risk Assessment Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Risk Assessment Report</h1>
            <p className="text-muted-foreground">Identify and analyze potential compliance and operational risks</p>
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
              {/* Timeframe Filter */}
              <div className="space-y-2">
                <Label>Timeframe</Label>
                <Select value={filters.timeframe} onValueChange={(value) => setFilters(prev => ({ ...prev, timeframe: value }))}>
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

              {/* Risk Level Filter */}
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={filters.riskLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
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
              <div className="flex items-end col-span-2">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({
                    riskLevel: "all",
                    timeframe: "30",
                    entityType: "all",
                    jurisdiction: "all",
                    complianceType: "all",
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
        <div id="risk-assessment-report" className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Risk</CardTitle>
                <Shield className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{riskAnalysis.overallRisk}%</div>
                <Progress value={riskAnalysis.overallRisk} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Risks</CardTitle>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{riskAnalysis.criticalRisks}</div>
                <p className="text-xs text-muted-foreground">Immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risks</CardTitle>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{riskAnalysis.highRisks}</div>
                <p className="text-xs text-muted-foreground">Action required</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medium Risks</CardTitle>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{riskAnalysis.mediumRisks}</div>
                <p className="text-xs text-muted-foreground">Monitor closely</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Risks</CardTitle>
                <Target className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{riskAnalysis.lowRisks}</div>
                <p className="text-xs text-muted-foreground">Manageable</p>
              </CardContent>
            </Card>
          </div>

          {/* Critical Compliance Risks Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Critical Compliance Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Details</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Risk Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskAnalysis.complianceRisks.map((risk: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{risk.taskDetails}</TableCell>
                      <TableCell>{risk.entityName}</TableCell>
                      <TableCell>{risk.clientName}</TableCell>
                      <TableCell>{risk.dueDate ? format(new Date(risk.dueDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {risk.daysPastDue} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          risk.riskLevel === 'Critical' ? 'destructive' : 
                          risk.riskLevel === 'High' ? 'secondary' : 'default'
                        }>
                          {risk.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>{risk.riskScore}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Entity Risk Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Risk Analysis by Entity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Total Tasks</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>High</TableHead>
                    <TableHead>Medium</TableHead>
                    <TableHead>Low</TableHead>
                    <TableHead>Average Risk</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskAnalysis.riskByEntity.map((entity: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{entity.name}</TableCell>
                      <TableCell>{entity.totalTasks}</TableCell>
                      <TableCell>{entity.critical}</TableCell>
                      <TableCell>{entity.high}</TableCell>
                      <TableCell>{entity.medium}</TableCell>
                      <TableCell>{entity.low}</TableCell>
                      <TableCell>{entity.averageRisk}</TableCell>
                      <TableCell>
                        <Badge variant={
                          entity.riskLevel === 'Critical' ? 'destructive' : 
                          entity.riskLevel === 'High' ? 'secondary' : 
                          entity.riskLevel === 'Medium' ? 'outline' : 'default'
                        }>
                          {entity.riskLevel}
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
            {/* Risk Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: riskAnalysis.criticalRisks, color: '#ff4444' },
                        { name: 'High', value: riskAnalysis.highRisks, color: '#ff8800' },
                        { name: 'Medium', value: riskAnalysis.mediumRisks, color: '#ffaa00' },
                        { name: 'Low', value: riskAnalysis.lowRisks, color: '#88dd88' }
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { name: 'Critical', value: riskAnalysis.criticalRisks, color: '#ff4444' },
                        { name: 'High', value: riskAnalysis.highRisks, color: '#ff8800' },
                        { name: 'Medium', value: riskAnalysis.mediumRisks, color: '#ffaa00' },
                        { name: 'Low', value: riskAnalysis.lowRisks, color: '#88dd88' }
                      ].filter(item => item.value > 0).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Trends (Last 14 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskAnalysis.riskTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="risk" fill="#ff8800" name="Average Risk Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Jurisdiction Risk Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk by Jurisdiction</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskAnalysis.riskByJurisdiction}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="averageRisk" fill="#ff6600" name="Average Risk" />
                    <Bar dataKey="criticalCount" fill="#ff0000" name="Critical Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Mitigation Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended Mitigation Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskAnalysis.mitigationActions.map((action: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{action.action}</div>
                        <div className="text-sm text-muted-foreground">
                          Priority: {action.priority} • Impact: {action.impact}
                        </div>
                      </div>
                      <Badge variant={
                        action.priority === 'Immediate' ? 'destructive' : 
                        action.priority === 'This Week' ? 'secondary' : 'outline'
                      }>
                        {action.count} items
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}