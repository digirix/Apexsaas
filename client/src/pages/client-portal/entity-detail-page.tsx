import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Building,
  Shield,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Globe,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  MessageCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addMonths } from "date-fns";
import { DocumentManager } from "@/components/client-portal/document-manager";
import { MessagingCenter } from "@/components/client-portal/messaging-center";

// Types
interface Entity {
  id: number;
  name: string;
  clientId: number;
  countryId: number;
  stateId: number | null;
  address: string | null;
  entityTypeId: number;
  businessTaxId: string | null;
  isVatRegistered: boolean;
  vatId: string | null;
  fileAccessLink: string | null;
  whatsappGroupLink: string | null;
  createdAt: string;
}

interface ComplianceAnalysis {
  overallScore: number;
  totalServices: number;
  requiredServices: number;
  subscribedServices: number;
  compliantServices: number;
  overdueServices: number;
  upcomingDeadlines: number;
  serviceBreakdown: {
    serviceId: number;
    serviceName: string;
    isRequired: boolean;
    isSubscribed: boolean;
    frequency: string;
    lastCompleted?: Date;
    nextDue?: Date;
    status: 'compliant' | 'overdue' | 'upcoming' | 'not-subscribed';
    completionRate: number;
  }[];
}

interface UpcomingCompliance {
  serviceId: number;
  serviceName: string;
  dueDate: Date;
  frequency: string;
  priority: 'high' | 'medium' | 'low';
  daysUntilDue: number;
}

export default function ClientPortalEntityDetailPage() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const entityId = params.id;

  // Fetch all entities and find the specific one
  const { data: entities = [], isLoading: isEntityLoading } = useQuery<Entity[]>({
    queryKey: ["/api/client-portal/entities"],
  });

  const entity = entities.find((e: any) => e.id.toString() === entityId);

  // Fetch all tasks and filter for this entity
  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/client-portal/tasks"],
  });

  const entityTasks = allTasks.filter((task: any) => task.entityId.toString() === entityId);

  // Fetch client profile for context
  const { data: clientProfile } = useQuery({
    queryKey: ["/api/client-portal/profile"],
  });

  // Fetch reference data
  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ['/api/v1/setup/countries'],
  });

  const { data: states = [] } = useQuery<any[]>({
    queryKey: ['/api/v1/setup/states'],
  });

  const { data: entityTypes = [] } = useQuery<any[]>({
    queryKey: ['/api/v1/setup/entity-types'],
  });

  // Calculate compliance analysis based on actual task data
  const complianceAnalysis = useMemo(() => {
    if (!entity || entityTasks.length === 0) return null;
    
    const completedTasks = entityTasks.filter(task => task.statusName === 'Completed').length;
    const totalTasks = entityTasks.length;
    const overallScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const overdueTasks = entityTasks.filter(task => {
      if (!task.dueDate || task.statusName === 'Completed') return false;
      return new Date(task.dueDate) < new Date();
    }).length;
    
    const upcomingTasks = entityTasks.filter(task => {
      if (!task.dueDate || task.statusName === 'Completed') return false;
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;
    
    return {
      overallScore,
      requiredServices: totalTasks,
      subscribedServices: totalTasks,
      compliantServices: completedTasks,
      overdueServices: overdueTasks,
      upcomingDeadlines: upcomingTasks
    };
  }, [entity, entityTasks]);

  // Calculate upcoming compliance deadlines from actual tasks
  const upcomingCompliances = useMemo(() => {
    return entityTasks
      .filter(task => {
        if (task.statusName === 'Completed') return false;
        
        // Prioritize compliance deadline over regular due date
        const relevantDate = task.complianceDeadline ? new Date(task.complianceDeadline) : (task.dueDate ? new Date(task.dueDate) : null);
        if (!relevantDate) return false;
        
        const today = new Date();
        const diffTime = relevantDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 60;
      })
      .map(task => {
        // Use compliance deadline if available, otherwise fall back to due date
        const relevantDate = task.complianceDeadline ? new Date(task.complianceDeadline) : new Date(task.dueDate);
        const today = new Date();
        const diffTime = relevantDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          serviceId: task.id,
          serviceName: task.title || task.description || 'Task',
          dueDate: relevantDate,
          frequency: task.taskType || 'One-time',
          complianceFrequency: task.complianceFrequency,
          compliancePeriod: task.complianceStartDate && task.complianceEndDate 
            ? `${new Date(task.complianceStartDate).toLocaleDateString()} - ${new Date(task.complianceEndDate).toLocaleDateString()}`
            : task.complianceYear 
            ? `Year ${task.complianceYear}`
            : null,
          priority: (daysUntilDue <= 7 ? 'high' : daysUntilDue <= 30 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
          daysUntilDue,
          isComplianceDeadline: !!task.complianceDeadline
        };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [entityTasks]);

  if (isEntityLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-600 font-medium">Loading entity details...</p>
        </motion.div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Entity Not Found</AlertTitle>
          <AlertDescription>
            The requested entity could not be found or you don't have access to it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const country = countries.find(c => c.id === entity.countryId);
  const state = states.find(s => s.id === entity.stateId);
  const entityType = entityTypes.find(et => et.id === entity.entityTypeId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/client-portal")}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{entity.name}</h1>
                  <p className="text-sm text-slate-600">Entity Details & Compliance</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {entity.whatsappGroupLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(entity.whatsappGroupLink!, '_blank')}
                  className="flex items-center text-green-600 hover:text-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
              {entity.fileAccessLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(entity.fileAccessLink!, '_blank')}
                  className="flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Entity Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Entity Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Entity Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Entity Type</label>
                  <p className="text-gray-900">{entityType?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Business Tax ID</label>
                  <p className="text-gray-900">{entity.businessTaxId || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">VAT Registration</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={entity.isVatRegistered ? "default" : "secondary"}>
                      {entity.isVatRegistered ? "VAT Registered" : "Not VAT Registered"}
                    </Badge>
                    {entity.vatId && <span className="text-sm text-gray-600">({entity.vatId})</span>}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Location</label>
                  <p className="text-gray-900 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {[state?.name, country?.name].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              {entity.address && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">{entity.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Score */}
          {complianceAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Compliance Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {complianceAnalysis.overallScore}%
                  </div>
                  <Progress value={complianceAnalysis.overallScore} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-purple-600">{complianceAnalysis.requiredServices}</div>
                    <div className="text-xs text-gray-600">Required</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{complianceAnalysis.subscribedServices}</div>
                    <div className="text-xs text-gray-600">Subscribed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{complianceAnalysis.compliantServices}</div>
                    <div className="text-xs text-gray-600">Compliant</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{complianceAnalysis.overdueServices}</div>
                    <div className="text-xs text-gray-600">Overdue</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Task Overview</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Analysis</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Deadlines</TabsTrigger>
          </TabsList>

          {/* Task Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Task Overview</CardTitle>
                <CardDescription>
                  All tasks and activities for this entity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entityTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No tasks found for this entity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {entityTasks.map((task: any) => {
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.statusName !== 'Completed';
                      const isDueSoon = task.dueDate && (() => {
                        const dueDate = new Date(task.dueDate);
                        const today = new Date();
                        const diffTime = dueDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays <= 7;
                      })();
                      
                      return (
                        <div key={task.id} className={`border rounded-lg p-4 transition-colors ${
                          isOverdue ? 'bg-red-50 border-red-200' :
                          isDueSoon ? 'bg-yellow-50 border-yellow-200' :
                          task.statusName === 'Completed' ? 'bg-green-50 border-green-200' :
                          'hover:bg-gray-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900">{task.title || task.description}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant={
                                task.statusName === 'Completed' ? 'default' :
                                task.statusName === 'In Progress' ? 'secondary' :
                                'outline'
                              } className={
                                task.statusName === 'Completed' ? 'bg-green-100 text-green-700' :
                                task.statusName === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }>
                                {task.statusName}
                              </Badge>
                              {isOverdue && (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                              {isDueSoon && !isOverdue && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Due Soon
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Assignee:</span>
                              <span className="ml-2 text-gray-900">{task.assigneeName || 'Unassigned'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Due Date:</span>
                              <span className="ml-2 text-gray-900">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Compliance Deadline:</span>
                              <span className="ml-2 text-gray-900">
                                {task.complianceDeadline ? new Date(task.complianceDeadline).toLocaleDateString() : 'Not set'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Compliance Period:</span>
                              <span className="ml-2 text-gray-900">
                                {task.complianceStartDate && task.complianceEndDate 
                                  ? `${new Date(task.complianceStartDate).toLocaleDateString()} - ${new Date(task.complianceEndDate).toLocaleDateString()}`
                                  : task.complianceYear 
                                  ? `Year ${task.complianceYear}`
                                  : 'Not set'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Task Type:</span>
                              <span className="ml-2 text-gray-900">{task.taskType || 'Regular'}</span>
                            </div>
                          </div>
                          {task.complianceFrequency && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-600">Compliance Frequency:</span>
                              <span className="ml-2 text-blue-600 font-medium">{task.complianceFrequency}</span>
                            </div>
                          )}
                          {task.description && task.title !== task.description && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Description:</span> {task.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Analysis Tab */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Compliance Analysis</CardTitle>
                <CardDescription>
                  Task completion breakdown and compliance metrics for this entity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {complianceAnalysis && entityTasks.length > 0 ? (
                  <div className="space-y-6">
                    {/* Compliance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-medium text-blue-700 mb-1">Total Tasks</h3>
                        <p className="text-2xl font-bold text-blue-900">{complianceAnalysis.requiredServices}</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-700 mb-1">Completed</h3>
                        <p className="text-2xl font-bold text-green-900">{complianceAnalysis.compliantServices}</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h3 className="text-sm font-medium text-yellow-700 mb-1">Upcoming</h3>
                        <p className="text-2xl font-bold text-yellow-900">{complianceAnalysis.upcomingDeadlines}</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <h3 className="text-sm font-medium text-red-700 mb-1">Overdue</h3>
                        <p className="text-2xl font-bold text-red-900">{complianceAnalysis.overdueServices}</p>
                      </div>
                    </div>

                    {/* Overall Score */}
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">Overall Compliance Score</h3>
                      <div className="text-4xl font-bold text-blue-600 mb-2">{complianceAnalysis.overallScore}%</div>
                      <Progress value={complianceAnalysis.overallScore} className="h-3 max-w-md mx-auto" />
                      <p className="text-sm text-blue-700 mt-2">
                        {complianceAnalysis.compliantServices} of {complianceAnalysis.requiredServices} tasks completed
                      </p>
                    </div>

                    {/* Task Breakdown */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Breakdown</h3>
                      <div className="space-y-3">
                        {entityTasks.map((task: any) => {
                          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.statusName !== 'Completed';
                          const isDueSoon = task.dueDate && (() => {
                            const dueDate = new Date(task.dueDate);
                            const today = new Date();
                            const diffTime = dueDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays >= 0 && diffDays <= 7;
                          })();

                          return (
                            <div key={task.id} className={`border rounded-lg p-4 ${
                              task.statusName === 'Completed' ? 'bg-green-50 border-green-200' :
                              isOverdue ? 'bg-red-50 border-red-200' :
                              isDueSoon ? 'bg-yellow-50 border-yellow-200' :
                              'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-medium text-gray-900">{task.title || task.description}</h4>
                                  <p className="text-sm text-gray-600">
                                    Type: {task.taskType} • Assignee: {task.assigneeName}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={
                                    task.statusName === 'Completed' ? 'default' :
                                    task.statusName === 'In Progress' ? 'secondary' :
                                    'outline'
                                  } className={
                                    task.statusName === 'Completed' ? 'bg-green-100 text-green-700' :
                                    task.statusName === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }>
                                    {task.statusName}
                                  </Badge>
                                  {isOverdue && (
                                    <Badge variant="destructive">
                                      Overdue
                                    </Badge>
                                  )}
                                  {isDueSoon && !isOverdue && (
                                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                                      Due Soon
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-gray-600">Due Date:</span>
                                  <p className="text-gray-900">
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600">Compliance Deadline:</span>
                                  <p className="text-gray-900">
                                    {task.complianceDeadline ? new Date(task.complianceDeadline).toLocaleDateString() : 'Not set'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600">Compliance Period:</span>
                                  <p className="text-gray-900">
                                    {task.complianceStartDate && task.complianceEndDate 
                                      ? `${new Date(task.complianceStartDate).toLocaleDateString()} - ${new Date(task.complianceEndDate).toLocaleDateString()}`
                                      : task.complianceYear 
                                      ? `Year ${task.complianceYear}`
                                      : 'Not set'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600">Created:</span>
                                  <p className="text-gray-900">
                                    {new Date(task.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              {task.complianceFrequency && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium text-gray-600">Compliance Frequency:</span>
                                  <span className="ml-2 text-blue-600 font-medium">{task.complianceFrequency}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No tasks found for compliance analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upcoming Deadlines Tab */}
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>
                  Important task deadlines you should monitor for this entity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingCompliances.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingCompliances.map((task) => (
                      <div key={task.serviceId} className={`flex items-center justify-between p-4 border rounded-lg ${
                        task.priority === 'high' ? 'border-red-200 bg-red-50' :
                        task.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            task.priority === 'high' ? 'bg-red-500' :
                            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div>
                            <h4 className="font-medium text-gray-900">{task.serviceName}</h4>
                            <p className="text-sm text-gray-500">Type: {task.frequency}</p>
                            {task.complianceFrequency && (
                              <p className="text-xs text-blue-600">Compliance: {task.complianceFrequency}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {task.dueDate.toLocaleDateString()}
                          </p>
                          {task.isComplianceDeadline && (
                            <p className="text-xs text-blue-600 mb-1">Compliance Deadline</p>
                          )}
                          {task.compliancePeriod && (
                            <p className="text-xs text-gray-500 mb-1">Period: {task.compliancePeriod}</p>
                          )}
                          <p className={`text-sm ${
                            task.priority === 'high' ? 'text-red-600' :
                            task.priority === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`}>
                            {task.daysUntilDue === 0 ? 'Due today' :
                             task.daysUntilDue === 1 ? '1 day left' :
                             `${task.daysUntilDue} days left`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No upcoming deadlines in the next 60 days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </motion.main>
    </div>
  );
}

// Helper function to calculate compliance analysis
function calculateComplianceAnalysis(
  entity: Entity,
  serviceSubscriptions: any[],
  entityTasks: any[]
): ComplianceAnalysis {
  const serviceBreakdown = serviceSubscriptions.map(service => {
    const serviceTasks = entityTasks.filter(task => task.serviceTypeId === service.id);
    const completedTasks = serviceTasks.filter(task => task.statusId === 1);
    
    const completionRate = serviceTasks.length > 0 ? (completedTasks.length / serviceTasks.length) * 100 : 0;

    let lastCompleted: Date | undefined;
    if (completedTasks.length > 0) {
      const sortedCompleted = completedTasks.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
      lastCompleted = new Date(sortedCompleted[0].updatedAt || sortedCompleted[0].createdAt);
    }

    let nextDue: Date | undefined;
    if (serviceTasks.length > 0) {
      const tasksWithDeadlines = serviceTasks.filter(task => task.complianceDeadline);
      const upcomingDeadlines = tasksWithDeadlines
        .map(task => task.complianceDeadline ? new Date(task.complianceDeadline) : null)
        .filter((deadline): deadline is Date => deadline !== null && deadline > new Date())
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (upcomingDeadlines.length > 0) {
        nextDue = upcomingDeadlines[0];
      }
    }

    let status: 'compliant' | 'overdue' | 'upcoming' | 'not-subscribed';
    if (!service.isSubscribed) {
      status = 'not-subscribed';
    } else if (nextDue) {
      const now = new Date();
      const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue <= 30) {
        status = 'upcoming';
      } else {
        status = 'compliant';
      }
    } else {
      status = service.isSubscribed ? 'upcoming' : 'not-subscribed';
    }

    return {
      serviceId: service.id,
      serviceName: service.name,
      isRequired: service.isRequired,
      isSubscribed: service.isSubscribed,
      frequency: service.billingBasis || 'N/A',
      lastCompleted,
      nextDue,
      status,
      completionRate,
    };
  });

  const requiredCount = serviceBreakdown.filter(s => s.isRequired).length;
  const subscribedCount = serviceBreakdown.filter(s => s.isSubscribed).length;
  const compliantCount = serviceBreakdown.filter(s => s.status === 'compliant').length;
  const overdueCount = serviceBreakdown.filter(s => s.status === 'overdue').length;
  const upcomingCount = serviceBreakdown.filter(s => s.status === 'upcoming').length;

  const overallScore = subscribedCount > 0 
    ? Math.round(((compliantCount + (upcomingCount * 0.5)) / subscribedCount) * 100)
    : 0;

  return {
    overallScore,
    totalServices: serviceBreakdown.length,
    requiredServices: requiredCount,
    subscribedServices: subscribedCount,
    compliantServices: compliantCount,
    overdueServices: overdueCount,
    upcomingDeadlines: upcomingCount,
    serviceBreakdown,
  };
}

function calculateUpcomingCompliances(serviceBreakdown: ComplianceAnalysis['serviceBreakdown']): UpcomingCompliance[] {
  return serviceBreakdown
    .filter(service => service.nextDue && service.isRequired)
    .map(service => {
      const daysUntilDue = Math.ceil((service.nextDue!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (daysUntilDue <= 7) priority = 'high';
      else if (daysUntilDue <= 30) priority = 'medium';

      return {
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        dueDate: service.nextDue!,
        frequency: service.frequency,
        priority,
        daysUntilDue,
      };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

function ComplianceAnalysisSection({ analysis }: { analysis: ComplianceAnalysis }) {
  return (
    <div className="space-y-4">
      {analysis.serviceBreakdown.map((service) => (
        <div key={service.serviceId} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900">{service.serviceName}</h4>
              <p className="text-sm text-gray-500">Frequency: {service.frequency}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={service.isRequired ? "default" : "secondary"}>
                {service.isRequired ? "Required" : "Optional"}
              </Badge>
              <Badge 
                variant={
                  service.status === 'compliant' ? 'default' :
                  service.status === 'upcoming' ? 'secondary' :
                  service.status === 'overdue' ? 'destructive' : 'outline'
                }
              >
                {service.status.charAt(0).toUpperCase() + service.status.slice(1).replace('-', ' ')}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Completion Rate:</span>
              <div className="mt-1">
                <Progress value={service.completionRate} className="h-2" />
                <span className="text-xs text-gray-600">{Math.round(service.completionRate)}%</span>
              </div>
            </div>
            
            {service.lastCompleted && (
              <div>
                <span className="font-medium">Last Completed:</span>
                <p className="text-gray-600">{service.lastCompleted.toLocaleDateString()}</p>
              </div>
            )}
            
            {service.nextDue && (
              <div>
                <span className="font-medium">Next Due:</span>
                <p className="text-gray-600">{service.nextDue.toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingComplianceSection({ upcomingCompliances }: { upcomingCompliances: UpcomingCompliance[] }) {
  return (
    <div className="space-y-3">
      {upcomingCompliances.map((compliance) => (
        <div key={compliance.serviceId} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              compliance.priority === 'high' ? 'bg-red-500' :
              compliance.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <div>
              <h4 className="font-medium text-gray-900">{compliance.serviceName}</h4>
              <p className="text-sm text-gray-500">Frequency: {compliance.frequency}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="font-medium text-gray-900">
              {compliance.dueDate.toLocaleDateString()}
            </div>
            <div className={`text-sm ${
              compliance.daysUntilDue <= 7 ? 'text-red-600' :
              compliance.daysUntilDue <= 30 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {compliance.daysUntilDue} days remaining
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}