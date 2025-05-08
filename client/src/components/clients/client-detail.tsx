import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Client, Entity, Country, State, EntityType, Task, Invoice } from "@shared/schema";
import { 
  ArrowLeft, Edit, Plus, MapPin, Building, FileText, Settings, Trash2, 
  CalendarClock, CheckCircle2, Clock, AlertCircle, CreditCard, Search,
  User, Key, Mail, UserPlus, RefreshCw, Filter, Download
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddEntityModal } from "./add-entity-modal";
import { EditEntityModal } from "./edit-entity-modal";
import { EntityConfigModal } from "./entity-config-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { EditClientModal } from "./edit-client-modal";


interface ClientDetailProps {
  clientId: number;
}

// Client Tasks Component
function ClientTasks({ clientId }: { clientId: number }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  // Fetch tasks for this client
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/v1/tasks?clientId=${clientId}`],
    enabled: !!clientId,
  });
  
  // Fetch task statuses
  const { data: taskStatuses = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });
  
  // Filter tasks based on search and status
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchTerm === "" || 
      (task.taskDetails?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || task.statusId.toString() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status name by ID
  const getStatusName = (statusId: number) => {
    const status = taskStatuses.find(s => s.id === statusId);
    return status ? status.name : "Unknown";
  };
  
  // Get status badge variant by status
  const getStatusVariant = (statusId: number) => {
    const status = taskStatuses.find(s => s.id === statusId);
    if (!status) return "default";
    
    switch (status.rank) {
      case 1: return "secondary"; // Not Started
      case 2: return "warning";   // In Progress
      case 3: return "success";   // Completed
      default: return "default";
    }
  };
  
  // Handle view task details
  const handleViewTask = (taskId: number) => {
    setLocation(`/tasks/${taskId}`);
  };
  
  if (isTasksLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search tasks..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {taskStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="bg-slate-50 rounded-md p-8 text-center">
          <p className="text-slate-500">No tasks found for this client.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{task.taskDetails || "No description"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500">
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusVariant(task.statusId)}>
                        {getStatusName(task.statusId)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        variant="link" 
                        onClick={() => handleViewTask(task.id)}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Client Invoices Component
function ClientInvoices({ clientId }: { clientId: number }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  // Fetch invoices for this client
  const { data: invoices = [], isLoading: isInvoicesLoading } = useQuery<Invoice[]>({
    queryKey: [`/api/v1/finance/invoices?clientId=${clientId}`],
    enabled: !!clientId,
  });
  
  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === "" || 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get status badge variant by status
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft': return "secondary";
      case 'sent': return "warning";
      case 'paid': return "success";
      case 'overdue': return "destructive";
      default: return "outline";
    }
  };
  
  // Format currency
  const formatCurrency = (amount: string | number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(Number(amount));
  };
  
  // Handle view invoice details
  const handleViewInvoice = (invoiceId: number) => {
    setLocation(`/finance/invoices/${invoiceId}`);
  };
  
  if (isInvoicesLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search invoices..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {filteredInvoices.length === 0 ? (
        <div className="bg-slate-50 rounded-md p-8 text-center">
          <p className="text-slate-500">No invoices found for this client.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{invoice.invoiceNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500">
                        {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {formatCurrency(invoice.totalAmount, invoice.currencyCode)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusVariant(invoice.status)}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button 
                          variant="link" 
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="text-blue-500 hover:text-blue-600"
                        >
                          View
                        </Button>
                        {invoice.status !== 'paid' && invoice.status !== 'canceled' && (
                          <Button
                            variant="link"
                            className="text-green-500 hover:text-green-600"
                            onClick={() => setLocation(`/finance/invoices/${invoice.id}/payment`)}
                          >
                            Pay
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientDetail({ clientId }: ClientDetailProps) {
  const [, setLocation] = useLocation();
  const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false);
  const [isEntityConfigModalOpen, setIsEntityConfigModalOpen] = useState(false);
  const [isEditEntityModalOpen, setIsEditEntityModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isDeleteEntityModalOpen, setIsDeleteEntityModalOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("entities");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const { toast } = useToast();

  const { data: client, isLoading: isClientLoading } = useQuery<Client>({
    queryKey: [`/api/v1/clients/${clientId}`],
  });

  const { data: entities = [], isLoading: isEntitiesLoading } = useQuery<Entity[]>({
    queryKey: [`/api/v1/clients/${clientId}/entities`],
    enabled: !!clientId,
  });
  
  // Create entity service counts map
  const [entityServiceCounts, setEntityServiceCounts] = useState<Record<number, number>>({});
  const [entityTaxJurisdictionCounts, setEntityTaxJurisdictionCounts] = useState<Record<number, number>>({});
  
  // Fetch entity service counts when entities are loaded
  useEffect(() => {
    const fetchEntityServicesAndTaxes = async () => {
      if (!entities.length) return;
      
      const serviceCounts: Record<number, number> = {};
      const taxCounts: Record<number, number> = {};
      
      for (const entity of entities) {
        try {
          // Fetch service subscriptions
          const servicesRes = await fetch(`/api/v1/entities/${entity.id}/services`);
          const services = await servicesRes.json();
          
          // Count subscribed services
          serviceCounts[entity.id] = services.filter(
            (s: any) => s.isSubscribed
          ).length;
          
          // Only fetch tax jurisdictions if VAT registered
          if (entity.isVatRegistered) {
            const taxesRes = await fetch(`/api/v1/entities/${entity.id}/tax-jurisdictions`);
            const taxes = await taxesRes.json();
            taxCounts[entity.id] = taxes.length;
          }
        } catch (error) {
          console.error(`Error fetching data for entity ${entity.id}:`, error);
        }
      }
      
      setEntityServiceCounts(serviceCounts);
      setEntityTaxJurisdictionCounts(taxCounts);
    };
    
    fetchEntityServicesAndTaxes();
  }, [entities]);
  
  // Fetch countries for reference
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
  });
  
  // Fetch states for reference
  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["/api/v1/setup/states"],
  });
  
  // Fetch entity types for reference
  const { data: entityTypes = [] } = useQuery<EntityType[]>({
    queryKey: ["/api/v1/setup/entity-types"],
  });

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  function getRandomColor(name: string): string {
    const colors = [
      "bg-blue-500", 
      "bg-purple-500", 
      "bg-red-500", 
      "bg-green-500", 
      "bg-yellow-500"
    ];
    
    // Simple hash function
    const hash = name.split("").reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colors[hash % colors.length];
  }

  // Entity deletion
  const deleteEntity = useMutation({
    mutationFn: async (entityId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/v1/entities/${entityId}`,
        {}
      );
      return response;
    },
    onSuccess: () => {
      setIsDeleting(false);
      setIsDeleteEntityModalOpen(false);
      setSelectedEntity(null);
      
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/clients/${clientId}/entities`],
      });
      
      toast({
        title: "Entity deleted",
        description: "Entity has been deleted successfully",
      });
    },
    onError: (error: any) => {
      setIsDeleting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to delete entity",
        variant: "destructive",
      });
    },
  });
  
  // Handle edit entity
  const handleEditEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsEditEntityModalOpen(true);
  };
  
  // Handle delete entity
  const handleDeleteEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsDeleteEntityModalOpen(true);
  };
  
  // Edit client
  const handleEditClient = () => {
    setIsEditClientModalOpen(true);
  };
  
  // Confirm entity deletion
  const confirmDeleteEntity = () => {
    if (!selectedEntity) return;
    
    setIsDeleting(true);
    deleteEntity.mutate(selectedEntity.id);
  };

  const handleBackToClients = () => {
    setLocation("/clients");
  };

  if (isClientLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-slate-500 mb-4">Client not found</p>
        <Button variant="outline" onClick={handleBackToClients}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackToClients} 
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <h1 className="text-xl font-semibold text-slate-800">Client Details</h1>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEditClient}
          >
            <Edit className="-ml-0.5 mr-2 h-4 w-4 text-slate-500" />
            Edit Client
          </Button>
          <Button size="sm" onClick={() => setIsAddEntityModalOpen(true)}>
            <Plus className="-ml-0.5 mr-2 h-4 w-4" />
            Add Entity
          </Button>
        </div>
      </div>
      
      {/* Client Information Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center">
            <Avatar className={`h-12 w-12 ${getRandomColor(client.displayName)}`}>
              <AvatarFallback className="text-white">
                {getInitials(client.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <h2 className="text-lg font-medium text-slate-900">
                {client.displayName}
              </h2>
              <p className="text-sm text-slate-500">{client.email}</p>
            </div>
          </div>
          
          <div className="mt-6 border-t border-slate-200 pt-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-slate-500">Mobile</dt>
                <dd className="mt-1 text-sm text-slate-900">{client.mobile}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-slate-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant={client.status === 'Active' ? 'success' : 'warning'}>
                    {client.status}
                  </Badge>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-slate-500">Total Entities</dt>
                <dd className="mt-1 text-sm text-slate-900">{entities.length}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-slate-500">Created On</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {new Date(client.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs Navigation */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent h-auto p-0">
          <TabsTrigger 
            value="entities" 
            className="rounded-none data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-b-2 border-transparent py-4 px-1 font-medium text-sm"
          >
            Entities
          </TabsTrigger>
          <TabsTrigger 
            value="portal-access" 
            className="rounded-none data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-b-2 border-transparent py-4 px-1 font-medium text-sm"
          >
            Portal Access
          </TabsTrigger>
          <TabsTrigger 
            value="tasks" 
            className="rounded-none data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-b-2 border-transparent py-4 px-1 font-medium text-sm"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger 
            value="invoices" 
            className="rounded-none data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-b-2 border-transparent py-4 px-1 font-medium text-sm"
          >
            Invoices
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="entities" className="pt-4">
          {isEntitiesLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : entities.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-slate-500 mb-4">No entities found for this client</p>
                <Button onClick={() => setIsAddEntityModalOpen(true)}>
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Add First Entity
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-slate-200">
                {entities.map((entity) => (
                  <li key={entity.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-slate-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium text-slate-800">
                            {entity.name}
                          </h3>
                          <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                            <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                              <MapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                              <span>
                                {countries.find((c: Country) => c.id === entity.countryId)?.name || 'Unknown Country'}
                                {entity.stateId && states.find((s: State) => s.id === entity.stateId) && 
                                  `, ${states.find((s: State) => s.id === entity.stateId)?.name}`}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                              <Building className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                              <span>
                                {entityTypes.find((t: EntityType) => t.id === entity.entityTypeId)?.name || 'Unknown Type'}
                              </span>
                            </div>
                            {entity.businessTaxId && (
                              <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                                <FileText className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                                <span>{entity.businessTaxId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9"
                            title="Configure Entity"
                            onClick={() => {
                              setSelectedEntityId(entity.id);
                              setIsEntityConfigModalOpen(true);
                            }}
                          >
                            <Settings className="h-5 w-5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9"
                            title="Edit Entity"
                            onClick={() => handleEditEntity(entity)}
                          >
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 text-red-500 hover:text-red-600"
                            title="Delete Entity"
                            onClick={() => handleDeleteEntity(entity)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-1.5 h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {entityServiceCounts[entity.id] || 0} Services
                          </Badge>
                          {entity.isVatRegistered && (
                            <>
                              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-1.5 h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                VAT Registered
                              </Badge>
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-1.5 h-3 w-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {entityTaxJurisdictionCounts[entity.id] || 0} Tax Jurisdictions
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="portal-access" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Portal Access</CardTitle>
                  <CardDescription>Manage client portal access for {client.displayName}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Credentials Reset",
                        description: "Client portal credentials have been reset and emailed to the client.",
                      });
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Credentials
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Portal Invitation Sent",
                        description: "Portal access invitation sent to client email.",
                      });
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite to Portal
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-blue-100">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center">
                        <User className="h-5 w-5 mr-2 text-blue-500" />
                        Portal Account Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Status</dt>
                          <dd className="mt-1 text-sm text-slate-900 flex items-center">
                            <Badge variant="success" className="mr-2">Active</Badge>
                            Last login: Never
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Portal Username</dt>
                          <dd className="mt-1 text-sm text-slate-900">{client.email}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-blue-100">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center">
                        <Key className="h-5 w-5 mr-2 text-blue-500" />
                        Access Permissions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Document Access</dt>
                          <dd className="mt-1 text-sm text-slate-900 flex items-center">
                            <Badge variant="outline" className="mr-2">Read Only</Badge>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-slate-500">Invoice Access</dt>
                          <dd className="mt-1 text-sm text-slate-900 flex items-center">
                            <Badge variant="outline" className="mr-2">Read Only</Badge>
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-900 mb-3">Recent Portal Activity</h3>
                  <div className="bg-slate-50 rounded-md p-4 text-sm text-slate-600">
                    No recent portal activity found for this client.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Client Tasks</CardTitle>
                  <CardDescription>Manage tasks for {client.displayName}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation(`/tasks?clientId=${clientId}`)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    View All
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setLocation(`/tasks/new?clientId=${clientId}`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <ClientTasks clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoices" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Client Invoices</CardTitle>
                  <CardDescription>Manage invoices for {client.displayName}</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation(`/finance/invoices?clientId=${clientId}`)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    View All
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setLocation(`/finance/invoices/new?clientId=${clientId}`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <ClientInvoices clientId={clientId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AddEntityModal
        isOpen={isAddEntityModalOpen}
        onClose={() => setIsAddEntityModalOpen(false)}
        clientId={clientId}
      />
      
      <EntityConfigModal 
        isOpen={isEntityConfigModalOpen}
        onClose={() => {
          setIsEntityConfigModalOpen(false);
          setSelectedEntityId(null);
        }}
        entityId={selectedEntityId}
        clientId={clientId}
      />
      
      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditClientModalOpen}
        onClose={() => setIsEditClientModalOpen(false)}
        client={client}
      />
      
      {/* Edit Entity Modal */}
      <EditEntityModal
        isOpen={isEditEntityModalOpen}
        onClose={() => {
          setIsEditEntityModalOpen(false);
          setSelectedEntity(null);
        }}
        entity={selectedEntity}
        clientId={clientId}
      />
      
      {/* Delete Entity Confirmation */}
      <DeleteConfirmationDialog
        isOpen={isDeleteEntityModalOpen}
        onClose={() => {
          setIsDeleteEntityModalOpen(false);
          setSelectedEntity(null);
        }}
        onConfirm={confirmDeleteEntity}
        title="Delete Entity"
        description={`Are you sure you want to delete entity "${selectedEntity?.name}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </>
  );
}
