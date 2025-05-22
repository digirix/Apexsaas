import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  FileText, 
  LogOut, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  FileBox, 
  BarChart, 
  Mail, 
  Building,
  Building2,
  CircleDollarSign,
  Briefcase,
  Globe,
  Map,
  MapPin,
  Receipt,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Format currency amount safely, handling both string and number inputs
const formatCurrencyAmount = (amount: any): string => {
  if (!amount) return '0.00';
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if it's a valid number
  if (isNaN(numAmount)) return '0.00';
  
  return numAmount.toFixed(2);
};

// Helper function to format date
const formatDate = (date: string | Date) => {
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "Invalid Date";
  }
};

export default function ClientPortalDashboardPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  
  // Fetch client profile
  const { 
    data: clientProfile, 
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ["/api/client-portal/profile"],
  });
  
  // Fetch client tasks - filter by entity if selected
  const { 
    data: clientTasks = [], 
    isLoading: isTasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useQuery<any[]>({
    queryKey: ["/api/client-portal/tasks", selectedEntityId],
    queryFn: async () => {
      const url = selectedEntityId 
        ? `/api/client-portal/tasks?entityId=${selectedEntityId}`
        : '/api/client-portal/tasks';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!clientProfile
  });
  
  // Fetch client invoices - filter by entity if selected
  const {
    data: clientInvoices = [],
    isLoading: isInvoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices
  } = useQuery<any[]>({
    queryKey: ["/api/client-portal/invoices", selectedEntityId],
    queryFn: async () => {
      const url = selectedEntityId 
        ? `/api/client-portal/invoices?entityId=${selectedEntityId}`
        : '/api/client-portal/invoices';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
    enabled: !!clientProfile
  });
  
  // Fetch client entities
  const { 
    data: clientEntities = [],
    isLoading: isEntitiesLoading,
    error: entitiesError,
  } = useQuery<any[]>({
    queryKey: ["/api/client-portal/entities"],
    enabled: !!clientProfile
  });
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest({
        url: "/api/client-portal/logout",
        method: "POST",
      });
      
      toast({
        title: "Logged out successfully",
        description: "You have been safely logged out of the client portal",
      });
      
      setLocation("/client-portal/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if request fails
      setLocation("/client-portal/login");
    }
  };
  
  // Get entity selection text
  const getEntityFilterText = () => {
    if (!selectedEntityId) return "All entities";
    const entity = (clientEntities as any[]).find((e: any) => e.id === selectedEntityId);
    return entity ? entity.name : "Unknown entity";
  };
  
  // Calculate task completion rate
  const getTaskCompletionRate = () => {
    if (!clientTasks || clientTasks.length === 0) return 0;
    
    const completedTasks = clientTasks.filter(
      (task: any) => task.statusName?.toLowerCase().includes("completed") || task.statusName?.toLowerCase().includes("done")
    ).length;
    
    return Math.round((completedTasks / clientTasks.length) * 100);
  };
  
  // If the user is not authenticated, redirect to login
  useEffect(() => {
    if (profileError) {
      toast({
        title: "Authentication error",
        description: "You need to log in to access the client portal",
        variant: "destructive",
      });
      setLocation("/client-portal/login");
    }
  }, [profileError, setLocation, toast]);
  
  // Loading state
  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Error state (if not redirected)
  if (profileError && !clientProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            Please log in to access the client portal.
          </AlertDescription>
        </Alert>
        <Button onClick={() => setLocation("/client-portal/login")}>
          Go to Login
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Welcome, {clientProfile?.client?.displayName || "Client"}
                </h1>
                <p className="text-sm text-slate-500">
                  Client Portal - {clientProfile?.client?.email || ""}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>
          </div>
          
          {/* Entities Tab */}
          <TabsContent value="entities" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Business Entities</CardTitle>
                  <CardDescription>
                    View and manage your registered businesses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEntitiesLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : entitiesError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        Failed to load entities. Please try again later.
                      </AlertDescription>
                    </Alert>
                  ) : (clientEntities as any[]).length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                      No entities found
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(clientEntities as any[]).map((entity: any) => (
                        <Card key={entity.id} className="hover:shadow-md transition-shadow border border-slate-200">
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 text-sm">
                                    {entity.name}
                                  </h3>
                                  <p className="text-xs text-slate-500">
                                    {entity.entityType} • {entity.countryName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 text-xs px-2 py-1 hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                                  onClick={() => {
                                    setSelectedEntityId(entity.id);
                                    setActiveTab("tasks");
                                  }}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Tasks
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 text-xs px-2 py-1 hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                                  onClick={() => {
                                    setSelectedEntityId(entity.id);
                                    setActiveTab("invoices");
                                  }}
                                >
                                  <Receipt className="h-3 w-3 mr-1" />
                                  Invoices
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-2">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="flex flex-col">
                                <span className="text-slate-500">Tax ID</span>
                                <span className="font-medium truncate">
                                  {entity.businessTaxId || "N/A"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-slate-500">VAT Status</span>
                                <span className="font-medium">
                                  {entity.isVatRegistered ? "Registered" : "Not Reg."}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-slate-500">VAT ID</span>
                                <span className="font-medium truncate">
                                  {entity.vatId || "N/A"}
                                </span>
                              </div>
                            </div>
                            
                            {entity.stats && (
                              <div className="mt-3 pt-2 border-t border-slate-100">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">
                                    Tasks: {entity.stats.taskCount || 0}
                                  </span>
                                  <span className="text-slate-500">
                                    Invoices: {entity.stats.invoiceCount || 0}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Active Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clientTasks ? clientTasks.length : "0"}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {getTaskCompletionRate()}% completed
                  </p>
                  <Progress value={getTaskCompletionRate()} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Open Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clientInvoices ? clientInvoices.filter((inv: any) => inv.status !== 'Paid').length : "0"}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {clientInvoices && clientInvoices.length > 0
                      ? `Total: ${clientInvoices.length} invoices`
                      : "No invoices available"}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Business Entities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clientEntities ? (clientEntities as any[]).length : "0"}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Registered entities
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Account Manager
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-start space-x-4">
                  <Avatar className="h-10 w-10 bg-blue-100 text-blue-600">
                    <AvatarFallback>
                      {clientProfile?.accountManager?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2) || "AM"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {clientProfile?.accountManager?.name || "Not Assigned"}
                    </div>
                    <p className="text-sm text-slate-500">
                      {clientProfile?.accountManager?.email || "Contact your firm for details"}
                    </p>
                    {clientProfile?.accountManager?.phone && (
                      <p className="text-sm text-slate-500">
                        {clientProfile.accountManager.phone}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates on your tasks and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clientTasks && clientTasks.slice(0, 3).map((task: any) => (
                      <div key={task.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <Clock className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {task.title || task.taskDetails || 'Task'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Due: {formatDate(task.dueDate)} • {task.statusName || 'In Progress'}
                          </p>
                        </div>
                        <div>
                          <Button variant="ghost" size="sm" onClick={() => setActiveTab("tasks")}>
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {(!clientTasks || clientTasks.length === 0) && (
                      <div className="text-center py-6 text-slate-500">
                        No recent activity
                      </div>
                    )}
                    
                    {clientTasks && clientTasks.length > 3 && (
                      <div className="text-center pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setActiveTab("tasks")}
                        >
                          View all tasks
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                <div>
                  <CardTitle>Your Tasks</CardTitle>
                  <CardDescription>
                    Track your compliance and service tasks{selectedEntityId ? ` for ${getEntityFilterText()}` : ""}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedEntityId && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedEntityId(null);
                        refetchTasks();
                      }}
                    >
                      Show All Tasks
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refetchTasks()}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isTasksLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : tasksError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load tasks. Please try again later.
                    </AlertDescription>
                  </Alert>
                ) : clientTasks.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    {selectedEntityId ? "No tasks found for this entity" : "No tasks available"}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {(() => {
                        return clientTasks.map((task: any) => (
                          <div key={task.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  <h3 className="font-medium text-slate-900">
                                    {task.title || task.taskDetails || 'Task'}
                                  </h3>
                                  {task.statusName && (
                                    <Badge variant="outline">
                                      {task.statusName}
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600 ml-7">
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Due: {formatDate(task.dueDate)}
                                  </div>
                                  {task.entityId && (
                                    <div className="flex items-center">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      Entity: {(clientEntities as any[]).find((e: any) => e.id === task.entityId)?.name || 'Unknown'}
                                    </div>
                                  )}
                                  <div className="flex items-center">
                                    <Briefcase className="h-3 w-3 mr-1" />
                                    Type: {task.taskType || 'Regular'}
                                  </div>
                                </div>
                              </div>
                              <Button size="sm" variant="outline" className="ml-2">
                                View Details
                              </Button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                <div>
                  <CardTitle>Your Invoices</CardTitle>
                  <CardDescription>
                    View and manage your billing{selectedEntityId ? ` for ${getEntityFilterText()}` : ""}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedEntityId && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedEntityId(null);
                        refetchInvoices();
                      }}
                    >
                      Show All Invoices
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refetchInvoices()}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isInvoicesLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : invoicesError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load invoices. Please try again later.
                    </AlertDescription>
                  </Alert>
                ) : clientInvoices.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    {selectedEntityId ? "No invoices found for this entity" : "No invoices available"}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {(() => {
                        return clientInvoices.map((invoice: any) => (
                          <div key={invoice.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Receipt className="h-4 w-4 text-slate-400" />
                                  <h3 className="font-medium text-slate-900">
                                    Invoice #{invoice.invoiceNumber || invoice.id}
                                  </h3>
                                  <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'}>
                                    {invoice.status || 'Draft'}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600 ml-7">
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Date: {formatDate(invoice.invoiceDate)}
                                  </div>
                                  <div className="flex items-center">
                                    <CircleDollarSign className="h-3 w-3 mr-1" />
                                    Amount: ${formatCurrencyAmount(invoice.totalAmount)}
                                  </div>
                                  {invoice.entityId && (
                                    <div className="flex items-center">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      Entity: {(clientEntities as any[]).find((e: any) => e.id === invoice.entityId)?.name || 'Unknown'}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button size="sm" variant="outline" className="ml-2">
                                View Details
                              </Button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
        </Tabs>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-slate-500">
              © 2025 Client Portal. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Button variant="ghost" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}