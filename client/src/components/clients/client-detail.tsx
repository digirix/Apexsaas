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
import { TaskDetails } from "@/components/tasks/task-details";
import { AddTaskModal } from "@/components/tasks/add-task-modal";
import { InvoiceDetails } from "@/components/finance/invoice-details";
import { ClientPortalAccessTab } from "./client-portal-access-tab";


interface ClientDetailProps {
  clientId: number;
}

// Client Tasks Component
function ClientTasks({ clientId }: { clientId: number }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  
  // Fetch tasks for this client
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/v1/tasks?clientId=${clientId}`],
    enabled: !!clientId,
  });
  
  // Fetch task statuses
  const { data: taskStatuses = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });
  
  // Filter tasks based on search term and status filter
  const filteredTasks = tasks.filter(task => {
    // Filter by search term
    const matchesSearch = searchTerm === "" || 
      (task.title && task.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by status
    const matchesStatus = !statusFilter || task.statusId.toString() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Handle view task details
  const handleViewTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailsOpen(true);
  };
  
  return (
    <div className="space-y-4">
      {/* Search & Filter UI */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search tasks..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Statuses" />
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
      
      {/* Tasks Table */}
      {isTasksLoading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          No tasks found for this client
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
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
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTasks.map((task) => {
                // Find status name
                const status = taskStatuses.find(s => s.id === task.statusId);
                
                return (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{task.title}</div>
                      <div className="text-sm text-slate-500">{task.description?.substring(0, 60)}{task.description && task.description.length > 60 ? "..." : ""}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500">
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={
                        status?.category === 'completed' ? 'success' : 
                        status?.category === 'in_progress' ? 'default' : 
                        status?.category === 'not_started' ? 'secondary' : 
                        status?.category === 'overdue' ? 'destructive' : 
                        'outline'
                      }>
                        {status?.name || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button 
                        variant="link" 
                        onClick={() => handleViewTask(task.id)}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetails
          taskId={selectedTaskId}
          isOpen={isTaskDetailsOpen}
          onClose={() => {
            setIsTaskDetailsOpen(false);
            setTimeout(() => setSelectedTaskId(null), 300);
          }}
        />
      )}
    </div>
  );
}

// Client Invoices Component
function ClientInvoices({ clientId }: { clientId: number }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Currency formatter
  const formatCurrency = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
    }).format(parseFloat(amount));
  };
  
  // Status badge variant helper
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'destructive';
      case 'sent':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'void':
        return 'outline';
      case 'partially_paid':
        return 'warning';
      default:
        return 'outline';
    }
  };
  
  // Fetch invoices for this client
  const { data: invoices = [], isLoading: isInvoicesLoading } = useQuery<Invoice[]>({
    queryKey: [`/api/v1/invoices?clientId=${clientId}`],
    enabled: !!clientId,
  });
  
  // Filter invoices based on search term and status filter
  const filteredInvoices = invoices.filter(invoice => {
    // Filter by search term
    const matchesSearch = searchTerm === "" || 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Handle view invoice details
  const handleViewInvoice = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setIsInvoiceDetailsOpen(true);
  };
  
  return (
    <div className="space-y-4">
      {/* Search & Filter UI */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search invoices..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Invoices Table */}
      {isInvoicesLoading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          No invoices found for this client
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Invoice Number
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
            <tbody className="bg-white divide-y divide-slate-200">
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
      )}
      
      {/* Invoice Details Modal */}
      {selectedInvoiceId && (
        <InvoiceDetails
          invoiceId={selectedInvoiceId}
          isOpen={isInvoiceDetailsOpen}
          onClose={() => {
            setIsInvoiceDetailsOpen(false);
            setTimeout(() => setSelectedInvoiceId(null), 300);
          }}
        />
      )}
    </div>
  );
}

export function ClientDetail({ clientId }: ClientDetailProps) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("entities");
  const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isEntityConfigModalOpen, setIsEntityConfigModalOpen] = useState(false);
  const [isEditEntityModalOpen, setIsEditEntityModalOpen] = useState(false);
  const [isDeleteEntityModalOpen, setIsDeleteEntityModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityServiceCounts, setEntityServiceCounts] = useState<Record<number, number>>({});
  const [entityTaxJurisdictionCounts, setEntityTaxJurisdictionCounts] = useState<Record<number, number>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch client data
  const { data: client, isLoading: isClientLoading, error: clientError } = useQuery<Client>({
    queryKey: [`/api/v1/clients/${clientId}`],
    enabled: !!clientId
  });
  
  // Fetch client entities
  const { data: entities = [], isLoading: isEntitiesLoading } = useQuery<Entity[]>({
    queryKey: [`/api/v1/clients/${clientId}/entities`],
    enabled: !!clientId
  });
  
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
  
  // Get country and state names
  const getLocationDisplay = (entity: Entity) => {
    const country = countries.find(c => c.id === entity.countryId);
    const state = states.find(s => s.id === entity.stateId);
    
    return [state?.name, country?.name].filter(Boolean).join(", ");
  };
  
  // Get entity type name
  const getEntityType = (entity: Entity) => {
    return entityTypes.find(et => et.id === entity.entityTypeId)?.name || "Unknown";
  };
  
  // Delete Entity mutation
  const deleteEntityMutation = useMutation({
    mutationFn: async (entityId: number) => {
      const response = await apiRequest("DELETE", `/api/v1/entities/${entityId}`);
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: "Entity deleted",
        description: "The entity has been deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}/entities`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting entity",
        description: error.message || "There was an error deleting the entity",
        variant: "destructive",
      });
    },
  });
  
  const confirmDeleteEntity = async () => {
    if (!selectedEntity) return;
    
    setIsDeleting(true);
    try {
      await deleteEntityMutation.mutateAsync(selectedEntity.id);
      setIsDeleteEntityModalOpen(false);
      setSelectedEntity(null);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle entity actions
  const handleConfigureEntity = (entityId: number) => {
    setSelectedEntityId(entityId);
    setIsEntityConfigModalOpen(true);
  };
  
  const handleEditEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsEditEntityModalOpen(true);
  };
  
  const handleDeleteEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsDeleteEntityModalOpen(true);
  };
  
  // If client is loading or error occurred
  if (isClientLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (clientError || !client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500 mb-4">Error loading client details</p>
        <Button onClick={() => setLocation("/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    );
  }
  
  return (
    <>
      {/* Client Header Card */}
      <div className="flex justify-between items-start mb-6">
        <Button variant="outline" onClick={() => setLocation("/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
        <Button onClick={() => setIsEditClientModalOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Client
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Avatar className="h-16 w-16 bg-blue-100 text-blue-600">
              <AvatarFallback>
                {client.displayName
                  .split(" ")
                  .map(n => n[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2)}
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
                  <Plus className="mr-2 h-4 w-4" />
                  Add Entity
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="flex justify-end p-4">
                <Button onClick={() => setIsAddEntityModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Entity
                </Button>
              </div>
              <ul className="divide-y divide-slate-200">
                {entities.map((entity) => (
                  <li key={entity.id}>
                    <div className="block hover:bg-slate-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Building className="h-5 w-5 text-blue-500 mr-3" />
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {entity.name}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleConfigureEntity(entity.id)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Configure
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditEntity(entity)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteEntity(entity)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-slate-500">
                              <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                              {getEntityType(entity)}
                            </p>
                            <p className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0 sm:ml-6">
                              <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                              {getLocationDisplay(entity)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
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
          <ClientPortalAccessTab clientId={clientId} tenantId={client?.tenantId || 0} />
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
                    onClick={() => setIsAddTaskModalOpen(true)}
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
      
      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        taskType="revenue"
        preselectedClientId={clientId.toString()}
      />
    </>
  );
}