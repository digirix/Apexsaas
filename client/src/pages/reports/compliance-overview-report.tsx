import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Shield, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  MapPin,
  Building
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function ComplianceOverviewReport() {
  const [jurisdictionFilter, setJurisdictionFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [timeFrame, setTimeFrame] = React.useState("30");

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });

  const currentDate = new Date();
  const completedStatusId = taskStatuses?.find((s: any) => s.name.toLowerCase() === 'completed')?.id;
  const pendingStatusId = taskStatuses?.find((s: any) => s.name.toLowerCase() === 'pending')?.id;
  const inProgressStatusId = taskStatuses?.find((s: any) => s.name.toLowerCase() === 'in progress')?.id;

  // Compliance analysis
  const complianceAnalysis = React.useMemo(() => {
    // Identify compliance tasks based on complianceDeadline field and task titles
    const complianceTasks = tasks?.filter((task: any) => 
      task.complianceDeadline || 
      task.taskDetails?.toLowerCase().includes('tax') || 
      task.taskDetails?.toLowerCase().includes('compliance') ||
      task.taskDetails?.toLowerCase().includes('filing') ||
      task.taskDetails?.toLowerCase().includes('return') ||
      task.taskDetails?.toLowerCase().includes('audit') ||
      task.taskDetails?.toLowerCase().includes('vat')
    ) || [];

    const totalComplianceTasks = complianceTasks.length;
    const completedComplianceTasks = complianceTasks.filter((task: any) => task.statusId === completedStatusId).length;
    const pendingComplianceTasks = complianceTasks.filter((task: any) => task.statusId === pendingStatusId).length;
    const inProgressComplianceTasks = complianceTasks.filter((task: any) => task.statusId === inProgressStatusId).length;

    // Risk assessment based on deadlines
    const overdueRegulatory = complianceTasks.filter((task: any) => {
      if (!task.complianceDeadline) return false;
      const deadline = new Date(task.complianceDeadline);
      return deadline < currentDate && task.statusId !== completedStatusId;
    });

    const overdueInternal = complianceTasks.filter((task: any) => {
      const dueDate = new Date(task.dueDate);
      return dueDate < currentDate && task.statusId !== completedStatusId && !overdueRegulatory.some(t => t.id === task.id);
    });

    const upcomingCritical = complianceTasks.filter((task: any) => {
      if (task.statusId === completedStatusId) return false;
      
      const dueDate = new Date(task.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (task.complianceDeadline) {
        const complianceDate = new Date(task.complianceDeadline);
        const daysUntilCompliance = Math.ceil((complianceDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilCompliance >= 0 && daysUntilCompliance <= 7;
      }
      
      return daysUntilDue >= 0 && daysUntilDue <= 3;
    });

    // Calculate compliance rate
    const complianceRate = totalComplianceTasks > 0 ? Math.round((completedComplianceTasks / totalComplianceTasks) * 100) : 0;

    // Risk scoring (0-100, higher = more risk)
    let riskScore = 0;
    if (overdueRegulatory.length > 0) riskScore += overdueRegulatory.length * 50;
    if (overdueInternal.length > 0) riskScore += overdueInternal.length * 20;
    if (upcomingCritical.length > 0) riskScore += upcomingCritical.length * 15;

    riskScore = Math.min(100, riskScore);

    return {
      totalComplianceTasks,
      completedComplianceTasks,
      pendingComplianceTasks,
      inProgressComplianceTasks,
      complianceRate,
      riskScore,
      overdueRegulatory,
      overdueInternal,
      upcomingCritical,
      complianceTasks
    };
  }, [tasks, completedStatusId, pendingStatusId, inProgressStatusId, currentDate]);

  // Entity-based compliance tracking
  const entityCompliance = React.useMemo(() => {
    if (!entities?.length || !complianceAnalysis.complianceTasks.length) return [];

    return entities.map((entity: any) => {
      const entityTasks = complianceAnalysis.complianceTasks.filter((task: any) => task.entityId === entity.id);
      const completedTasks = entityTasks.filter((task: any) => task.statusId === completedStatusId);
      const overdueTasks = entityTasks.filter((task: any) => {
        const dueDate = new Date(task.dueDate);
        return dueDate < currentDate && task.statusId !== completedStatusId;
      });

      const client = clients?.find((c: any) => c.id === entity.clientId);
      const country = countries?.find((c: any) => c.id === entity.countryId);

      let riskScore = 0;
      entityTasks.forEach((task: any) => {
        if (task.complianceDeadline) {
          const complianceDate = new Date(task.complianceDeadline);
          const daysUntilCompliance = Math.ceil((complianceDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilCompliance < 0 && task.statusId !== completedStatusId) riskScore += 50;
          else if (daysUntilCompliance <= 7 && task.statusId !== completedStatusId) riskScore += 25;
        } else {
          const dueDate = new Date(task.dueDate);
          const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue < 0 && task.statusId !== completedStatusId) riskScore += 20;
          else if (daysUntilDue <= 3 && task.statusId !== completedStatusId) riskScore += 10;
        }
      });

      return {
        entityId: entity.id,
        entityName: entity.name,
        clientName: client?.displayName || 'Unknown Client',
        country: country?.name || 'Unknown',
        totalTasks: entityTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        riskScore: Math.min(100, riskScore),
        complianceRate: entityTasks.length > 0 ? Math.round((completedTasks.length / entityTasks.length) * 100) : 0
      };
    }).filter((entity: any) => entity.totalTasks > 0)
    .sort((a: any, b: any) => b.riskScore - a.riskScore);
  }, [entities, complianceAnalysis.complianceTasks, completedStatusId, currentDate, clients, countries]);

  // Jurisdiction-based analysis
  const jurisdictionAnalysis = React.useMemo(() => {
    return countries?.map((country: any) => {
      const countryEntities = entities?.filter((e: any) => e.countryId === country.id) || [];
      const countryTasks = complianceAnalysis.complianceTasks.filter((task: any) => 
        countryEntities.some((entity: any) => entity.id === task.entityId)
      );

      const completedTasks = countryTasks.filter((task: any) => task.statusId === completedStatusId);
      const overdueTasks = countryTasks.filter((task: any) => {
        const dueDate = new Date(task.dueDate);
        return dueDate < currentDate && task.statusId !== completedStatusId;
      });

      return {
        country: country.name,
        totalEntities: countryEntities.length,
        totalTasks: countryTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        complianceRate: countryTasks.length > 0 ? Math.round((completedTasks.length / countryTasks.length) * 100) : 0
      };
    }).filter((j: any) => j.totalTasks > 0) || [];
  }, [countries, entities, complianceAnalysis.complianceTasks, completedStatusId, currentDate]);

  // Chart data preparation
  const riskDistribution = [
    { 
      name: 'Critical Risk (80+)', 
      value: entityCompliance.filter(e => e.riskScore >= 80).length, 
      color: '#EF4444' 
    },
    { 
      name: 'High Risk (60-79)', 
      value: entityCompliance.filter(e => e.riskScore >= 60 && e.riskScore < 80).length, 
      color: '#F97316' 
    },
    { 
      name: 'Medium Risk (40-59)', 
      value: entityCompliance.filter(e => e.riskScore >= 40 && e.riskScore < 60).length, 
      color: '#EAB308' 
    },
    { 
      name: 'Low Risk (<40)', 
      value: entityCompliance.filter(e => e.riskScore < 40).length, 
      color: '#22C55E' 
    }
  ];

  const complianceStatusData = [
    { name: 'Completed', value: complianceAnalysis.completedComplianceTasks, color: '#22C55E' },
    { name: 'In Progress', value: complianceAnalysis.inProgressComplianceTasks, color: '#3B82F6' },
    { name: 'Pending', value: complianceAnalysis.pendingComplianceTasks, color: '#EAB308' }
  ];

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Compliance Overview</h1>
              <p className="text-slate-600">Monitor regulatory deadlines and compliance risk assessment</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All jurisdictions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jurisdictions</SelectItem>
                {countries.map((country: any) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All risk levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <Select value={timeFrame} onValueChange={setTimeFrame}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
                <SelectItem value="365">Next year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Alert Section */}
      {(complianceAnalysis.overdueRegulatory.length > 0 || complianceAnalysis.upcomingCritical.length > 0) && (
        <div className="mb-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-900">Compliance Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {complianceAnalysis.overdueRegulatory.length > 0 && (
                  <div className="flex items-center gap-2 text-red-800">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">{complianceAnalysis.overdueRegulatory.length} regulatory deadline(s) overdue</span>
                  </div>
                )}
                {complianceAnalysis.upcomingCritical.length > 0 && (
                  <div className="flex items-center gap-2 text-orange-800">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{complianceAnalysis.upcomingCritical.length} critical deadline(s) approaching</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Total Compliance Tasks</CardTitle>
              <Building className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {complianceAnalysis.totalComplianceTasks}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {complianceAnalysis.completedComplianceTasks} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Compliance Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {complianceAnalysis.complianceRate}%
            </div>
            <Progress value={complianceAnalysis.complianceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Risk Score</CardTitle>
              <Shield className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {complianceAnalysis.riskScore}
            </div>
            <div className="mt-2">
              <Badge className={getRiskColor(complianceAnalysis.riskScore)}>
                {getRiskLevel(complianceAnalysis.riskScore)} Risk
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Overdue Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {complianceAnalysis.overdueRegulatory.length + complianceAnalysis.overdueInternal.length}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {complianceAnalysis.overdueRegulatory.length} regulatory, {complianceAnalysis.overdueInternal.length} internal
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Compliance Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Task Status</CardTitle>
            <CardDescription>Distribution of compliance tasks by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={complianceStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {complianceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Entities categorized by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Jurisdiction Analysis */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Jurisdiction Compliance Analysis</CardTitle>
          <CardDescription>Compliance performance by jurisdiction</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={jurisdictionAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="country" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalTasks" fill="#64748B" name="Total Tasks" />
              <Bar dataKey="completedTasks" fill="#22C55E" name="Completed" />
              <Bar dataKey="overdueTasks" fill="#EF4444" name="Overdue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Entity Compliance Details */}
      <Card>
        <CardHeader>
          <CardTitle>Entity Compliance Details</CardTitle>
          <CardDescription>Detailed compliance status for each entity</CardDescription>
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
                  <th className="text-left p-3 font-medium text-slate-600">Completed</th>
                  <th className="text-left p-3 font-medium text-slate-600">Overdue</th>
                  <th className="text-left p-3 font-medium text-slate-600">Compliance Rate</th>
                  <th className="text-left p-3 font-medium text-slate-600">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {entityCompliance.map((entity, index) => (
                  <tr key={entity.entityId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{entity.entityName}</div>
                    </td>
                    <td className="p-3 text-slate-600">{entity.clientName}</td>
                    <td className="p-3 text-slate-600">{entity.country}</td>
                    <td className="p-3 text-slate-600">{entity.totalTasks}</td>
                    <td className="p-3 text-slate-600">{entity.completedTasks}</td>
                    <td className="p-3">
                      {entity.overdueTasks > 0 ? (
                        <Badge className="bg-red-100 text-red-800">
                          {entity.overdueTasks}
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
                            style={{ width: `${entity.complianceRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-600">{entity.complianceRate}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={getRiskColor(entity.riskScore)}>
                        {getRiskLevel(entity.riskScore)}
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
  );
}