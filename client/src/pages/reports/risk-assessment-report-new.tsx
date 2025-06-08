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
    country: "all",
    entityType: "all",
    taxJurisdiction: "all",
    client: "all",
    entity: "all",
    complianceType: "all"
  });

  const { exportToPDF } = usePDFExport();

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/countries"] });
  const { data: taxJurisdictions = [] } = useQuery({ queryKey: ["/api/v1/tax-jurisdictions"] });
  const { data: entityTypes = [] } = useQuery({ queryKey: ["/api/v1/entity-types"] });

  // Filter dependencies
  const filteredTaxJurisdictions = useMemo(() => {
    if (filters.country === "all") return taxJurisdictions;
    return (taxJurisdictions as any[]).filter((tj: any) => tj.countryId === parseInt(filters.country));
  }, [taxJurisdictions, filters.country]);

  const filteredEntityTypes = useMemo(() => {
    if (filters.country === "all") return entityTypes;
    return (entityTypes as any[]).filter((et: any) => et.countryId === parseInt(filters.country));
  }, [entityTypes, filters.country]);

  const filteredClients = useMemo(() => {
    if (filters.country === "all") return clients;
    return (clients as any[]).filter((c: any) => c.countryId === parseInt(filters.country));
  }, [clients, filters.country]);

  const filteredEntities = useMemo(() => {
    if (filters.client === "all") return entities;
    return (entities as any[]).filter((e: any) => e.clientId === parseInt(filters.client));
  }, [entities, filters.client]);

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
    const completedStatusId = (taskStatuses as any[]).find((s: any) => s.name === 'Completed')?.id;

    // Filter tasks based on criteria
    const filteredTasks = (tasks as any[]).filter((task: any) => {
      // Timeframe filtering
      if (filters.timeframe !== "all") {
        const taskDate = new Date(task.createdAt);
        const days = parseInt(filters.timeframe);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        if (taskDate < cutoffDate) return false;
      }

      // Country filtering
      if (filters.country !== "all") {
        const client = (clients as any[]).find((c: any) => c.id === task.clientId);
        if (!client || client.countryId !== parseInt(filters.country)) return false;
      }

      // Client filtering
      if (filters.client !== "all") {
        if (task.clientId !== parseInt(filters.client)) return false;
      }

      // Entity filtering
      if (filters.entity !== "all") {
        if (task.entityId !== parseInt(filters.entity)) return false;
      }

      // Entity type filtering
      if (filters.entityType !== "all") {
        const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
        if (!entity || entity.entityTypeId !== parseInt(filters.entityType)) return false;
      }

      // Tax jurisdiction filtering
      if (filters.taxJurisdiction !== "all") {
        const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
        if (!entity || entity.taxJurisdictionId !== parseInt(filters.taxJurisdiction)) return false;
      }

      return true;
    });

    // Calculate risk levels for each task
    const tasksWithRisk = filteredTasks.map((task: any) => {
      let riskScore = 0;
      const taskDate = new Date(task.createdAt);
      const daysOld = Math.floor((currentDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Risk factors
      if (task.statusId !== completedStatusId) {
        riskScore += 20; // Incomplete tasks have base risk
        
        // Overdue risk
        if (task.complianceDeadline) {
          const deadline = new Date(task.complianceDeadline);
          if (deadline < currentDate) {
            const daysOverdue = Math.floor((currentDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
            riskScore += Math.min(daysOverdue * 5, 50); // Max 50 points for overdue
          }
        }
        
        // Age risk
        riskScore += Math.min(daysOld * 0.5, 30); // Max 30 points for age
      }

      // Determine risk level
      let riskLevel = 'low';
      if (riskScore >= 70) riskLevel = 'critical';
      else if (riskScore >= 50) riskLevel = 'high';
      else if (riskScore >= 30) riskLevel = 'medium';

      return { ...task, riskScore, riskLevel };
    });

    // Filter by risk level if specified
    const finalTasks = filters.riskLevel === "all" 
      ? tasksWithRisk 
      : tasksWithRisk.filter(task => task.riskLevel === filters.riskLevel);

    // Calculate metrics
    const criticalRisks = tasksWithRisk.filter(t => t.riskLevel === 'critical').length;
    const highRisks = tasksWithRisk.filter(t => t.riskLevel === 'high').length;
    const mediumRisks = tasksWithRisk.filter(t => t.riskLevel === 'medium').length;
    const lowRisks = tasksWithRisk.filter(t => t.riskLevel === 'low').length;
    const totalRisks = criticalRisks + highRisks + mediumRisks + lowRisks;
    const overallRisk = totalRisks > 0 ? ((criticalRisks * 4 + highRisks * 3 + mediumRisks * 2 + lowRisks * 1) / (totalRisks * 4)) * 100 : 0;

    // Risk by entity
    const riskByEntity = Object.entries(
      finalTasks.reduce((acc: any, task: any) => {
        const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
        const entityName = entity?.name || 'Unknown';
        if (!acc[entityName]) acc[entityName] = { critical: 0, high: 0, medium: 0, low: 0 };
        acc[entityName][task.riskLevel]++;
        return acc;
      }, {})
    ).map(([name, risks]) => ({ name, ...risks }));

    // Risk by jurisdiction
    const riskByJurisdiction = Object.entries(
      finalTasks.reduce((acc: any, task: any) => {
        const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
        const jurisdiction = (taxJurisdictions as any[]).find((tj: any) => tj.id === entity?.taxJurisdictionId);
        const jurisdictionName = jurisdiction?.name || 'Unknown';
        if (!acc[jurisdictionName]) acc[jurisdictionName] = { critical: 0, high: 0, medium: 0, low: 0 };
        acc[jurisdictionName][task.riskLevel]++;
        return acc;
      }, {})
    ).map(([name, risks]) => ({ name, ...risks }));

    return {
      overallRisk,
      criticalRisks,
      highRisks,
      mediumRisks,
      lowRisks,
      riskByEntity: riskByEntity.slice(0, 10),
      riskByJurisdiction: riskByJurisdiction.slice(0, 10),
      riskTrends: [],
      complianceRisks: finalTasks.slice(0, 20),
      mitigationActions: []
    };
  }, [tasks, entities, clients, taskStatuses, taxJurisdictions, filters]);

  const handleExportPDF = () => {
    exportToPDF('risk-assessment-report', 'Risk Assessment Report');
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
          <div className="flex items-center gap-2">
            <AIInsightsPanel 
              reportType="risk-assessment" 
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
              
              {/* Timeframe Filter */}
              <Select value={filters.timeframe} onValueChange={(value) => setFilters(prev => ({ ...prev, timeframe: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              {/* Risk Level Filter */}
              <Select value={filters.riskLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
                  <SelectValue placeholder="Country" />
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

              {/* Entity Type Filter */}
              <Select value={filters.entityType} onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue placeholder="Entity Type" />
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

              {/* Tax Jurisdiction Filter */}
              <Select value={filters.taxJurisdiction} onValueChange={(value) => setFilters(prev => ({ ...prev, taxJurisdiction: value }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue placeholder="Tax Jurisdiction" />
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

              {/* Client Filter */}
              <Select value={filters.client} onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                client: value,
                entity: "all"
              }))}>
                <SelectTrigger className="h-6 w-20 text-xs border-gray-300">
                  <SelectValue placeholder="Client" />
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
                  <SelectValue placeholder="Entity" />
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

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  riskLevel: "all",
                  timeframe: "30",
                  country: "all",
                  entityType: "all",
                  taxJurisdiction: "all",
                  client: "all",
                  entity: "all",
                  complianceType: "all"
                })}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Risk Score Cards - Half Height */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <div className="space-y-1">
                  <p className="text-xs font-medium leading-none">Overall Risk</p>
                  <p className="text-lg font-bold">{riskAnalysis.overallRisk.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-red-600" />
                <div className="space-y-1">
                  <p className="text-xs font-medium leading-none">Critical Risks</p>
                  <p className="text-lg font-bold text-red-600">{riskAnalysis.criticalRisks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-orange-500" />
                <div className="space-y-1">
                  <p className="text-xs font-medium leading-none">High Risks</p>
                  <p className="text-lg font-bold text-orange-500">{riskAnalysis.highRisks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-500" />
                <div className="space-y-1">
                  <p className="text-xs font-medium leading-none">Total Risks</p>
                  <p className="text-lg font-bold">{riskAnalysis.criticalRisks + riskAnalysis.highRisks + riskAnalysis.mediumRisks + riskAnalysis.lowRisks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Risk Assessment Details
            </CardTitle>
            <CardDescription>Detailed risk analysis for compliance tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Details</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Compliance Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskAnalysis.complianceRisks.map((task: any) => {
                  const client = (clients as any[]).find((c: any) => c.id === task.clientId);
                  const entity = (entities as any[]).find((e: any) => e.id === task.entityId);
                  
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium max-w-48 truncate">
                        {task.taskDetails || 'No details'}
                      </TableCell>
                      <TableCell>{client?.displayName || 'Unknown'}</TableCell>
                      <TableCell>{entity?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          task.riskLevel === "critical" ? "destructive" :
                          task.riskLevel === "high" ? "destructive" :
                          task.riskLevel === "medium" ? "secondary" : "outline"
                        }>
                          {task.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={task.riskScore} className="w-16 h-2" />
                          <span className="text-sm">{task.riskScore.toFixed(0)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.complianceDeadline ? new Date(task.complianceDeadline).toLocaleDateString() : 'No deadline'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Risk Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk by Entity */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution by Entity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskAnalysis.riskByEntity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="critical" stackId="a" fill="#dc2626" />
                  <Bar dataKey="high" stackId="a" fill="#ea580c" />
                  <Bar dataKey="medium" stackId="a" fill="#ca8a04" />
                  <Bar dataKey="low" stackId="a" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Risk by Jurisdiction */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution by Jurisdiction</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskAnalysis.riskByJurisdiction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="critical" stackId="a" fill="#dc2626" />
                  <Bar dataKey="high" stackId="a" fill="#ea580c" />
                  <Bar dataKey="medium" stackId="a" fill="#ca8a04" />
                  <Bar dataKey="low" stackId="a" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}