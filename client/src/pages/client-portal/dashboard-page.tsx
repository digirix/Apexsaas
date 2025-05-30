import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Building,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  XCircle,
  Target,
  FileText,
  Users,
  MapPin,
  Link as LinkIcon,
  ArrowLeft,
  Filter,
  BarChart3,
  Activity,
  Zap,
  Star,
  Globe,
  Phone,
  Mail
} from "lucide-react";
import { format, addMonths, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

// Helper function to format dates
const formatDate = (date: string | Date) => {
  if (!date) return "N/A";
  return format(new Date(date), "MMM dd, yyyy");
};

// Comprehensive Entity Overview Tab Component - Admin Portal Style
function EntityOverviewTab({ 
  selectedEntityId, 
  entityServices, 
  servicesLoading, 
  clientTasks 
}: { 
  selectedEntityId: number;
  entityServices: any[];
  servicesLoading: boolean;
  clientTasks: any[];
}) {
  // Fetch service types for detailed information
  const { data: serviceTypes = [] } = useQuery({
    queryKey: [`/api/v1/setup/service-types`],
    enabled: !!selectedEntityId
  });

  if (servicesLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-500 mt-4">Loading comprehensive service data...</p>
      </div>
    );
  }

  const totalServices = entityServices.length;
  const subscribedServices = entityServices.filter((s: any) => s.isSubscribed).length;
  const requiredServices = entityServices.filter((s: any) => s.isRequired).length;
  const completedTasks = clientTasks.filter((task: any) => task.statusId === 1).length;
  const pendingTasks = clientTasks.filter((task: any) => task.statusId !== 1).length;
  const overdueTasks = clientTasks.filter((task: any) => {
    if (!task.complianceDeadline || task.statusId === 1) return false;
    return new Date(task.complianceDeadline) < new Date();
  }).length;

  // Calculate compliance score
  const complianceScore = totalServices > 0 ? Math.round((subscribedServices / totalServices) * 100) : 0;
  const taskCompletionRate = clientTasks.length > 0 ? Math.round((completedTasks / clientTasks.length) * 100) : 0;

  // Get service details with name mapping
  const enrichedServices = entityServices.map((service: any) => {
    const serviceType = serviceTypes.find((st: any) => st.id === service.serviceTypeId);
    const serviceTasks = clientTasks.filter((task: any) => task.serviceTypeId === service.serviceTypeId);
    const completedServiceTasks = serviceTasks.filter((task: any) => task.statusId === 1);
    const overdueServiceTasks = serviceTasks.filter((task: any) => {
      if (!task.complianceDeadline || task.statusId === 1) return false;
      return new Date(task.complianceDeadline) < new Date();
    });

    return {
      ...service,
      serviceName: serviceType?.name || `Service ${service.serviceTypeId}`,
      description: serviceType?.description || 'No description available',
      frequency: serviceType?.frequency || 'Unknown',
      totalTasks: serviceTasks.length,
      completedTasks: completedServiceTasks.length,
      overdueTasks: overdueServiceTasks.length,
      completionRate: serviceTasks.length > 0 ? Math.round((completedServiceTasks.length / serviceTasks.length) * 100) : 0,
      status: service.isSubscribed ? 
        (overdueServiceTasks.length > 0 ? 'overdue' : 
         completedServiceTasks.length === serviceTasks.length && serviceTasks.length > 0 ? 'compliant' : 'active') 
        : 'not-subscribed'
    };
  });

  return (
    <div className="space-y-6">
      {/* Comprehensive Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Service Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{subscribedServices}/{totalServices}</div>
            <p className="text-xs text-blue-600">Active subscriptions</p>
            <Progress value={complianceScore} className="mt-2 h-2" />
            <p className="text-xs text-blue-600 mt-1">{complianceScore}% coverage</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{completedTasks}/{clientTasks.length}</div>
            <p className="text-xs text-green-600">Tasks completed</p>
            <Progress value={taskCompletionRate} className="mt-2 h-2" />
            <p className="text-xs text-green-600 mt-1">{taskCompletionRate}% complete</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Overdue Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">{overdueTasks}</div>
            <p className="text-xs text-red-600">Require attention</p>
            {overdueTasks > 0 && (
              <p className="text-xs text-red-600 mt-2 font-medium">Action needed</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">{requiredServices}</div>
            <p className="text-xs text-purple-600">Required services</p>
            <div className="flex items-center mt-2">
              {complianceScore >= 80 ? (
                <Badge className="bg-green-100 text-green-800">Excellent</Badge>
              ) : complianceScore >= 60 ? (
                <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Service Configuration Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Service Configuration & Performance
          </CardTitle>
          <CardDescription>
            Comprehensive view of all services, their status, and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrichedServices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Details</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Task Performance</TableHead>
                  <TableHead>Compliance Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedServices.map((service: any) => (
                  <TableRow key={service.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{service.serviceName}</div>
                        <div className="text-sm text-gray-500">{service.description}</div>
                        {service.isRequired && (
                          <Badge variant="destructive" className="mt-1 text-xs">Required</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <Badge variant={service.isSubscribed ? "default" : "outline"}>
                          {service.isSubscribed ? "Active" : "Not Subscribed"}
                        </Badge>
                        {!service.isSubscribed && service.isRequired && (
                          <span className="text-xs text-red-600">Action Required</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {service.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">{service.completedTasks}/{service.totalTasks}</span>
                          <span className="text-gray-500 ml-1">tasks</span>
                        </div>
                        <Progress value={service.completionRate} className="h-2 w-20" />
                        <span className="text-xs text-gray-500">{service.completionRate}% complete</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {service.status === 'compliant' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Compliant
                          </Badge>
                        )}
                        {service.status === 'overdue' && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue ({service.overdueTasks})
                          </Badge>
                        )}
                        {service.status === 'active' && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Clock className="h-3 w-3 mr-1" />
                            In Progress
                          </Badge>
                        )}
                        {service.status === 'not-subscribed' && (
                          <Badge className="bg-gray-100 text-gray-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Configured</h3>
              <p className="text-gray-500 mb-4">This entity doesn't have any services configured yet.</p>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Quick Actions & Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Service Recommendations</h4>
              {requiredServices > subscribedServices ? (
                <p className="text-sm text-blue-700">
                  Consider subscribing to {requiredServices - subscribedServices} additional required services to ensure full compliance.
                </p>
              ) : (
                <p className="text-sm text-blue-700">
                  Great! You're subscribed to all required services.
                </p>
              )}
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Performance Insights</h4>
              <p className="text-sm text-green-700">
                Your task completion rate is {taskCompletionRate}%. 
                {taskCompletionRate >= 80 ? " Excellent performance!" : " Room for improvement."}
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">Next Steps</h4>
              {overdueTasks > 0 ? (
                <p className="text-sm text-purple-700">
                  Focus on completing {overdueTasks} overdue tasks to improve compliance.
                </p>
              ) : pendingTasks > 0 ? (
                <p className="text-sm text-purple-700">
                  Stay on track with {pendingTasks} pending tasks.
                </p>
              ) : (
                <p className="text-sm text-purple-700">
                  All caught up! Great compliance management.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Dashboard Component with Admin Portal Style Entity Detail
function FullEntityDetailSection({ entity }: { entity: any }) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: entityServices, isLoading: servicesLoading } = useQuery({
    queryKey: [`/api/client-portal/entity/${entity.id}/services`],
    enabled: !!entity.id
  });

  const { data: entityTasks } = useQuery({
    queryKey: [`/api/client-portal/tasks?entityId=${entity.id}`],
    enabled: !!entity.id
  });

  const services = Array.isArray(entityServices) ? entityServices : [];
  const tasks = Array.isArray(entityTasks) ? entityTasks : [];
  const totalServices = services.length;
  const subscribedServices = services.filter((s: any) => s.isSubscribed).length;
  const completedTasks = tasks.filter((task: any) => task.statusId === 1).length;

  // Calculate upcoming compliance deadlines
  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  const upcomingCompliance = tasks
    .filter((task: any) => {
      if (!task.complianceDeadline || task.statusId === 1) return false;
      const deadline = new Date(task.complianceDeadline);
      return deadline >= now && deadline <= ninetyDaysFromNow;
    })
    .map((task: any) => {
      const deadline = new Date(task.complianceDeadline);
      const daysUntilDue = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 3600 * 24));
      let priority: 'high' | 'medium' | 'low' = 'low';
      
      if (daysUntilDue <= 7) priority = 'high';
      else if (daysUntilDue <= 30) priority = 'medium';

      return {
        serviceId: task.serviceTypeId,
        serviceName: task.title || 'Unknown Service',
        dueDate: deadline,
        frequency: task.complianceFrequency || 'Unknown',
        priority,
        daysUntilDue,
        compliancePeriod: task.complianceYear || new Date().getFullYear().toString()
      };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <Card className="bg-white/80 backdrop-blur-lg border border-white/40 shadow-xl rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        
        {/* Comprehensive Entity Header */}
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-900">{entity.name}</CardTitle>
                  <CardDescription className="text-slate-600 mt-1">
                    {entity.entityType} • {entity.countryName}, {entity.stateName}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {totalServices} Services
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {completedTasks}/{tasks.length} Tasks Complete
                </Badge>
                {entity.whatsappGroupLink && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(entity.whatsappGroupLink, '_blank')}
                    className="text-green-600 hover:text-green-700"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
                {entity.fileAccessLink && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(entity.fileAccessLink, '_blank')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Entity Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-sm font-medium text-gray-900">
                    {entity.cityName}, {entity.stateName}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Globe className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Country</div>
                  <div className="text-sm font-medium text-gray-900">{entity.countryName}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Entity Type</div>
                  <div className="text-sm font-medium text-gray-900">{entity.entityType}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Established</div>
                  <div className="text-sm font-medium text-gray-900">
                    {entity.createdAt ? formatDate(entity.createdAt) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {subscribedServices} Active Services
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {Math.round((completedTasks / Math.max(tasks.length, 1)) * 100)}% Compliance Rate
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {upcomingCompliance.length} Upcoming Deadlines
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {tasks.length > 0 && completedTasks === tasks.length ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Star className="h-3 w-3 mr-1" />
                    Fully Compliant
                  </Badge>
                ) : upcomingCompliance.filter((item: any) => item.priority === 'high').length > 0 ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Action Required
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800">
                    <Activity className="h-3 w-3 mr-1" />
                    On Track
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="compliance">Compliance Analysis</TabsTrigger>
              <TabsTrigger value="history">Compliance History</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming Deadlines</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <EntityOverviewTab 
                selectedEntityId={entity.id}
                entityServices={services}
                servicesLoading={servicesLoading}
                clientTasks={tasks}
              />
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              {/* Comprehensive Compliance Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Compliance Performance Dashboard
                    </CardTitle>
                    <CardDescription>
                      Real-time compliance metrics and performance indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                        </div>
                        <div className="text-xs text-blue-600 mt-1">Overall Score</div>
                        <Progress 
                          value={tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0} 
                          className="mt-2 h-2" 
                        />
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
                        <div className="text-xs text-green-600 mt-1">Completed</div>
                        <div className="text-xs text-green-500 mt-1">Total: {tasks.length}</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {tasks.filter((task: any) => {
                            if (!task.complianceDeadline || task.statusId === 1) return false;
                            return new Date(task.complianceDeadline) < new Date();
                          }).length}
                        </div>
                        <div className="text-xs text-red-600 mt-1">Overdue</div>
                        <div className="text-xs text-red-500 mt-1">Needs Action</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{upcomingCompliance.length}</div>
                        <div className="text-xs text-yellow-600 mt-1">Upcoming</div>
                        <div className="text-xs text-yellow-500 mt-1">90 days</div>
                      </div>
                    </div>

                    {/* Service-wise Compliance Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Service-wise Performance</h4>
                      {services.map((service: any) => {
                        const serviceTasks = tasks.filter((task: any) => task.serviceTypeId === service.serviceTypeId);
                        const serviceCompleted = serviceTasks.filter((task: any) => task.statusId === 1);
                        const serviceRate = serviceTasks.length > 0 ? (serviceCompleted.length / serviceTasks.length) * 100 : 0;
                        
                        return (
                          <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  serviceRate === 100 ? 'bg-green-500' :
                                  serviceRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                                <div>
                                  <h5 className="font-medium text-gray-900">Service {service.serviceTypeId}</h5>
                                  <p className="text-sm text-gray-500">
                                    {serviceCompleted.length}/{serviceTasks.length} tasks completed
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="w-24">
                                <Progress value={serviceRate} className="h-2" />
                              </div>
                              <div className="text-right min-w-[60px]">
                                <div className="text-sm font-medium">{Math.round(serviceRate)}%</div>
                                <Badge variant={service.isSubscribed ? "default" : "outline"} className="text-xs">
                                  {service.isSubscribed ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Compliance Trends & Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Insights & Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Compliance Health</h4>
                      {tasks.length > 0 ? (
                        <div>
                          <div className="text-2xl font-bold text-blue-800 mb-1">
                            {Math.round((completedTasks / tasks.length) * 100)}%
                          </div>
                          <p className="text-sm text-blue-700">
                            {Math.round((completedTasks / tasks.length) * 100) >= 80 ? 
                              "Excellent compliance record" :
                              Math.round((completedTasks / tasks.length) * 100) >= 60 ?
                              "Good compliance, room for improvement" :
                              "Needs immediate attention"
                            }
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-blue-700">No compliance data available</p>
                      )}
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Service Coverage</h4>
                      <div className="text-2xl font-bold text-green-800 mb-1">
                        {subscribedServices}/{totalServices}
                      </div>
                      <p className="text-sm text-green-700">
                        {totalServices > 0 ? Math.round((subscribedServices / totalServices) * 100) : 0}% of services active
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">Next Priority</h4>
                      {upcomingCompliance.length > 0 ? (
                        <div>
                          <p className="text-sm text-purple-700 mb-2">
                            {upcomingCompliance[0].serviceName}
                          </p>
                          <p className="text-xs text-purple-600">
                            Due in {upcomingCompliance[0].daysUntilDue} days
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-purple-700">All deadlines are on track</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Task Analysis Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Detailed Task Analysis
                  </CardTitle>
                  <CardDescription>
                    Complete breakdown of all compliance tasks and their current status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tasks.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task Details</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.map((task: any) => {
                          const isOverdue = task.complianceDeadline && task.statusId !== 1 && 
                            new Date(task.complianceDeadline) < new Date();
                          const daysUntilDue = task.complianceDeadline ? 
                            Math.ceil((new Date(task.complianceDeadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
                          
                          return (
                            <TableRow key={task.id} className="hover:bg-gray-50">
                              <TableCell>
                                <div>
                                  <div className="font-medium text-gray-900">{task.title || 'Untitled Task'}</div>
                                  <div className="text-sm text-gray-500">{task.description || 'No description'}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  Service {task.serviceTypeId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {task.complianceDeadline ? (
                                  <div>
                                    <div className="text-sm font-medium">{formatDate(task.complianceDeadline)}</div>
                                    {daysUntilDue !== null && (
                                      <div className={`text-xs ${
                                        daysUntilDue < 0 ? 'text-red-600' :
                                        daysUntilDue <= 7 ? 'text-yellow-600' : 'text-gray-500'
                                      }`}>
                                        {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                                         daysUntilDue === 0 ? 'Due today' :
                                         `${daysUntilDue} days remaining`}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">No deadline</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {task.statusId === 1 ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                ) : isOverdue ? (
                                  <Badge className="bg-red-100 text-red-800">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Overdue
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    <Clock className="h-3 w-3 mr-1" />
                                    In Progress
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isOverdue ? (
                                  <Badge variant="destructive" className="text-xs">High</Badge>
                                ) : daysUntilDue !== null && daysUntilDue <= 7 ? (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">Medium</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Normal</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  {task.statusId !== 1 && (
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Compliance Tasks</h3>
                      <p className="text-gray-500">No compliance tasks have been created for this entity yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Compliance History
                  </CardTitle>
                  <CardDescription>
                    Track record of completed compliance activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tasks.filter((task: any) => task.statusId === 1).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Task Details</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks
                          .filter((task: any) => task.statusId === 1)
                          .map((task: any) => (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium">
                                {task.title || 'Unknown Service'}
                              </TableCell>
                              <TableCell>{task.description || 'No description'}</TableCell>
                              <TableCell>
                                {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                              </TableCell>
                              <TableCell>
                                {task.updatedAt ? formatDate(task.updatedAt) : 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No completed tasks</p>
                      <p className="text-sm text-gray-400">Completed compliance activities will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Upcoming Compliance Deadlines
                  </CardTitle>
                  <CardDescription>
                    Upcoming deadlines for the next 90 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingCompliance.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingCompliance.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              item.priority === 'high' ? 'bg-red-500' :
                              item.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                            <div>
                              <h4 className="font-medium text-gray-900">{item.serviceName}</h4>
                              <p className="text-sm text-gray-500">
                                {item.frequency} • Period: {item.compliancePeriod}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(item.dueDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.daysUntilDue} days remaining
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No upcoming deadlines</p>
                      <p className="text-sm text-gray-400">All compliance requirements are up to date</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ClientPortalDashboardPage() {
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['/api/client-portal/profile'],
  });

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-600 font-medium"
          >
            Loading your portal...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const client = clientData?.client || {};
  const clientEntities = clientData?.entities || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome, {client.displayName}
          </h1>
          <p className="text-slate-600 mt-2">
            Access your compliance dashboard and entity information
          </p>
        </motion.div>

        {/* Client Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-lg border border-white/40 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900">Client Overview</CardTitle>
              <CardDescription>Your account information and entities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{clientEntities.length}</div>
                  <div className="text-sm text-gray-600">Total Entities</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <div className="text-sm text-gray-600">Account Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{client.email}</div>
                  <div className="text-sm text-gray-600">Contact Email</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Entity Details - Full Admin Portal Style */}
        {clientEntities.map((entity: any, index: number) => (
          <FullEntityDetailSection key={`detail-${entity.id}`} entity={entity} />
        ))}
      </div>
    </div>
  );
}