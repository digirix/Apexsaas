import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  XCircle, 
  AlertCircle,
  Clock,
  TrendingUp,
  Filter,
  Download,
  Building,
  User
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';

export default function RiskAssessmentReport() {
  const [riskLevel, setRiskLevel] = React.useState("all");
  const [entityFilter, setEntityFilter] = React.useState("all");

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });

  const currentDate = new Date();
  const completedStatusId = taskStatuses?.find((s: any) => s.name === 'Completed')?.id;

  // Risk assessment analysis
  const riskAssessment = React.useMemo(() => {
    if (!tasks?.length) return { riskItems: [], summary: {} };

    const riskItems = tasks.map((task: any) => {
      const dueDate = new Date(task.dueDate);
      const complianceDeadline = task.complianceDeadline ? new Date(task.complianceDeadline) : null;
      const isCompleted = task.statusId === completedStatusId;
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilCompliance = complianceDeadline ? 
        Math.ceil((complianceDeadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

      let riskScore = 0;
      let riskLevel = 'Low';
      let riskFactors = [];

      if (!isCompleted) {
        // Regulatory deadline violations (highest risk)
        if (complianceDeadline && daysUntilCompliance < 0) {
          riskScore += 50;
          riskFactors.push('Regulatory deadline overdue');
        } else if (complianceDeadline && daysUntilCompliance <= 7) {
          riskScore += 25;
          riskFactors.push('Regulatory deadline approaching');
        }

        // Internal deadline violations
        if (daysUntilDue < 0) {
          riskScore += 20;
          riskFactors.push('Internal deadline overdue');
        } else if (daysUntilDue <= 3) {
          riskScore += 10;
          riskFactors.push('Internal deadline approaching');
        }

        // Task age risk
        const createdDate = new Date(task.createdAt);
        const ageInDays = Math.ceil((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        if (ageInDays > 30) {
          riskScore += 15;
          riskFactors.push('Long-standing task');
        } else if (ageInDays > 14) {
          riskScore += 8;
          riskFactors.push('Aging task');
        }

        // Compliance-related tasks have higher risk
        if (task.complianceDeadline || 
            task.taskDetails?.toLowerCase().includes('tax') || 
            task.taskDetails?.toLowerCase().includes('compliance') ||
            task.taskDetails?.toLowerCase().includes('audit')) {
          riskScore += 5;
          riskFactors.push('Compliance-related');
        }
      }

      // Determine risk level
      if (riskScore >= 80) riskLevel = 'Critical';
      else if (riskScore >= 60) riskLevel = 'High';
      else if (riskScore >= 40) riskLevel = 'Medium';
      else riskLevel = 'Low';

      // Get related data
      const assignee = users?.find((u: any) => u.id === task.assigneeId);
      const client = clients?.find((c: any) => c.id === task.clientId);
      const entity = entities?.find((e: any) => e.id === task.entityId);
      const status = taskStatuses?.find((s: any) => s.id === task.statusId);

      return {
        taskId: task.id,
        title: task.taskDetails || 'Untitled Task',
        assigneeName: assignee?.displayName || 'Unassigned',
        clientName: client?.displayName || 'Unknown Client',
        entityName: entity?.name || 'Unknown Entity',
        statusName: status?.name || 'Unknown',
        riskScore,
        riskLevel,
        riskFactors,
        dueDate,
        complianceDeadline,
        daysUntilDue,
        daysUntilCompliance,
        isCompleted,
        hasRegulatory: !!complianceDeadline
      };
    }).filter(item => item.riskScore > 0) // Only include items with risk
    .sort((a, b) => b.riskScore - a.riskScore);

    // Summary statistics
    const totalRiskItems = riskItems.length;
    const criticalRisk = riskItems.filter(item => item.riskLevel === 'Critical').length;
    const highRisk = riskItems.filter(item => item.riskLevel === 'High').length;
    const mediumRisk = riskItems.filter(item => item.riskLevel === 'Medium').length;
    const lowRisk = riskItems.filter(item => item.riskLevel === 'Low').length;

    const regulatoryViolations = riskItems.filter(item => 
      item.hasRegulatory && item.daysUntilCompliance < 0
    ).length;

    const avgRiskScore = totalRiskItems > 0 ? 
      Math.round(riskItems.reduce((sum, item) => sum + item.riskScore, 0) / totalRiskItems) : 0;

    const summary = {
      totalRiskItems,
      criticalRisk,
      highRisk,
      mediumRisk,
      lowRisk,
      regulatoryViolations,
      avgRiskScore
    };

    return { riskItems, summary };
  }, [tasks, taskStatuses, users, clients, entities, completedStatusId, currentDate]);

  // Entity risk analysis
  const entityRiskAnalysis = React.useMemo(() => {
    if (!entities?.length) return [];

    return entities.map((entity: any) => {
      const entityTasks = riskAssessment.riskItems.filter(item => item.entityName === entity.name);
      const totalRisk = entityTasks.reduce((sum, item) => sum + item.riskScore, 0);
      const avgRisk = entityTasks.length > 0 ? Math.round(totalRisk / entityTasks.length) : 0;
      const criticalItems = entityTasks.filter(item => item.riskLevel === 'Critical').length;

      const client = clients?.find((c: any) => c.id === entity.clientId);
      const country = countries?.find((c: any) => c.id === entity.countryId);

      return {
        entityId: entity.id,
        entityName: entity.name,
        clientName: client?.displayName || 'Unknown Client',
        country: country?.name || 'Unknown',
        totalRiskItems: entityTasks.length,
        avgRiskScore: avgRisk,
        criticalItems,
        riskLevel: avgRisk >= 80 ? 'Critical' : avgRisk >= 60 ? 'High' : avgRisk >= 40 ? 'Medium' : 'Low'
      };
    }).filter(entity => entity.totalRiskItems > 0)
    .sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  }, [entities, riskAssessment.riskItems, clients, countries]);

  // Chart data preparation
  const riskDistribution = [
    { name: 'Critical', value: riskAssessment.summary.criticalRisk, color: '#EF4444' },
    { name: 'High', value: riskAssessment.summary.highRisk, color: '#F97316' },
    { name: 'Medium', value: riskAssessment.summary.mediumRisk, color: '#EAB308' },
    { name: 'Low', value: riskAssessment.summary.lowRisk, color: '#22C55E' }
  ];

  const entityRiskChart = entityRiskAnalysis.slice(0, 10).map(entity => ({
    name: entity.entityName,
    riskScore: entity.avgRiskScore,
    criticalItems: entity.criticalItems
  }));

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
    <AppLayout title="Risk Assessment Report">
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Risk Assessment Report</h1>
              <p className="text-slate-600">Comprehensive risk analysis and violation tracking</p>
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
            <Shield className="h-4 w-4 text-slate-500" />
            <Select value={riskLevel} onValueChange={setRiskLevel}>
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
            <Building className="h-4 w-4 text-slate-500" />
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entities?.map((entity: any) => (
                  <SelectItem key={entity.id} value={entity.id.toString()}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Critical Alert */}
      {(riskAssessment.summary.criticalRisk > 0 || riskAssessment.summary.regulatoryViolations > 0) && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Critical Risk Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {riskAssessment.summary.criticalRisk > 0 && (
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{riskAssessment.summary.criticalRisk} critical risk item(s) require immediate attention</span>
                </div>
              )}
              {riskAssessment.summary.regulatoryViolations > 0 && (
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">{riskAssessment.summary.regulatoryViolations} regulatory violation(s) detected</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Total Risk Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {riskAssessment.summary.totalRiskItems}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {riskAssessment.summary.criticalRisk} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Average Risk Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {riskAssessment.summary.avgRiskScore}
            </div>
            <div className="mt-2">
              <Badge className={getRiskColor(
                riskAssessment.summary.avgRiskScore >= 80 ? 'Critical' :
                riskAssessment.summary.avgRiskScore >= 60 ? 'High' :
                riskAssessment.summary.avgRiskScore >= 40 ? 'Medium' : 'Low'
              )}>
                {riskAssessment.summary.avgRiskScore >= 80 ? 'Critical' :
                 riskAssessment.summary.avgRiskScore >= 60 ? 'High' :
                 riskAssessment.summary.avgRiskScore >= 40 ? 'Medium' : 'Low'} Risk
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Regulatory Violations</CardTitle>
              <XCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {riskAssessment.summary.regulatoryViolations}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Immediate action required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">High Risk Items</CardTitle>
              <AlertCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {riskAssessment.summary.highRisk}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Level Distribution</CardTitle>
            <CardDescription>Breakdown of items by risk severity</CardDescription>
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

        {/* Entity Risk Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Entity Risk Analysis</CardTitle>
            <CardDescription>Risk scores by entity (top 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={entityRiskChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="riskScore" fill="#EF4444" name="Risk Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment Details</CardTitle>
          <CardDescription>Detailed analysis of all risk items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 font-medium text-slate-600">Task</th>
                  <th className="text-left p-3 font-medium text-slate-600">Assignee</th>
                  <th className="text-left p-3 font-medium text-slate-600">Client/Entity</th>
                  <th className="text-left p-3 font-medium text-slate-600">Risk Score</th>
                  <th className="text-left p-3 font-medium text-slate-600">Risk Level</th>
                  <th className="text-left p-3 font-medium text-slate-600">Due Date</th>
                  <th className="text-left p-3 font-medium text-slate-600">Risk Factors</th>
                </tr>
              </thead>
              <tbody>
                {riskAssessment.riskItems.slice(0, 50).map((item, index) => (
                  <tr key={item.taskId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-medium text-slate-900 max-w-xs truncate">
                        {item.title}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{item.assigneeName}</td>
                    <td className="p-3">
                      <div className="text-slate-600">
                        <div className="font-medium">{item.clientName}</div>
                        <div className="text-sm text-slate-500">{item.entityName}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, item.riskScore)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900">{item.riskScore}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={getRiskColor(item.riskLevel)}>
                        {item.riskLevel}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-600">
                        {item.dueDate.toLocaleDateString()}
                        {item.daysUntilDue < 0 && (
                          <div className="text-red-600 text-sm">Overdue by {Math.abs(item.daysUntilDue)} days</div>
                        )}
                        {item.complianceDeadline && (
                          <div className="text-sm text-slate-500">
                            Compliance: {item.complianceDeadline.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {item.riskFactors.slice(0, 3).map((factor, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs mr-1">
                            {factor}
                          </Badge>
                        ))}
                        {item.riskFactors.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.riskFactors.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {riskAssessment.riskItems.length > 50 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-500">
                Showing 50 of {riskAssessment.riskItems.length} risk items
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}