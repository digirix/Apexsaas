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

  // Fetch task statuses
  const { data: taskStatuses = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
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
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                {client?.displayName} • {entityType?.name} • {country?.name}{state ? `, ${state.name}` : ''}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {entity.businessTaxId && (
                  <span>Tax ID: {entity.businessTaxId}</span>
                )}
                {entity.isVatRegistered && entity.vatId && (
                  <span>VAT: {entity.vatId}</span>
                )}
                <div className="flex items-center space-x-2">
                  {entity.fileAccessLink && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                      <a href={entity.fileAccessLink} target="_blank" rel="noopener noreferrer">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Files
                      </a>
                    </Button>
                  )}
                  {entity.whatsappGroupLink && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                      <a href={entity.whatsappGroupLink} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
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
          <TabsTrigger value="history">Compliance History</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Deadlines</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Service Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Service Configuration
              </CardTitle>
              <CardDescription>
                Services configured for this entity and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serviceSubscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No services configured</p>
                  <p className="text-sm text-gray-400">Configure services in the client detail view to start tracking compliance</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceSubscriptions.map((service) => {
                    // The API returns services with embedded subscription data
                    const relatedTasks = entityTasks.filter(task => task.serviceTypeId === service.id);
                    const completedTasks = relatedTasks.filter(task => task.statusId === 1).length; // Status 1 is "Completed" 
                    
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
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{complianceAnalysis.requiredServices}</div>
                      <div className="text-xs text-gray-600">Required Services</div>
                    </div>
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
          <ComplianceAnalysisSection 
            entityTasks={entityTasks || []}
            serviceTypes={serviceTypes || []}
            taskStatuses={taskStatuses || []}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ComplianceHistorySection 
            entityTasks={entityTasks || []}
            serviceTypes={serviceTypes || []}
            taskStatuses={taskStatuses || []}
          />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <UpcomingComplianceSection 
            serviceSubscriptions={serviceSubscriptions}
            entityTasks={entityTasks || []}
            serviceTypes={serviceTypes || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to calculate compliance analysis - include all configured services
function calculateComplianceAnalysis(
  entity: Entity,
  serviceTypes: ServiceType[],
  subscriptions: EntityServiceSubscription[],
  tasks: Task[]
): ComplianceAnalysis {
  // Include all configured services (both required and subscribed)
  const allConfiguredServices = subscriptions;
  
  const serviceBreakdown = allConfiguredServices.map(service => {
    // The API returns services with embedded subscription data, not separate subscriptions
    
    const serviceTasks = tasks.filter(task => task.serviceTypeId === service.id);
    
    // Calculate completion rate based on completed vs total tasks
    const completedTasks = serviceTasks.filter(task => {
      // Check for completed status (status ID 3 is typically "Completed")
      return task.statusId === 3;
    });
    
    const completionRate = serviceTasks.length > 0 
      ? (completedTasks.length / serviceTasks.length) * 100 
      : 0;

    // Find the most recent task to determine last completion
    const recentTasks = serviceTasks
      .filter(task => task.statusId === 1)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const lastCompleted = recentTasks.length > 0 ? new Date(recentTasks[0].createdAt) : undefined;

    // Use compliance deadline from the last task added by user, otherwise calculate based on frequency
    let nextDue: Date | undefined;
    
    // Get the compliance deadline from the most recently created task for this service
    if (serviceTasks.length > 0) {
      // Sort tasks by creation date (newest first) to get the last task added by user
      const sortedTasks = serviceTasks.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Get the compliance deadline from the most recent task
      const lastTask = sortedTasks[0];
      if (lastTask.complianceDeadline) {
        nextDue = new Date(lastTask.complianceDeadline);
      } else if (lastCompleted) {
        // Fallback to frequency-based calculation only if no compliance deadline is set
        const frequency = lastTask.complianceFrequency;
        if (frequency === 'Monthly') {
          nextDue = addMonths(lastCompleted, 1);
        } else if (frequency === 'Quarterly') {
          nextDue = addMonths(lastCompleted, 3);
        } else if (frequency === 'Yearly') {
          nextDue = addMonths(lastCompleted, 12);
        }
      }
    }

    // Determine status
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
      frequency: serviceTasks[0]?.complianceFrequency || service.billingBasis || 'N/A',
      lastCompleted,
      nextDue,
      status,
      completionRate,
    };
  }).filter(Boolean) as ComplianceAnalysis['serviceBreakdown'];

  const requiredCount = serviceBreakdown.filter(s => s.isRequired).length;
  const subscribedCount = serviceBreakdown.filter(s => s.isSubscribed).length;
  const compliantCount = serviceBreakdown.filter(s => s.status === 'compliant').length;
  const overdueCount = serviceBreakdown.filter(s => s.status === 'overdue').length;
  const upcomingCount = serviceBreakdown.filter(s => s.status === 'upcoming').length;

  // Calculate overall score based on subscribed services
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

// Helper function to calculate upcoming compliance deadlines - only for required services
function calculateUpcomingCompliances(serviceBreakdown: ComplianceAnalysis['serviceBreakdown']): UpcomingCompliance[] {
  const now = new Date();
  const next12Months = new Date();
  next12Months.setMonth(next12Months.getMonth() + 12);
  
  return serviceBreakdown
    .filter(service => service.isRequired && service.isSubscribed && service.nextDue)
    .filter(service => service.nextDue! <= next12Months) // Only next 12 months
    .map(service => {
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

// Compliance Analysis Section Component - Shows tasks with compliance deadlines within next 3 months
function ComplianceAnalysisSection({ 
  entityTasks, 
  serviceTypes, 
  taskStatuses 
}: { 
  entityTasks: Task[]; 
  serviceTypes: ServiceType[];
  taskStatuses: any[];
}) {
  const currentDate = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(currentDate.getMonth() + 3);

  // Filter tasks with compliance deadlines within next 3 months
  const upcomingComplianceTasks = entityTasks.filter(task => {
    if (!task.complianceDeadline) return false;
    const deadline = new Date(task.complianceDeadline);
    return deadline >= currentDate && deadline <= threeMonthsFromNow;
  });

  // Get task status name
  const getTaskStatusName = (statusId: number) => {
    const status = taskStatuses.find(s => s.id === statusId);
    return status?.name || 'Unknown';
  };

  // Get service name
  const getServiceName = (serviceTypeId: number | null) => {
    if (!serviceTypeId) return 'No Service';
    const service = serviceTypes.find(s => s.id === serviceTypeId);
    return service?.name || 'Unknown Service';
  };

  // Determine compliance status - check if task is completed
  const getComplianceStatus = (statusId: number) => {
    // Status ID 1 is "Completed" - tasks are complied when completed
    return statusId === 1 ? 'Complied' : 'Pending';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Compliance Analysis
        </CardTitle>
        <CardDescription>
          Tasks with compliance deadlines within the next 3 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingComplianceTasks.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Compliance Deadlines</h3>
            <p className="text-gray-600">No tasks with compliance deadlines in the next 3 months.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Compliance Period</TableHead>
                <TableHead>Compliance Deadline</TableHead>
                <TableHead>Task Status</TableHead>
                <TableHead>Compliance Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingComplianceTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {getServiceName(task.serviceTypeId)}
                  </TableCell>
                  <TableCell>{task.complianceFrequency || 'N/A'}</TableCell>
                  <TableCell>
                    {task.complianceStartDate && task.complianceEndDate ? (
                      `${format(new Date(task.complianceStartDate), 'MMM yyyy')} - ${format(new Date(task.complianceEndDate), 'MMM yyyy')}`
                    ) : (
                      task.complianceYear || 'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      new Date(task.complianceDeadline!) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'text-red-600' :
                      new Date(task.complianceDeadline!) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {format(new Date(task.complianceDeadline!), 'MMM dd, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.statusId === 1 ? 'default' :
                        task.statusId === 3 ? 'secondary' :
                        task.statusId === 4 ? 'destructive' : 'outline'
                      }
                      className="text-xs"
                    >
                      {getTaskStatusName(task.statusId)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getComplianceStatus(task.statusId) === 'Complied' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {getComplianceStatus(task.statusId)}
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

// Upcoming Compliance Section Component - Predicts future compliance periods
function UpcomingComplianceSection({ 
  serviceSubscriptions, 
  entityTasks, 
  serviceTypes 
}: { 
  serviceSubscriptions: EntityServiceSubscription[];
  entityTasks: Task[];
  serviceTypes: ServiceType[];
}) {
  const currentDate = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(currentDate.getFullYear() + 1);

  // Calculate future compliance periods for each subscribed service
  const upcomingCompliances = serviceSubscriptions
    .filter(sub => sub.isSubscribed)
    .map(subscription => {
      const service = serviceTypes.find(st => st.id === subscription.serviceTypeId);
      if (!service) return null;

      // Find the most recent task for this service to determine the last deadline
      const serviceTasks = entityTasks.filter(task => task.serviceTypeId === service.id);
      const tasksWithDeadlines = serviceTasks.filter(task => task.complianceDeadline);
      
      let nextDueDate: Date;
      let frequency = 'Annual'; // Default frequency

      if (tasksWithDeadlines.length > 0) {
        // Get the most recent compliance deadline
        const latestTask = tasksWithDeadlines.sort((a, b) => 
          new Date(b.complianceDeadline!).getTime() - new Date(a.complianceDeadline!).getTime()
        )[0];
        
        frequency = latestTask.complianceFrequency || 'Annual';
        
        // Calculate next due date based on frequency
        const lastDeadline = new Date(latestTask.complianceDeadline!);
        nextDueDate = new Date(lastDeadline);
        
        switch (frequency) {
          case 'Monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'Quarterly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'Semi-Annually':
            nextDueDate.setMonth(nextDueDate.getMonth() + 6);
            break;
          case 'Annual':
          default:
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
        }
      } else {
        // No previous tasks, predict based on common compliance periods
        nextDueDate = new Date(currentDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 3); // Default to 3 months ahead
      }

      // Only include if within next 12 months
      if (nextDueDate > oneYearFromNow) return null;

      const daysUntilDue = Math.ceil((nextDueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (daysUntilDue <= 30) priority = 'high';
      else if (daysUntilDue <= 90) priority = 'medium';

      return {
        serviceId: service.id,
        serviceName: service.name,
        dueDate: nextDueDate,
        daysUntilDue,
        frequency,
        priority,
        isRequired: subscription.isRequired
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysUntilDue - b!.daysUntilDue);

  return (
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
        {upcomingCompliances.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Deadlines</h3>
            <p className="text-gray-600">No subscribed services or no compliance deadlines to predict.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Predicted Due Date</TableHead>
                <TableHead>Days Until Due</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingCompliances.map((compliance) => (
                <TableRow key={compliance!.serviceId}>
                  <TableCell className="font-medium">{compliance!.serviceName}</TableCell>
                  <TableCell>{format(compliance!.dueDate, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      compliance!.daysUntilDue <= 7 ? 'text-red-600' :
                      compliance!.daysUntilDue <= 30 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {compliance!.daysUntilDue} days
                    </span>
                  </TableCell>
                  <TableCell>{compliance!.frequency}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        compliance!.priority === 'high' ? 'destructive' :
                        compliance!.priority === 'medium' ? 'secondary' : 'outline'
                      }
                      className="capitalize"
                    >
                      {compliance!.priority === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {compliance!.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={compliance!.isRequired ? "destructive" : "outline"} 
                      className="text-xs"
                    >
                      {compliance!.isRequired ? "Required" : "Optional"}
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

// Compliance History Section Component - Shows completed tasks not in Analysis tab
function ComplianceHistorySection({ 
  entityTasks, 
  serviceTypes, 
  taskStatuses 
}: { 
  entityTasks: Task[];
  serviceTypes: ServiceType[];
  taskStatuses: any[];
}) {
  const currentDate = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(currentDate.getMonth() + 3);

  // Filter completed tasks that are NOT in the analysis tab (compliance deadline not within next 3 months)
  const historyTasks = entityTasks.filter(task => {
    // Must be completed
    if (task.statusId !== 1) return false;
    
    // If has compliance deadline, should not be within next 3 months (already shown in analysis)
    if (task.complianceDeadline) {
      const deadline = new Date(task.complianceDeadline);
      return deadline < currentDate || deadline > threeMonthsFromNow;
    }
    
    // Include completed tasks without compliance deadlines
    return true;
  });

  // Get task status name
  const getTaskStatusName = (statusId: number) => {
    const status = taskStatuses.find(s => s.id === statusId);
    return status?.name || 'Unknown';
  };

  // Get service name
  const getServiceName = (serviceTypeId: number | null) => {
    if (!serviceTypeId) return 'No Service';
    const service = serviceTypes.find(s => s.id === serviceTypeId);
    return service?.name || 'Unknown Service';
  };

  // Sort by completion date (newest first)
  const sortedHistoryTasks = historyTasks.sort((a, b) => 
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Compliance History
        </CardTitle>
        <CardDescription>
          Completed compliance tasks and historical performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedHistoryTasks.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Compliance History</h3>
            <p className="text-gray-600">No completed compliance tasks found for this entity.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Compliance Period</TableHead>
                <TableHead>Compliance Deadline</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Task Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHistoryTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {getServiceName(task.serviceTypeId)}
                  </TableCell>
                  <TableCell>{task.complianceFrequency || 'N/A'}</TableCell>
                  <TableCell>
                    {task.complianceStartDate && task.complianceEndDate ? (
                      `${format(new Date(task.complianceStartDate), 'MMM yyyy')} - ${format(new Date(task.complianceEndDate), 'MMM yyyy')}`
                    ) : (
                      task.complianceYear || 'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {task.complianceDeadline ? (
                      format(new Date(task.complianceDeadline), 'MMM dd, yyyy')
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(task.updatedAt || task.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {getTaskStatusName(task.statusId)}
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