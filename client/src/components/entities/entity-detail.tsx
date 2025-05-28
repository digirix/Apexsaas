import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  Building,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  FileText,
  Users,
  TrendingUp,
  Clock,
  Target,
  Shield,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import { format, addMonths, addDays, parseISO } from "date-fns";
import type { Entity, Task, ServiceType, EntityServiceSubscription } from "@shared/schema";

interface EntityDetailProps {
  entityId: string;
}

interface ComplianceAnalysis {
  overallScore: number;
  totalServices: number;
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

export function EntityDetail({ entityId }: EntityDetailProps) {
  const [, setLocation] = useLocation();

  // Fetch entity details
  const { data: entity, isLoading: entityLoading } = useQuery<Entity>({
    queryKey: [`/api/v1/entities/${entityId}`],
  });

  // Fetch entity service subscriptions
  const { data: serviceSubscriptions = [] } = useQuery<EntityServiceSubscription[]>({
    queryKey: [`/api/v1/entities/${entityId}/services`],
    enabled: !!entity,
  });

  // Fetch service types for the entity's country
  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: [`/api/v1/setup/service-types`],
    enabled: !!entity,
  });

  // Fetch entity tasks for compliance analysis
  const { data: entityTasks = [] } = useQuery<Task[]>({
    queryKey: [`/api/v1/tasks?entityId=${entityId}`],
    enabled: !!entity,
  });

  // Fetch client info
  const { data: client } = useQuery<any>({
    queryKey: [`/api/v1/clients/${entity?.clientId}`],
    enabled: !!entity?.clientId,
  });

  // Fetch country and state info
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
  const complianceAnalysis: ComplianceAnalysis | null = entity && serviceTypes && serviceSubscriptions && entityTasks
    ? calculateComplianceAnalysis(entity, serviceTypes, serviceSubscriptions, entityTasks)
    : null;

  // Calculate upcoming compliance deadlines
  const upcomingCompliances: UpcomingCompliance[] = complianceAnalysis
    ? calculateUpcomingCompliances(complianceAnalysis.serviceBreakdown)
    : [];

  if (entityLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading entity details...</p>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Entity not found</h3>
        <p className="text-gray-600 mb-4">The entity you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => setLocation("/clients")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const country = countries.find(c => c.id === entity.countryId);
  const state = states.find(s => s.id === entity.stateId);
  const entityType = entityTypes.find(et => et.id === entity.entityTypeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/clients/${entity.clientId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
            <p className="text-sm text-gray-600">
              {client?.displayName} • {entityType?.name} • {country?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {complianceAnalysis && (
            <Badge 
              variant={
                complianceAnalysis.overallScore >= 90 ? "default" :
                complianceAnalysis.overallScore >= 70 ? "secondary" : "destructive"
              }
              className="text-sm"
            >
              {complianceAnalysis.overallScore}% Compliant
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Analysis</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Deadlines</TabsTrigger>
          <TabsTrigger value="services">Service Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Entity Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Entity Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Entity Name</label>
                  <p className="mt-1 text-sm text-gray-900">{entity.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Entity Type</label>
                  <p className="mt-1 text-sm text-gray-900">{entityType?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Business Tax ID</label>
                  <p className="mt-1 text-sm text-gray-900">{entity.businessTaxId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">VAT Registration</label>
                  <div className="mt-1 flex items-center">
                    {entity.isVatRegistered ? (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Registered
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Registered
                      </Badge>
                    )}
                  </div>
                </div>
                {entity.isVatRegistered && entity.vatId && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">VAT ID</label>
                    <p className="mt-1 text-sm text-gray-900">{entity.vatId}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {country?.name}{state ? `, ${state.name}` : ''}
                  </p>
                </div>
              </div>

              {entity.address && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{entity.address}</p>
                </div>
              )}

              <div className="flex space-x-4">
                {entity.fileAccessLink && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={entity.fileAccessLink} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      File Access
                    </a>
                  </Button>
                )}
                {entity.whatsappGroupLink && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={entity.whatsappGroupLink} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      WhatsApp Group
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Compliance Overview */}
          {complianceAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Compliance Overview
                </CardTitle>
                <CardDescription>
                  Quick summary of compliance status across all services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Overall Compliance</span>
                      <span className="text-sm text-gray-600">{complianceAnalysis.overallScore}%</span>
                    </div>
                    <Progress value={complianceAnalysis.overallScore} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{complianceAnalysis.subscribedServices}</div>
                      <div className="text-xs text-gray-600">Subscribed Services</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{complianceAnalysis.compliantServices}</div>
                      <div className="text-xs text-gray-600">Compliant</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{complianceAnalysis.overdueServices}</div>
                      <div className="text-xs text-gray-600">Overdue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{complianceAnalysis.upcomingDeadlines}</div>
                      <div className="text-xs text-gray-600">Upcoming</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {complianceAnalysis && (
            <ComplianceAnalysisSection analysis={complianceAnalysis} />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <UpcomingComplianceSection upcomingCompliances={upcomingCompliances} />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <ServiceConfigurationSection 
            entity={entity}
            serviceTypes={serviceTypes}
            serviceSubscriptions={serviceSubscriptions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to calculate compliance analysis
function calculateComplianceAnalysis(
  entity: Entity,
  serviceTypes: ServiceType[],
  subscriptions: EntityServiceSubscription[],
  tasks: Task[]
): ComplianceAnalysis {
  const serviceBreakdown = serviceTypes.map(service => {
    const subscription = subscriptions.find(sub => sub.serviceTypeId === service.id);
    const serviceTasks = tasks.filter(task => task.serviceTypeId === service.id);
    
    // Calculate completion rate based on completed vs total tasks
    const completedTasks = serviceTasks.filter(task => {
      // Assuming status ID 1 is "Completed"
      return task.statusId === 1;
    });
    
    const completionRate = serviceTasks.length > 0 
      ? (completedTasks.length / serviceTasks.length) * 100 
      : 0;

    // Find the most recent task to determine last completion
    const recentTasks = serviceTasks
      .filter(task => task.statusId === 1)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const lastCompleted = recentTasks.length > 0 ? new Date(recentTasks[0].createdAt) : undefined;

    // Calculate next due date based on compliance frequency
    let nextDue: Date | undefined;
    if (lastCompleted && serviceTasks.length > 0) {
      const frequency = serviceTasks[0].complianceFrequency;
      if (frequency === 'Monthly') {
        nextDue = addMonths(lastCompleted, 1);
      } else if (frequency === 'Quarterly') {
        nextDue = addMonths(lastCompleted, 3);
      } else if (frequency === 'Yearly') {
        nextDue = addMonths(lastCompleted, 12);
      }
    }

    // Determine status
    let status: 'compliant' | 'overdue' | 'upcoming' | 'not-subscribed';
    if (!subscription?.isSubscribed) {
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
      status = subscription?.isSubscribed ? 'upcoming' : 'not-subscribed';
    }

    return {
      serviceId: service.id,
      serviceName: service.name,
      isRequired: subscription?.isRequired || false,
      isSubscribed: subscription?.isSubscribed || false,
      frequency: serviceTasks[0]?.complianceFrequency || 'N/A',
      lastCompleted,
      nextDue,
      status,
      completionRate,
    };
  });

  const subscribedServices = serviceBreakdown.filter(s => s.isSubscribed).length;
  const compliantServices = serviceBreakdown.filter(s => s.status === 'compliant').length;
  const overdueServices = serviceBreakdown.filter(s => s.status === 'overdue').length;
  const upcomingDeadlines = serviceBreakdown.filter(s => s.status === 'upcoming').length;

  // Calculate overall score
  const overallScore = subscribedServices > 0 
    ? Math.round(((compliantServices + (upcomingDeadlines * 0.5)) / subscribedServices) * 100)
    : 0;

  return {
    overallScore,
    totalServices: serviceTypes.length,
    subscribedServices,
    compliantServices,
    overdueServices,
    upcomingDeadlines,
    serviceBreakdown,
  };
}

// Helper function to calculate upcoming compliance deadlines
function calculateUpcomingCompliances(serviceBreakdown: ComplianceAnalysis['serviceBreakdown']): UpcomingCompliance[] {
  return serviceBreakdown
    .filter(service => service.nextDue && service.isSubscribed)
    .map(service => {
      const now = new Date();
      const daysUntilDue = Math.ceil((service.nextDue!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low';
      if (daysUntilDue <= 7) priority = 'high';
      else if (daysUntilDue <= 30) priority = 'medium';
      else priority = 'low';

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

// Compliance Analysis Section Component
function ComplianceAnalysisSection({ analysis }: { analysis: ComplianceAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Detailed Compliance Analysis
        </CardTitle>
        <CardDescription>
          Complete breakdown of compliance status for each service
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Last Completed</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Completion Rate</TableHead>
              <TableHead>Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysis.serviceBreakdown.map((service) => (
              <TableRow key={service.serviceId}>
                <TableCell className="font-medium">{service.serviceName}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      service.status === 'compliant' ? 'default' :
                      service.status === 'upcoming' ? 'secondary' :
                      service.status === 'overdue' ? 'destructive' : 'outline'
                    }
                    className="capitalize"
                  >
                    {service.status === 'not-subscribed' ? 'Not Subscribed' : service.status}
                  </Badge>
                </TableCell>
                <TableCell>{service.frequency}</TableCell>
                <TableCell>
                  {service.lastCompleted ? format(service.lastCompleted, 'MMM dd, yyyy') : 'Never'}
                </TableCell>
                <TableCell>
                  {service.nextDue ? format(service.nextDue, 'MMM dd, yyyy') : 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Progress value={service.completionRate} className="h-2 w-16" />
                    <span className="text-sm text-gray-600">{service.completionRate.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {service.isRequired ? (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Upcoming Compliance Section Component
function UpcomingComplianceSection({ upcomingCompliances }: { upcomingCompliances: UpcomingCompliance[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Upcoming Compliance Deadlines
        </CardTitle>
        <CardDescription>
          Next 12 months of compliance requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingCompliances.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Deadlines</h3>
            <p className="text-gray-600">All compliance requirements are up to date or no services are subscribed.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Until Due</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingCompliances.map((compliance) => (
                <TableRow key={compliance.serviceId}>
                  <TableCell className="font-medium">{compliance.serviceName}</TableCell>
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
        )}
      </CardContent>
    </Card>
  );
}

// Service Configuration Section Component
function ServiceConfigurationSection({ 
  entity, 
  serviceTypes, 
  serviceSubscriptions 
}: { 
  entity: Entity;
  serviceTypes: ServiceType[];
  serviceSubscriptions: EntityServiceSubscription[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2" />
          Service Configuration
        </CardTitle>
        <CardDescription>
          Configure which services this entity subscribes to
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {serviceTypes.map((service) => {
              const subscription = serviceSubscriptions.find(sub => sub.serviceTypeId === service.id);
              return (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.countryId}</TableCell>
                  <TableCell>
                    {subscription?.isRequired ? (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {subscription?.isSubscribed ? (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Subscribed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Subscribed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}