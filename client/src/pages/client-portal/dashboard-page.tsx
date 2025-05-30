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
  XCircle
} from "lucide-react";
import { format } from "date-fns";

// Helper function to format dates
const formatDate = (date: string | Date) => {
  if (!date) return "N/A";
  return format(new Date(date), "MMM dd, yyyy");
};

// Entity Overview Tab Component
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
  if (servicesLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-500 mt-4">Loading services...</p>
      </div>
    );
  }

  const totalServices = entityServices.length;
  const subscribedServices = entityServices.filter((s: any) => s.isSubscribed).length;
  const requiredServices = entityServices.filter((s: any) => s.isRequired).length;
  const completedTasks = clientTasks.filter((task: any) => task.statusId === 1).length;

  return (
    <div className="space-y-6">
      {/* Service Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalServices}</div>
            <p className="text-xs text-gray-500">Available services</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Subscribed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{subscribedServices}</div>
            <p className="text-xs text-gray-500">Active subscriptions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{completedTasks}</div>
            <p className="text-xs text-gray-500">Tasks finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle>Service Overview</CardTitle>
          <CardDescription>Current service subscriptions and status</CardDescription>
        </CardHeader>
        <CardContent>
          {entityServices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityServices.map((service: any) => {
                  const serviceTasks = clientTasks.filter((task: any) => task.serviceTypeId === service.serviceTypeId);
                  const completedServiceTasks = serviceTasks.filter((task: any) => task.statusId === 1);
                  
                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">Service {service.serviceTypeId}</TableCell>
                      <TableCell>
                        <Badge variant={service.isSubscribed ? "default" : "outline"}>
                          {service.isSubscribed ? "Active" : "Not Subscribed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.isRequired ? "destructive" : "secondary"}>
                          {service.isRequired ? "Required" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {completedServiceTasks.length}/{serviceTasks.length} completed
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No services configured</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Dashboard Component with Admin Portal Style Entity Detail
function FullEntityDetailSection({ entity }: { entity: any }) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: entityServices, isLoading: servicesLoading } = useQuery({
    queryKey: [`/api/v1/entities/${entity.id}/services`],
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
        
        {/* Entity Header */}
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Detailed Compliance Analysis
                  </CardTitle>
                  <CardDescription>
                    Comprehensive view of compliance status across all services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-600">Overall Compliance Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{completedTasks}</div>
                      <div className="text-sm text-gray-600">Completed Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {tasks.filter((task: any) => {
                          if (!task.complianceDeadline || task.statusId === 1) return false;
                          return new Date(task.complianceDeadline) < new Date();
                        }).length}
                      </div>
                      <div className="text-sm text-gray-600">Overdue Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600">{upcomingCompliance.length}</div>
                      <div className="text-sm text-gray-600">Upcoming (90 days)</div>
                    </div>
                  </div>
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
    queryKey: ['/api/client-portal/dashboard'],
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