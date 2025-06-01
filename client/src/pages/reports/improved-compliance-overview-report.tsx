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
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Globe,
  Building,
  Filter,
  Download,
  Calendar,
  Search,
  TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function ComplianceOverviewReport() {
  // Filter states
  const [selectedJurisdiction, setSelectedJurisdiction] = React.useState("all");
  const [selectedEntity, setSelectedEntity] = React.useState("all");
  const [complianceType, setComplianceType] = React.useState("all");
  const [riskLevel, setRiskLevel] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });

  const currentDate = new Date();
  const completedStatusId = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.name === 'Completed')?.id : null;
  const pendingStatusId = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.name === 'Pending')?.id : null;
  const inProgressStatusId = Array.isArray(taskStatuses) ? taskStatuses.find((s: any) => s.name === 'In Progress')?.id : null;

  // Identify compliance tasks
  const complianceTasks = React.useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    
    return tasks.filter((task: any) => 
      task.complianceDeadline || 
      task.taskDetails?.toLowerCase().includes('tax') || 
      task.taskDetails?.toLowerCase().includes('compliance') ||
      task.taskDetails?.toLowerCase().includes('filing') ||
      task.taskDetails?.toLowerCase().includes('return') ||
      task.taskDetails?.toLowerCase().includes('audit') ||
      task.taskDetails?.toLowerCase().includes('vat')
    );
  }, [tasks]);

  // Filter compliance tasks based on criteria
  const filteredTasks = React.useMemo(() => {
    return complianceTasks.filter((task: any) => {
      // Jurisdiction filter
      if (selectedJurisdiction !== "all") {
        const taskEntity = Array.isArray(entities) ? entities.find((e: any) => e.id === task.entityId) : null;
        if (!taskEntity || taskEntity.countryId !== parseInt(selectedJurisdiction)) {
          return false;
        }
      }

      // Entity filter
      if (selectedEntity !== "all" && task.entityId !== parseInt(selectedEntity)) {
        return false;
      }

      // Search filter
      if (searchTerm && !task.taskDetails?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [complianceTasks, selectedJurisdiction, selectedEntity, searchTerm, entities]);

  // Compliance metrics calculation
  const complianceMetrics = React.useMemo(() => {
    if (!Array.isArray(filteredTasks)) return {
      totalCompliance: 0,
      completedCompliance: 0,
      overdueRegulatory: 0,
      upcomingDeadlines: 0,
      complianceRate: 0,
      riskScore: 0,
      entitiesAtRisk: []
    };

    const completedTasks = filteredTasks.filter((task: any) => task.statusId === completedStatusId);
    const totalCompliance = filteredTasks.length;

    // Calculate overdue regulatory tasks
    const overdueRegulatory = filteredTasks.filter((task: any) => {
      if (!task.complianceDeadline || task.statusId === completedStatusId) return false;
      const complianceDate = new Date(task.complianceDeadline);
      return complianceDate < currentDate;
    });

    // Calculate upcoming deadlines (next 30 days)
    const upcomingDeadlines = filteredTasks.filter((task: any) => {
      if (task.statusId === completedStatusId) return false;
      
      const dueDate = task.complianceDeadline ? new Date(task.complianceDeadline) : new Date(task.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilDue >= 0 && daysUntilDue <= 30;
    });

    const complianceRate = totalCompliance > 0 ? Math.round((completedTasks.length / totalCompliance) * 100) : 0;

    // Calculate risk score
    let riskScore = 0;
    if (overdueRegulatory.length > 0) riskScore += overdueRegulatory.length * 50;
    if (upcomingDeadlines.length > 0) riskScore += upcomingDeadlines.length * 10;
    riskScore = Math.min(100, riskScore);

    // Entities at risk analysis
    const entitiesAtRisk = Array.isArray(entities) ? entities.map((entity: any) => {
      const entityTasks = filteredTasks.filter((task: any) => task.entityId === entity.id);
      const entityOverdue = entityTasks.filter((task: any) => {
        if (!task.complianceDeadline || task.statusId === completedStatusId) return false;
        const complianceDate = new Date(task.complianceDeadline);
        return complianceDate < currentDate;
      });
      
      const client = Array.isArray(clients) ? clients.find((c: any) => c.id === entity.clientId) : null;
      const country = Array.isArray(countries) ? countries.find((c: any) => c.id === entity.countryId) : null;

      return {
        entityId: entity.id,
        entityName: entity.name,
        clientName: client?.displayName || 'Unknown',
        jurisdiction: country?.name || 'Unknown',
        totalTasks: entityTasks.length,
        overdueCount: entityOverdue.length,
        riskLevel: entityOverdue.length > 2 ? 'Critical' : 
                  entityOverdue.length > 0 ? 'High' : 'Low'
      };
    }).filter((entity: any) => entity.totalTasks > 0) : [];

    return {
      totalCompliance: totalCompliance,
      completedCompliance: completedTasks.length,
      overdueRegulatory: overdueRegulatory.length,
      upcomingDeadlines: upcomingDeadlines.length,
      complianceRate,
      riskScore,
      entitiesAtRisk
    };
  }, [filteredTasks, completedStatusId, currentDate, entities, clients, countries]);

  // Chart data
  const complianceStatusData = React.useMemo(() => {
    if (!Array.isArray(taskStatuses)) return [];
    
    return taskStatuses.map((status: any) => ({
      name: status.name,
      value: filteredTasks.filter((task: any) => task.statusId === status.id).length,
      color: status.name === 'Completed' ? '#22C55E' : 
             status.name === 'In Progress' ? '#3B82F6' : 
             status.name === 'Pending' ? '#EAB308' : '#EF4444'
    })).filter((item: any) => item.value > 0);
  }, [filteredTasks, taskStatuses]);

  const jurisdictionComplianceData = React.useMemo(() => {
    if (!Array.isArray(countries) || !Array.isArray(entities)) return [];
    
    return countries.map((country: any) => {
      const countryEntities = entities.filter((e: any) => e.countryId === country.id);
      const countryTasks = filteredTasks.filter((task: any) => 
        countryEntities.some((entity: any) => entity.id === task.entityId)
      );
      const countryCompleted = countryTasks.filter((task: any) => task.statusId === completedStatusId);
      
      return {
        name: country.name,
        total: countryTasks.length,
        completed: countryCompleted.length,
        rate: countryTasks.length > 0 ? Math.round((countryCompleted.length / countryTasks.length) * 100) : 0
      };
    }).filter((item: any) => item.total > 0);
  }, [countries, entities, filteredTasks, completedStatusId]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <ReportsLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Compliance Overview</h1>
            <p className="text-slate-600">Comprehensive compliance monitoring and regulatory tracking</p>
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

        {/* Critical Alerts */}
        {complianceMetrics.overdueRegulatory > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-900">Critical Compliance Alert</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-red-800">
                {complianceMetrics.overdueRegulatory} regulatory deadlines have been missed. 
                Immediate action required to ensure compliance.
              </p>
            </CardContent>
          </Card>
        )}

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
                <label className="text-sm font-medium">Jurisdiction</label>
                <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
                  <SelectTrigger>
                    <SelectValue placeholder="All jurisdictions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All jurisdictions</SelectItem>
                    {Array.isArray(countries) && countries.map((country: any) => (
                      <SelectItem key={country.id} value={country.id.toString()}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Entity</label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entities</SelectItem>
                    {Array.isArray(entities) && entities.map((entity: any) => (
                      <SelectItem key={entity.id} value={entity.id.toString()}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Compliance Type</label>
                <Select value={complianceType} onValueChange={setComplianceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="tax">Tax compliance</SelectItem>
                    <SelectItem value="filing">Filing requirements</SelectItem>
                    <SelectItem value="audit">Audit compliance</SelectItem>
                    <SelectItem value="vat">VAT compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search Tasks</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search compliance tasks..."
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
                    setSelectedJurisdiction("all");
                    setSelectedEntity("all");
                    setComplianceType("all");
                    setRiskLevel("all");
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
                <CardTitle className="text-sm font-medium text-slate-600">Total Compliance Tasks</CardTitle>
                <Shield className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{complianceMetrics.totalCompliance}</div>
              <p className="text-sm text-slate-500">
                {complianceMetrics.completedCompliance} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Compliance Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{complianceMetrics.complianceRate}%</div>
              <Progress value={complianceMetrics.complianceRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Regulatory Violations</CardTitle>
                <AlertTriangle className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{complianceMetrics.overdueRegulatory}</div>
              <p className="text-sm text-slate-500">overdue deadlines</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Upcoming Deadlines</CardTitle>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{complianceMetrics.upcomingDeadlines}</div>
              <p className="text-sm text-slate-500">next 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts - Compact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Status Distribution</CardTitle>
              <CardDescription>Current compliance task status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={complianceStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {complianceStatusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jurisdiction Compliance Rates</CardTitle>
              <CardDescription>Compliance performance by jurisdiction</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={jurisdictionComplianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#3B82F6" name="Compliance Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Entities at Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Entities Compliance Status
            </CardTitle>
            <CardDescription>Entity-level compliance risk assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 font-medium text-slate-600">Entity</th>
                    <th className="text-left p-3 font-medium text-slate-600">Client</th>
                    <th className="text-left p-3 font-medium text-slate-600">Jurisdiction</th>
                    <th className="text-left p-3 font-medium text-slate-600">Total Tasks</th>
                    <th className="text-left p-3 font-medium text-slate-600">Overdue</th>
                    <th className="text-left p-3 font-medium text-slate-600">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceMetrics.entitiesAtRisk.map((entity: any) => (
                    <tr key={entity.entityId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{entity.entityName}</div>
                      </td>
                      <td className="p-3 text-slate-600">{entity.clientName}</td>
                      <td className="p-3 text-slate-600">{entity.jurisdiction}</td>
                      <td className="p-3 text-slate-600">{entity.totalTasks}</td>
                      <td className="p-3">
                        {entity.overdueCount > 0 ? (
                          <Badge className="bg-red-100 text-red-800">
                            {entity.overdueCount}
                          </Badge>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={getRiskColor(entity.riskLevel)}>
                          {entity.riskLevel}
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