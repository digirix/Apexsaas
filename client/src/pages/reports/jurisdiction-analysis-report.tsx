import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  PieChart as PieChartIcon, 
  MapPin, 
  Building, 
  TrendingUp,
  Globe,
  CheckCircle,
  AlertTriangle,
  Filter,
  Download,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function JurisdictionAnalysisReport() {
  const [selectedJurisdiction, setSelectedJurisdiction] = React.useState("all");
  const [complianceFilter, setComplianceFilter] = React.useState("all");

  // Fetch data
  const { data: tasks = [] } = useQuery({ queryKey: ["/api/v1/tasks"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: countries = [] } = useQuery({ queryKey: ["/api/v1/setup/countries"] });

  const completedStatusId = taskStatuses?.find((s: any) => s.name === 'Completed')?.id;
  const currentDate = new Date();

  // Jurisdiction analysis
  const jurisdictionAnalysis = React.useMemo(() => {
    if (!countries?.length || !entities?.length) return { jurisdictions: [], summary: {} };

    // Identify compliance tasks
    const complianceTasks = tasks?.filter((task: any) => 
      task.complianceDeadline || 
      task.taskDetails?.toLowerCase().includes('tax') || 
      task.taskDetails?.toLowerCase().includes('compliance') ||
      task.taskDetails?.toLowerCase().includes('filing') ||
      task.taskDetails?.toLowerCase().includes('return') ||
      task.taskDetails?.toLowerCase().includes('audit') ||
      task.taskDetails?.toLowerCase().includes('vat')
    ) || [];

    const jurisdictions = countries.map((country: any) => {
      const countryEntities = entities.filter((e: any) => e.countryId === country.id);
      const countryTasks = complianceTasks.filter((task: any) => 
        countryEntities.some((entity: any) => entity.id === task.entityId)
      );

      const completedTasks = countryTasks.filter((task: any) => task.statusId === completedStatusId);
      const pendingTasks = countryTasks.filter((task: any) => task.statusId !== completedStatusId);
      
      // Calculate overdue tasks
      const overdueTasks = pendingTasks.filter((task: any) => {
        const dueDate = new Date(task.dueDate);
        return dueDate < currentDate;
      });

      // Calculate regulatory overdue tasks
      const regulatoryOverdue = pendingTasks.filter((task: any) => {
        if (!task.complianceDeadline) return false;
        const complianceDate = new Date(task.complianceDeadline);
        return complianceDate < currentDate;
      });

      // Calculate upcoming deadlines
      const upcomingDeadlines = pendingTasks.filter((task: any) => {
        const dueDate = new Date(task.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (task.complianceDeadline) {
          const complianceDate = new Date(task.complianceDeadline);
          const daysUntilCompliance = Math.ceil((complianceDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilCompliance >= 0 && daysUntilCompliance <= 30;
        }
        
        return daysUntilDue >= 0 && daysUntilDue <= 30;
      });

      // Calculate compliance rate
      const complianceRate = countryTasks.length > 0 ? 
        Math.round((completedTasks.length / countryTasks.length) * 100) : 0;

      // Risk assessment
      let riskScore = 0;
      if (regulatoryOverdue.length > 0) riskScore += regulatoryOverdue.length * 30;
      if (overdueTasks.length > 0) riskScore += overdueTasks.length * 15;
      if (upcomingDeadlines.length > 0) riskScore += upcomingDeadlines.length * 5;
      
      riskScore = Math.min(100, riskScore);

      const riskLevel = riskScore >= 80 ? 'Critical' : 
                      riskScore >= 60 ? 'High' : 
                      riskScore >= 40 ? 'Medium' : 'Low';

      // Calculate average completion time for this jurisdiction
      const completedTasksWithTime = completedTasks.filter((task: any) => task.updatedAt);
      const avgCompletionTime = completedTasksWithTime.length > 0 ? 
        Math.round(completedTasksWithTime.reduce((sum: number, task: any) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.updatedAt);
          return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / completedTasksWithTime.length) : 0;

      return {
        countryId: country.id,
        countryName: country.name,
        totalEntities: countryEntities.length,
        totalTasks: countryTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        regulatoryOverdue: regulatoryOverdue.length,
        upcomingDeadlines: upcomingDeadlines.length,
        complianceRate,
        riskScore,
        riskLevel,
        avgCompletionTime,
        entities: countryEntities.map((entity: any) => {
          const entityTasks = countryTasks.filter((task: any) => task.entityId === entity.id);
          const entityCompleted = entityTasks.filter((task: any) => task.statusId === completedStatusId);
          const client = clients?.find((c: any) => c.id === entity.clientId);
          
          return {
            entityId: entity.id,
            entityName: entity.name,
            clientName: client?.displayName || 'Unknown Client',
            totalTasks: entityTasks.length,
            completedTasks: entityCompleted.length,
            complianceRate: entityTasks.length > 0 ? 
              Math.round((entityCompleted.length / entityTasks.length) * 100) : 0
          };
        }).filter(e => e.totalTasks > 0)
      };
    }).filter(j => j.totalTasks > 0)
    .sort((a, b) => b.riskScore - a.riskScore);

    // Overall summary
    const totalJurisdictions = jurisdictions.length;
    const totalEntities = jurisdictions.reduce((sum, j) => sum + j.totalEntities, 0);
    const totalTasks = jurisdictions.reduce((sum, j) => sum + j.totalTasks, 0);
    const totalCompleted = jurisdictions.reduce((sum, j) => sum + j.completedTasks, 0);
    const totalOverdue = jurisdictions.reduce((sum, j) => sum + j.overdueTasks, 0);
    const totalRegulatoryOverdue = jurisdictions.reduce((sum, j) => sum + j.regulatoryOverdue, 0);

    const overallComplianceRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const avgRiskScore = totalJurisdictions > 0 ? 
      Math.round(jurisdictions.reduce((sum, j) => sum + j.riskScore, 0) / totalJurisdictions) : 0;

    const summary = {
      totalJurisdictions,
      totalEntities,
      totalTasks,
      totalCompleted,
      totalOverdue,
      totalRegulatoryOverdue,
      overallComplianceRate,
      avgRiskScore
    };

    return { jurisdictions, summary };
  }, [countries, entities, tasks, completedStatusId, currentDate, clients]);

  // Chart data preparation
  const jurisdictionChartData = jurisdictionAnalysis.jurisdictions.map(j => ({
    name: j.countryName,
    totalTasks: j.totalTasks,
    completed: j.completedTasks,
    overdue: j.overdueTasks,
    complianceRate: j.complianceRate,
    riskScore: j.riskScore
  }));

  const complianceDistribution = jurisdictionAnalysis.jurisdictions.map(j => ({
    name: j.countryName,
    value: j.complianceRate,
    color: j.complianceRate >= 90 ? '#22C55E' : 
           j.complianceRate >= 70 ? '#3B82F6' : 
           j.complianceRate >= 50 ? '#EAB308' : '#EF4444'
  }));

  const riskDistribution = [
    { 
      name: 'Critical Risk', 
      value: jurisdictionAnalysis.jurisdictions.filter(j => j.riskLevel === 'Critical').length, 
      color: '#EF4444' 
    },
    { 
      name: 'High Risk', 
      value: jurisdictionAnalysis.jurisdictions.filter(j => j.riskLevel === 'High').length, 
      color: '#F97316' 
    },
    { 
      name: 'Medium Risk', 
      value: jurisdictionAnalysis.jurisdictions.filter(j => j.riskLevel === 'Medium').length, 
      color: '#EAB308' 
    },
    { 
      name: 'Low Risk', 
      value: jurisdictionAnalysis.jurisdictions.filter(j => j.riskLevel === 'Low').length, 
      color: '#22C55E' 
    }
  ];

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <PieChartIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Jurisdiction Analysis</h1>
              <p className="text-slate-600">Multi-jurisdiction compliance tracking and regional insights</p>
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
            <Globe className="h-4 w-4 text-slate-500" />
            <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All jurisdictions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jurisdictions</SelectItem>
                {countries?.map((country: any) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-slate-500" />
            <Select value={complianceFilter} onValueChange={setComplianceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All compliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All compliance</SelectItem>
                <SelectItem value="high">High compliance (90%+)</SelectItem>
                <SelectItem value="medium">Medium compliance (70-89%)</SelectItem>
                <SelectItem value="low">Low compliance (<70%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Alert for High Risk Jurisdictions */}
      {jurisdictionAnalysis.jurisdictions.filter(j => j.riskLevel === 'Critical' || j.regulatoryOverdue > 0).length > 0 && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">High Risk Jurisdictions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jurisdictionAnalysis.jurisdictions
                .filter(j => j.riskLevel === 'Critical' || j.regulatoryOverdue > 0)
                .map(j => (
                  <div key={j.countryId} className="flex items-center gap-2 text-red-800">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">
                      {j.countryName}: {j.regulatoryOverdue > 0 ? `${j.regulatoryOverdue} regulatory violations` : 'Critical risk level'}
                    </span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Active Jurisdictions</CardTitle>
              <Globe className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {jurisdictionAnalysis.summary.totalJurisdictions}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {jurisdictionAnalysis.summary.totalEntities} entities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Overall Compliance</CardTitle>
              <CheckCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {jurisdictionAnalysis.summary.overallComplianceRate}%
            </div>
            <Progress value={jurisdictionAnalysis.summary.overallComplianceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Average Risk Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {jurisdictionAnalysis.summary.avgRiskScore}
            </div>
            <div className="mt-2">
              <Badge className={getRiskColor(
                jurisdictionAnalysis.summary.avgRiskScore >= 80 ? 'Critical' :
                jurisdictionAnalysis.summary.avgRiskScore >= 60 ? 'High' :
                jurisdictionAnalysis.summary.avgRiskScore >= 40 ? 'Medium' : 'Low'
              )}>
                {jurisdictionAnalysis.summary.avgRiskScore >= 80 ? 'Critical' :
                 jurisdictionAnalysis.summary.avgRiskScore >= 60 ? 'High' :
                 jurisdictionAnalysis.summary.avgRiskScore >= 40 ? 'Medium' : 'Low'} Risk
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">Regulatory Violations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {jurisdictionAnalysis.summary.totalRegulatoryOverdue}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {jurisdictionAnalysis.summary.totalOverdue} total overdue
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Jurisdiction Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Jurisdiction Performance</CardTitle>
            <CardDescription>Compliance rates and task completion by jurisdiction</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jurisdictionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalTasks" fill="#64748B" name="Total Tasks" />
                <Bar dataKey="completed" fill="#22C55E" name="Completed" />
                <Bar dataKey="overdue" fill="#EF4444" name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Jurisdictions categorized by risk level</CardDescription>
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

      {/* Detailed Jurisdiction Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Jurisdiction Analysis</CardTitle>
          <CardDescription>Comprehensive breakdown of compliance performance by jurisdiction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 font-medium text-slate-600">Jurisdiction</th>
                  <th className="text-left p-3 font-medium text-slate-600">Entities</th>
                  <th className="text-left p-3 font-medium text-slate-600">Total Tasks</th>
                  <th className="text-left p-3 font-medium text-slate-600">Completed</th>
                  <th className="text-left p-3 font-medium text-slate-600">Overdue</th>
                  <th className="text-left p-3 font-medium text-slate-600">Regulatory Violations</th>
                  <th className="text-left p-3 font-medium text-slate-600">Compliance Rate</th>
                  <th className="text-left p-3 font-medium text-slate-600">Risk Level</th>
                  <th className="text-left p-3 font-medium text-slate-600">Avg Completion Time</th>
                </tr>
              </thead>
              <tbody>
                {jurisdictionAnalysis.jurisdictions.map((jurisdiction, index) => (
                  <tr key={jurisdiction.countryId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{jurisdiction.countryName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{jurisdiction.totalEntities}</td>
                    <td className="p-3 text-slate-600">{jurisdiction.totalTasks}</td>
                    <td className="p-3 text-slate-600">{jurisdiction.completedTasks}</td>
                    <td className="p-3">
                      {jurisdiction.overdueTasks > 0 ? (
                        <Badge className="bg-orange-100 text-orange-800">
                          {jurisdiction.overdueTasks}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="p-3">
                      {jurisdiction.regulatoryOverdue > 0 ? (
                        <Badge className="bg-red-100 text-red-800">
                          {jurisdiction.regulatoryOverdue}
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
                            style={{ width: `${jurisdiction.complianceRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-600">{jurisdiction.complianceRate}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={getRiskColor(jurisdiction.riskLevel)}>
                        {jurisdiction.riskLevel}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600">
                      {jurisdiction.avgCompletionTime > 0 ? `${jurisdiction.avgCompletionTime} days` : '-'}
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