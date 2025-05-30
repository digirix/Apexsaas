import { useState } from "react";
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
import { addMonths, format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  compliancePeriod: string;
}

export default function ClientPortalEntityDetailPage() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const entityId = params.id;

  // Fetch entity details
  const { data: entity, isLoading: isEntityLoading } = useQuery<Entity>({
    queryKey: [`/api/client-portal/entities/${entityId}`],
    enabled: !!entityId,
  });

  // Fetch entity services
  const { data: serviceSubscriptions = [] } = useQuery<any[]>({
    queryKey: [`/api/client-portal/entity/${entityId}/services`],
    enabled: !!entityId,
  });

  // Fetch entity tasks
  const { data: entityTasks = [] } = useQuery<any[]>({
    queryKey: [`/api/client-portal/tasks?entityId=${entityId}`],
    enabled: !!entityId,
  });

  // Fetch service types for proper service names
  const { data: serviceTypes = [] } = useQuery<any[]>({
    queryKey: ['/api/v1/setup/service-types'],
  });

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

  // Calculate compliance analysis using the same logic as admin portal
  const complianceAnalysis = entity && serviceSubscriptions && entityTasks && serviceTypes
    ? calculateEntityComplianceAnalysis(entity, serviceSubscriptions, entityTasks, serviceTypes)
    : null;

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

        {/* Compliance Tracking Section - Exact Mirror of Admin Portal */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Service Overview</TabsTrigger>
            <TabsTrigger value="analysis">Compliance Analysis</TabsTrigger>
            <TabsTrigger value="history">Compliance History</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Deadlines</TabsTrigger>
          </TabsList>

          {/* Service Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Configured Services</CardTitle>
                <CardDescription>
                  Services configured for this entity and their current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {serviceSubscriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No services configured</p>
                    <p className="text-sm text-gray-400">Contact your accounting firm to configure services</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {serviceSubscriptions.map((subscription) => {
                      const serviceType = serviceTypes.find(st => st.id === subscription.serviceTypeId);
                      const serviceName = serviceType?.name || 'Unknown Service';
                      const relatedTasks = entityTasks.filter(task => task.serviceTypeId === subscription.serviceTypeId);
                      const completedTasks = relatedTasks.filter(task => task.statusId === 1).length;
                      
                      return (
                        <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <h4 className="font-medium text-gray-900">{serviceName}</h4>
                                <p className="text-sm text-gray-500">
                                  {serviceType?.description || `Rate: ${serviceType?.rate || 'N/A'} • Billing: ${serviceType?.billingBasis || 'N/A'}`}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                {completedTasks}/{relatedTasks.length} tasks completed
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={subscription.isRequired ? "default" : "secondary"} className="text-xs">
                                  {subscription.isRequired ? "Required" : "Optional"}
                                </Badge>
                                <Badge variant={subscription.isSubscribed ? "default" : "outline"} className="text-xs">
                                  {subscription.isSubscribed ? "Subscribed" : "Not Subscribed"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {subscription.isSubscribed ? (
                                completedTasks === relatedTasks.length && relatedTasks.length > 0 ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : relatedTasks.length > 0 ? (
                                  <Clock className="h-5 w-5 text-yellow-500" />
                                ) : (
                                  <AlertTriangle className="h-5 w-5 text-red-500" />
                                )
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Analysis Tab - Mirror of Admin Portal */}
          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Compliance Analysis
                </CardTitle>
                <CardDescription>
                  Current compliance status for tasks due within the next 3 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClientPortalComplianceAnalysisTable entityTasks={entityTasks} serviceTypes={serviceTypes} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance History Tab - Mirror of Admin Portal */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Compliance History
                </CardTitle>
                <CardDescription>
                  Recently completed compliance tasks and their details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClientPortalComplianceHistoryTable entityTasks={entityTasks} serviceTypes={serviceTypes} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upcoming Deadlines Tab - Mirror of Admin Portal */}
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Upcoming Compliance Deadlines
                </CardTitle>
                <CardDescription>
                  Predicted future compliance requirements based on service frequencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClientPortalUpcomingComplianceTable entityTasks={entityTasks} serviceTypes={serviceTypes} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  );
}

// Client Portal Compliance Analysis - Exact Mirror of Admin Portal
function calculateEntityComplianceAnalysis(
  entity: Entity,
  serviceSubscriptions: any[],
  entityTasks: any[],
  serviceTypes: any[]
): ComplianceAnalysis {
  const serviceBreakdown = serviceSubscriptions.map(subscription => {
    const serviceType = serviceTypes.find(st => st.id === subscription.serviceTypeId);
    const serviceName = serviceType?.name || 'Unknown Service';
    const serviceTasks = entityTasks.filter(task => task.serviceTypeId === subscription.serviceTypeId);
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
    if (!subscription.isSubscribed) {
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
      status = subscription.isSubscribed ? 'upcoming' : 'not-subscribed';
    }

    return {
      serviceId: subscription.serviceTypeId,
      serviceName: serviceName,
      isRequired: subscription.isRequired,
      isSubscribed: subscription.isSubscribed,
      frequency: serviceType?.billingBasis || 'N/A',
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

// Client Portal Enhanced Compliance Analysis Table - Exact Mirror of Admin Portal
function ClientPortalComplianceAnalysisTable({ entityTasks, serviceTypes }: { entityTasks: any[], serviceTypes: any[] }) {
  const today = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  // Filter for tasks with compliance deadlines within next 3 months and not completed
  const upcomingTasks = entityTasks.filter(task => {
    if (!task.complianceDeadline || task.statusId === 1) return false;
    const deadline = new Date(task.complianceDeadline);
    const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const threeMonthsDate = new Date(threeMonthsFromNow.getFullYear(), threeMonthsFromNow.getMonth(), threeMonthsFromNow.getDate());
    
    return deadlineDate >= todayDate && deadlineDate <= threeMonthsDate;
  });

  if (upcomingTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Deadlines</h3>
        <p className="text-gray-600">All compliance tasks are either completed or not due within the next 3 months.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Task Detail</TableHead>
          <TableHead>Compliance Period</TableHead>
          <TableHead>Compliance Deadline</TableHead>
          <TableHead>Days Until Due</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {upcomingTasks.map((task) => {
          const serviceType = serviceTypes?.find(st => st.id === task.serviceTypeId);
          const serviceName = serviceType?.name || 'Unknown Service';
          const deadline = new Date(task.complianceDeadline);
          const daysUntilDue = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{serviceName}</TableCell>
              <TableCell>{task.description || task.title}</TableCell>
              <TableCell>{task.complianceYear}</TableCell>
              <TableCell>{format(deadline, 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                <span className={`font-medium ${
                  daysUntilDue <= 7 ? 'text-red-600' :
                  daysUntilDue <= 30 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {daysUntilDue} days
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={daysUntilDue <= 7 ? 'destructive' : daysUntilDue <= 30 ? 'secondary' : 'outline'}>
                  {daysUntilDue <= 0 ? 'Overdue' : daysUntilDue <= 7 ? 'Critical' : daysUntilDue <= 30 ? 'Upcoming' : 'Pending'}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Client Portal Compliance History Table - Exact Mirror of Admin Portal
function ClientPortalComplianceHistoryTable({ entityTasks, serviceTypes }: { entityTasks: any[], serviceTypes: any[] }) {
  // Filter for completed tasks that are not in the analysis tab
  const completedTasks = entityTasks.filter(task => task.statusId === 1 && task.complianceDeadline);

  if (completedTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Compliance History</h3>
        <p className="text-gray-600">No completed compliance tasks found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Task Detail</TableHead>
          <TableHead>Compliance Period</TableHead>
          <TableHead>Compliance Deadline</TableHead>
          <TableHead>Completion Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {completedTasks.map((task) => {
          const serviceType = serviceTypes?.find(st => st.id === task.serviceTypeId);
          const serviceName = serviceType?.name || 'Unknown Service';
          const deadline = new Date(task.complianceDeadline);
          const completionDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt);
          
          return (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{serviceName}</TableCell>
              <TableCell>{task.description || task.title}</TableCell>
              <TableCell>{task.complianceYear}</TableCell>
              <TableCell>{format(deadline, 'MMM dd, yyyy')}</TableCell>
              <TableCell>{format(completionDate, 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                <Badge variant="default" className="text-green-700 bg-green-100">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Client Portal Upcoming Compliance Table - Exact Mirror of Admin Portal
function ClientPortalUpcomingComplianceTable({ entityTasks, serviceTypes }: { entityTasks: any[], serviceTypes: any[] }) {
  // Generate future compliance deadlines from recurring tasks
  const upcomingCompliances = generateClientPortalFutureComplianceDeadlines(entityTasks, serviceTypes);

  if (upcomingCompliances.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Deadlines</h3>
        <p className="text-gray-600">No subscribed services or no compliance deadlines to predict.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Compliance Period</TableHead>
          <TableHead>Predicted Due Date</TableHead>
          <TableHead>Days Until Due</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Priority</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {upcomingCompliances.map((compliance, index) => (
          <TableRow key={`${compliance.serviceId}-${index}`}>
            <TableCell className="font-medium">{compliance.serviceName}</TableCell>
            <TableCell className="font-medium">{compliance.compliancePeriod}</TableCell>
            <TableCell>{format(compliance.dueDate, 'MMM dd, yyyy')}</TableCell>
            <TableCell>
              <span className={`font-medium ${
                compliance.daysUntilDue <= 7 ? 'text-red-600' :
                compliance.daysUntilDue <= 30 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {compliance.daysUntilDue} days
              </span>
            </TableCell>
            <TableCell>{compliance.frequency}</TableCell>
            <TableCell>
              <Badge
                variant={
                  compliance.priority === 'high' ? 'destructive' :
                  compliance.priority === 'medium' ? 'secondary' : 'outline'
                }
                className="capitalize"
              >
                {compliance.priority === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {compliance.priority}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Helper function to generate future compliance deadlines for client portal
function generateClientPortalFutureComplianceDeadlines(entityTasks: any[], serviceTypes: any[]): UpcomingCompliance[] {
  const now = new Date();
  const next12Months = new Date();
  next12Months.setMonth(next12Months.getMonth() + 12);
  
  const futureDeadlines: UpcomingCompliance[] = [];
  
  // Process recurring tasks that have compliance deadline data
  const tasksWithDeadlines = entityTasks.filter(task => 
    task.isRecurring && 
    task.complianceFrequency && 
    task.complianceDeadline &&
    task.complianceYear
  );
  
  tasksWithDeadlines.forEach(task => {
    const frequency = task.complianceFrequency;
    const complianceDeadline = new Date(task.complianceDeadline);
    const complianceYear = task.complianceYear;
    
    // Find the service name from serviceTypes
    const serviceType = serviceTypes?.find(st => st.id === task.serviceTypeId);
    const serviceName = serviceType?.name || task.description || task.title || 'Unknown Service';
    
    // Calculate how many months to add based on frequency
    let monthsToAdd = 0;
    if (frequency === 'Monthly') monthsToAdd = 1;
    else if (frequency === 'Quarterly') monthsToAdd = 3;
    else if (frequency === 'Semi-Annual') monthsToAdd = 6;
    else if (frequency === 'Annual') monthsToAdd = 12;
    else if (frequency === 'Bi-Annual') monthsToAdd = 24;
    else return; // Skip unknown frequencies
    
    // Start from the existing compliance deadline and generate future deadlines
    let nextDeadline = new Date(complianceDeadline);
    let currentYear = parseInt(complianceYear);
    let currentMonth = complianceDeadline.getMonth();
    
    // If the deadline is in the past, calculate the next future deadline
    while (nextDeadline <= now) {
      nextDeadline.setMonth(nextDeadline.getMonth() + monthsToAdd);
      if (frequency === 'Annual' || frequency === 'Bi-Annual') {
        currentYear += frequency === 'Annual' ? 1 : 2;
      } else {
        currentMonth += monthsToAdd;
        if (currentMonth >= 12) {
          currentYear += Math.floor(currentMonth / 12);
          currentMonth = currentMonth % 12;
        }
      }
    }
    
    // Generate up to 3 future deadlines within the next 12 months
    let count = 0;
    let periodYear = currentYear;
    let periodMonth = currentMonth;
    
    while (nextDeadline <= next12Months && count < 3) {
      const daysUntilDue = Math.ceil((nextDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low';
      if (daysUntilDue <= 7) priority = 'high';
      else if (daysUntilDue <= 30) priority = 'medium';
      else priority = 'low';
      
      // Calculate compliance period based on frequency
      let compliancePeriod = '';
      if (frequency === 'Monthly') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        compliancePeriod = `${monthNames[periodMonth]} ${periodYear}`;
      } else if (frequency === 'Quarterly') {
        const quarter = Math.floor(periodMonth / 3) + 1;
        compliancePeriod = `Q${quarter} ${periodYear}`;
      } else if (frequency === 'Semi-Annual') {
        const half = periodMonth < 6 ? 1 : 2;
        compliancePeriod = `H${half} ${periodYear}`;
      } else if (frequency === 'Annual') {
        compliancePeriod = `${periodYear}`;
      } else if (frequency === 'Bi-Annual') {
        compliancePeriod = `${periodYear}`;
      }
      
      futureDeadlines.push({
        serviceId: task.serviceTypeId || 0,
        serviceName: serviceName,
        dueDate: new Date(nextDeadline),
        frequency: frequency,
        priority: priority,
        daysUntilDue: daysUntilDue,
        compliancePeriod: compliancePeriod
      });
      
      // Move to next deadline and period
      nextDeadline.setMonth(nextDeadline.getMonth() + monthsToAdd);
      if (frequency === 'Annual') {
        periodYear += 1;
      } else if (frequency === 'Bi-Annual') {
        periodYear += 2;
      } else {
        periodMonth += monthsToAdd;
        if (periodMonth >= 12) {
          periodYear += Math.floor(periodMonth / 12);
          periodMonth = periodMonth % 12;
        }
      }
      count++;
    }
  });
  
  // Sort by due date
  return futureDeadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}