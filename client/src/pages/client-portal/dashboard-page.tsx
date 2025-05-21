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
  MapPin 
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

export default function ClientPortalDashboardPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch client profile
  const { 
    data: clientProfile, 
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ["/api/client-portal/profile"],
  });
  
  // Fetch client tasks
  const { 
    data: clientTasks = [], 
    isLoading: isTasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: ["/api/client-portal/tasks"],
    enabled: !!clientProfile
  });
  
  // Fetch client documents
  const { 
    data: clientDocuments = [], 
    isLoading: isDocumentsLoading,
    error: documentsError,
  } = useQuery({
    queryKey: ["/api/client-portal/documents"],
    enabled: !!clientProfile
  });
  
  // Fetch client entities
  const {
    data: clientEntities = [],
    isLoading: isEntitiesLoading,
    error: entitiesError,
  } = useQuery({
    queryKey: ["/api/client-portal/entities"],
    enabled: !!clientProfile
  });
  
  // Logout the client
  const handleLogout = async () => {
    try {
      const response = await apiRequest("POST", "/api/client-portal/logout", {});
      
      if (response.ok) {
        toast({
          title: "Logout successful",
          description: "You have been logged out of the client portal",
        });
        
        // Redirect to login page
        setLocation("/client-portal/login");
      } else {
        toast({
          title: "Logout failed",
          description: "There was an error logging out",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      toast({
        title: "Logout error",
        description: "An error occurred during logout",
        variant: "destructive",
      });
    }
  };
  
  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  // Get task status badge variant
  const getTaskStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "success";
      case "in progress":
        return "default";
      case "not started":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "outline";
    }
  };
  
  // Get document type icon
  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "tax return":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "financial statement":
        return <BarChart className="h-5 w-5 text-green-500" />;
      case "report":
        return <FileBox className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Calculate task completion rate
  const getTaskCompletionRate = () => {
    if (!clientTasks || clientTasks.length === 0) return 0;
    
    const completedTasks = clientTasks.filter(
      (task: any) => task.status.toLowerCase() === "completed"
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
            You need to log in to access the client portal
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
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Client Portal</h1>
                <p className="text-sm text-slate-500">
                  {clientProfile?.client?.displayName || "Client Dashboard"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {clientProfile?.client?.displayName}
                </p>
                <p className="text-xs text-slate-500">
                  {clientProfile?.client?.email}
                </p>
              </div>
              <Avatar className="h-9 w-9 bg-blue-100 text-blue-600">
                <AvatarFallback>
                  {clientProfile?.client?.displayName
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .substring(0, 2) || "CL"}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={handleLogout}>
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
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
          </div>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Pending Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clientTasks
                      ? clientTasks.filter(
                          (task: any) => task.status.toLowerCase() !== "completed"
                        ).length
                      : "0"}
                  </div>
                  <div className="mt-2">
                    <Progress value={getTaskCompletionRate()} className="h-2" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {getTaskCompletionRate()}% tasks completed
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    Recent Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clientDocuments ? clientDocuments.length : "0"}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {clientDocuments && clientDocuments.length > 0
                      ? `Last updated: ${formatDate(clientDocuments[0].date)}`
                      : "No documents available"}
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Tasks</CardTitle>
                  <CardDescription>
                    Your upcoming tax and accounting deadlines
                  </CardDescription>
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
                      No upcoming tasks
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientTasks
                        .filter((task: any) => task.status.toLowerCase() !== "completed")
                        .slice(0, 3)
                        .map((task: any) => (
                          <div key={task.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              <Clock className="h-5 w-5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {task.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                Due: {formatDate(task.dueDate)}
                              </p>
                            </div>
                            <div>
                              <Badge variant={getTaskStatusVariant(task.status)}>
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      
                      {clientTasks.filter(
                        (task: any) => task.status.toLowerCase() !== "completed"
                      ).length > 3 && (
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
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Documents</CardTitle>
                  <CardDescription>
                    Your recently uploaded financial documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isDocumentsLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : documentsError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        Failed to load documents. Please try again later.
                      </AlertDescription>
                    </Alert>
                  ) : clientDocuments.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                      No documents available
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientDocuments.slice(0, 3).map((doc: any) => (
                        <div key={doc.id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getDocumentIcon(doc.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(doc.date)} • {doc.type}
                            </p>
                          </div>
                          <div>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {clientDocuments.length > 3 && (
                        <div className="text-center pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveTab("documents")}
                          >
                            View all documents
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Tasks & Deadlines</CardTitle>
                <CardDescription>
                  Track your tax and accounting requirements
                </CardDescription>
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
                    No tasks found
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pending Tasks */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Pending Tasks</h3>
                      <div className="space-y-4">
                        {clientTasks
                          .filter((task: any) => task.status.toLowerCase() !== "completed")
                          .map((task: any) => (
                            <div key={task.id} className="flex items-start p-4 border rounded-md">
                              <div className="flex-shrink-0 mt-1 mr-4">
                                <Clock className="h-5 w-5 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium text-slate-900">
                                    {task.title}
                                  </p>
                                  <Badge variant={getTaskStatusVariant(task.status)}>
                                    {task.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                  {task.description}
                                </p>
                                <div className="mt-2 flex items-center text-xs text-slate-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Due: {formatDate(task.dueDate)}
                                </div>
                              </div>
                            </div>
                          ))}
                        
                        {clientTasks.filter(
                          (task: any) => task.status.toLowerCase() !== "completed"
                        ).length === 0 && (
                          <div className="text-center py-4 text-slate-500 border rounded-md">
                            No pending tasks
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Completed Tasks */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Completed Tasks</h3>
                      <div className="space-y-4">
                        {clientTasks
                          .filter((task: any) => task.status.toLowerCase() === "completed")
                          .map((task: any) => (
                            <div key={task.id} className="flex items-start p-4 border rounded-md bg-gray-50">
                              <div className="flex-shrink-0 mt-1 mr-4">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium text-slate-900">
                                    {task.title}
                                  </p>
                                  <Badge variant="success">
                                    Completed
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                  {task.description}
                                </p>
                                <div className="mt-2 flex items-center text-xs text-slate-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Completed on: {formatDate(task.completedDate || task.updatedAt || task.dueDate)}
                                </div>
                              </div>
                            </div>
                          ))}
                        
                        {clientTasks.filter(
                          (task: any) => task.status.toLowerCase() === "completed"
                        ).length === 0 && (
                          <div className="text-center py-4 text-slate-500 border rounded-md">
                            No completed tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Documents</CardTitle>
                <CardDescription>
                  Access your financial statements, tax returns, and other documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isDocumentsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : documentsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load documents. Please try again later.
                    </AlertDescription>
                  </Alert>
                ) : clientDocuments.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    No documents available
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Group documents by type */}
                    {["Tax Return", "Financial Statement", "Report"].map((type) => {
                      const docs = clientDocuments.filter(
                        (doc: any) => doc.type.toLowerCase() === type.toLowerCase()
                      );
                      
                      if (docs.length === 0) return null;
                      
                      return (
                        <div key={type}>
                          <h3 className="text-lg font-medium mb-4">{type}s</h3>
                          <div className="space-y-4">
                            {docs.map((doc: any) => (
                              <div key={doc.id} className="flex items-start p-4 border rounded-md">
                                <div className="flex-shrink-0 mt-1 mr-4">
                                  {getDocumentIcon(doc.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-slate-900">
                                      {doc.name}
                                    </p>
                                    <Button variant="outline" size="sm">
                                      Download
                                    </Button>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-1">
                                    {doc.description}
                                  </p>
                                  <div className="mt-2 flex items-center text-xs text-slate-500">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Uploaded: {formatDate(doc.date)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Other documents */}
                    {clientDocuments.filter(
                      (doc: any) => !["Tax Return", "Financial Statement", "Report"].includes(doc.type)
                    ).length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Other Documents</h3>
                        <div className="space-y-4">
                          {clientDocuments
                            .filter(
                              (doc: any) => !["Tax Return", "Financial Statement", "Report"].includes(doc.type)
                            )
                            .map((doc: any) => (
                              <div key={doc.id} className="flex items-start p-4 border rounded-md">
                                <div className="flex-shrink-0 mt-1 mr-4">
                                  {getDocumentIcon(doc.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-slate-900">
                                      {doc.name}
                                    </p>
                                    <Button variant="outline" size="sm">
                                      Download
                                    </Button>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-1">
                                    {doc.description}
                                  </p>
                                  <div className="mt-2 flex items-center text-xs text-slate-500">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Uploaded: {formatDate(doc.date)}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
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
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} AccFirm Management System
              </p>
            </div>
            <div className="flex space-x-6">
              <button className="text-sm text-slate-500 hover:text-slate-700">
                Privacy Policy
              </button>
              <button className="text-sm text-slate-500 hover:text-slate-700">
                Terms of Service
              </button>
              <button className="text-sm text-slate-500 hover:text-slate-700">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}