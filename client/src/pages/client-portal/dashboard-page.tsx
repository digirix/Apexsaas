import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, LogOut, User, FileText, CreditCard, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

interface ClientPortalUser {
  id: number;
  clientId: number;
  tenantId: number;
  username: string;
  displayName: string;
  email: string;
  isClientPortalUser: boolean;
}

export default function ClientPortalDashboardPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch client user data
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ["/api/client-portal/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/client-portal/me");
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      const data = await response.json();
      return data.user as ClientPortalUser;
    },
    retry: false,
  });

  // Fetch client entities
  const { data: entities = [] } = useQuery({
    queryKey: ["/api/client-portal/entities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/client-portal/entities");
      if (!response.ok) {
        throw new Error("Failed to fetch entities");
      }
      return response.json();
    },
    enabled: !!userData,
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/client-portal/invoices"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/client-portal/invoices");
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }
      return response.json();
    },
    enabled: !!userData,
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ["/api/client-portal/documents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/client-portal/documents");
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      return response.json();
    },
    enabled: !!userData,
  });

  // Fetch upcoming tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/client-portal/tasks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/client-portal/tasks");
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return response.json();
    },
    enabled: !!userData,
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/client-portal/logout");
      navigate("/client-portal/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (error) {
      navigate("/client-portal/login");
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden md:inline-block">
              Welcome, {userData?.displayName}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="tasks">Upcoming Tasks</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 mt-6">
              {/* Profile Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{userData?.displayName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{userData?.email}</dd>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full">
                        Update Profile
                      </Button>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Invoices Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Invoices</dt>
                      <dd className="mt-1 text-sm text-gray-900">{invoices.length || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Open Invoices</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {invoices.filter((i: any) => i.status === 'sent' || i.status === 'overdue').length || 0}
                      </dd>
                    </div>
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setActiveTab("invoices")}
                      >
                        View All Invoices
                      </Button>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Documents Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Documents</dt>
                      <dd className="mt-1 text-sm text-gray-900">{documents.length || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Recent Uploads</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {documents.filter((d: any) => {
                          const uploadDate = new Date(d.uploadedAt);
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return uploadDate > thirtyDaysAgo;
                        }).length || 0}
                      </dd>
                    </div>
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setActiveTab("documents")}
                      >
                        View All Documents
                      </Button>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Tasks Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Upcoming Tasks
                </CardTitle>
                <CardDescription>
                  Your upcoming deadlines and required actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming tasks</p>
                ) : (
                  <div className="space-y-4">
                    {tasks.slice(0, 3).map((task: any) => (
                      <div key={task.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <h3 className="text-sm font-medium">{task.title}</h3>
                        <p className="text-xs text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                      </div>
                    ))}
                    {tasks.length > 3 && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="px-0"
                        onClick={() => setActiveTab("tasks")}
                      >
                        View all {tasks.length} tasks
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Entities List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Entities</CardTitle>
                <CardDescription>
                  Companies and other business entities managed by your accountant
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entities.length === 0 ? (
                  <p className="text-sm text-gray-500">No entities found</p>
                ) : (
                  <div className="space-y-4">
                    {entities.map((entity: any) => (
                      <div key={entity.id} className="p-4 border rounded-md">
                        <h3 className="font-medium">{entity.name}</h3>
                        <p className="text-sm text-gray-500">{entity.entityType}</p>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Tax ID:</span> {entity.businessTaxId || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500">VAT Registered:</span> {entity.isVatRegistered ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Your Invoices</CardTitle>
                <CardDescription>
                  View and pay your outstanding invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-sm text-gray-500">No invoices found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-xs uppercase">
                        <tr>
                          <th className="px-6 py-3">Invoice #</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Amount</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice: any) => (
                          <tr key={invoice.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{invoice.invoiceNumber}</td>
                            <td className="px-6 py-4">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4">{invoice.totalAmount}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Button variant="outline" size="sm">View</Button>
                              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                <Button variant="default" size="sm" className="ml-2">Pay</Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Your Documents</CardTitle>
                <CardDescription>
                  Access and download your financial documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-500">No documents found</p>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between border-b pb-4">
                        <div>
                          <h3 className="font-medium">{doc.fileName}</h3>
                          <p className="text-sm text-gray-500">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">{doc.fileSize}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
                <CardDescription>
                  Your upcoming deadlines and required actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming tasks</p>
                ) : (
                  <div className="space-y-6">
                    {tasks.map((task: any) => (
                      <div key={task.id} className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg">{task.title}</h3>
                            <p className="text-sm text-gray-500">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            new Date(task.dueDate) < new Date() ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {new Date(task.dueDate) < new Date() ? 'Overdue' : 'Upcoming'}
                          </span>
                        </div>
                        <Separator className="my-3" />
                        <p className="text-sm">{task.description}</p>
                        <div className="mt-4 flex justify-end">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}