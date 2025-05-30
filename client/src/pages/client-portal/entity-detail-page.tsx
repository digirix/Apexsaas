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

  // Calculate compliance analysis
  const complianceAnalysis: ComplianceAnalysis | null = entity && serviceSubscriptions && entityTasks
    ? calculateComplianceAnalysis(entity, serviceSubscriptions, entityTasks)
    : null;

  // Calculate upcoming compliance deadlines
  const upcomingCompliances: UpcomingCompliance[] = complianceAnalysis
    ? calculateUpcomingCompliances(complianceAnalysis.serviceBreakdown)
    : [];

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Service Overview</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Analysis</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Deadlines</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
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
                    {serviceSubscriptions.map((service) => {
                      const relatedTasks = entityTasks.filter(task => task.serviceTypeId === service.id);
                      const completedTasks = relatedTasks.filter(task => task.statusId === 1).length;
                      
                      return (
                        <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <h4 className="font-medium text-gray-900">{service.name}</h4>
                                <p className="text-sm text-gray-500">
                                  {service.description || `Rate: ${service.rate || 'N/A'} • Billing: ${service.billingBasis || 'N/A'}`}
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
                                <Badge variant={service.isRequired ? "default" : "secondary"} className="text-xs">
                                  {service.isRequired ? "Required" : "Optional"}
                                </Badge>
                                <Badge variant={service.isSubscribed ? "default" : "outline"} className="text-xs">
                                  {service.isSubscribed ? "Subscribed" : "Not Subscribed"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {service.isSubscribed ? (
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

          {/* Compliance Analysis Tab */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Compliance Analysis</CardTitle>
                <CardDescription>
                  Comprehensive breakdown of compliance status for each service
                </CardDescription>
              </CardHeader>
              <CardContent>
                {complianceAnalysis ? (
                  <ComplianceAnalysisSection analysis={complianceAnalysis} />
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No compliance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upcoming Deadlines Tab */}
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Compliance Deadlines</CardTitle>
                <CardDescription>
                  Important deadlines you should monitor for this entity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingCompliances.length > 0 ? (
                  <UpcomingComplianceSection upcomingCompliances={upcomingCompliances} />
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No upcoming deadlines</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <DocumentManager entityId={entity?.id} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <MessagingCenter entityId={entity?.id} entityName={entity?.name} />
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