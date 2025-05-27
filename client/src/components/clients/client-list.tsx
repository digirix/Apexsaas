import { Search, Filter, Plus, Edit, Trash2, MoreHorizontal, Building2, CheckCircle, Clock, DollarSign, AlertTriangle, Users, FileText, Calendar } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Client } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AddClientModal } from "./add-client-modal";
import { EditClientModal } from "./edit-client-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent } from "@/components/ui/card";

export function ClientList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/v1/clients"],
  });

  // Fetch additional data for comprehensive client cards
  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/tasks"],
  });

  const { data: allEntities = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/entities"],
  });

  const { data: allInvoices = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/invoices"],
  });

  const filteredClients = clients.filter((client) =>
    client.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Helper functions to calculate client metrics
  function getClientMetrics(clientId: number) {
    const clientTasks = allTasks.filter(task => task.clientId === clientId);
    const clientEntities = allEntities.filter(entity => entity.clientId === clientId);
    const clientInvoices = allInvoices.filter(invoice => invoice.clientId === clientId);

    // Task metrics
    const totalTasks = clientTasks.length;
    const pendingTasks = clientTasks.filter(task => 
      task.statusId !== 1 // Assuming status ID 1 is "Completed"
    ).length;
    const overdueTasks = clientTasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      return dueDate < new Date() && task.statusId !== 1;
    }).length;

    // Financial metrics
    const totalOutstanding = clientInvoices
      .filter(invoice => ['sent', 'overdue', 'partially_paid'].includes(invoice.status))
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);

    const totalRevenue = clientInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);

    // Entity metrics
    const totalEntities = clientEntities.length;

    // Recent activity
    const recentTasks = clientTasks
      .filter(task => {
        const createdDate = new Date(task.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdDate >= thirtyDaysAgo;
      }).length;

    return {
      totalTasks,
      pendingTasks,
      overdueTasks,
      totalOutstanding,
      totalRevenue,
      totalEntities,
      recentTasks
    };
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Delete client mutation
  const deleteClient = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/v1/clients/${clientId}`,
        {}
      );
      return response;
    },
    onSuccess: () => {
      setIsDeleting(false);
      setIsDeleteConfirmationOpen(false);
      setSelectedClient(null);
      
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/clients"],
      });
      
      toast({
        title: "Client deleted",
        description: "Client has been deleted successfully",
      });
    },
    onError: (error: any) => {
      setIsDeleting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  // Handle view client
  function handleViewClient(clientId: number) {
    setLocation(`/clients/${clientId}`);
  }
  
  // Handle edit client
  function handleEditClient(client: Client, event: React.MouseEvent) {
    event.stopPropagation();
    setSelectedClient(client);
    setIsEditClientModalOpen(true);
  }
  
  // Handle delete client
  function handleDeleteClient(client: Client, event: React.MouseEvent) {
    event.stopPropagation();
    setSelectedClient(client);
    setIsDeleteConfirmationOpen(true);
  }
  
  // Confirm deletion
  function confirmDelete() {
    if (!selectedClient) return;
    
    setIsDeleting(true);
    deleteClient.mutate(selectedClient.id);
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Client Management
            </h2>
            <p className="text-sm text-slate-500">
              Manage your client information and entities
            </p>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" size="sm">
              <Filter className="-ml-1 mr-2 h-5 w-5 text-slate-500" />
              Filter
            </Button>
            <Button size="sm" onClick={() => setIsAddClientModalOpen(true)}>
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add Client
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="max-w-3xl">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Client Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-slate-500 mb-4">No clients found</p>
          <Button size="sm" onClick={() => setIsAddClientModalOpen(true)}>
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Your First Client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const metrics = getClientMetrics(client.id);
            
            return (
              <Card 
                key={client.id} 
                className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => handleViewClient(client.id)}
              >
                <CardContent className="p-6">
                  {/* Client Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <Avatar className={`h-12 w-12 ${getRandomColor(client.displayName)}`}>
                        <AvatarFallback className="text-white text-lg font-semibold">
                          {getInitials(client.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {client.displayName}
                        </h3>
                        <p className="text-sm text-slate-500">{client.email}</p>
                        <p className="text-xs text-slate-400">{client.mobile}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={client.status === 'Active' ? 'success' : 'warning'}>
                        {client.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e: any) => handleEditClient(client, e)}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e: any) => handleDeleteClient(client, e)}
                            className="cursor-pointer text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Total Outstanding */}
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <DollarSign className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Outstanding</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(metrics.totalOutstanding)}
                        </p>
                      </div>
                    </div>

                    {/* Total Revenue */}
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Revenue</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(metrics.totalRevenue)}
                        </p>
                      </div>
                    </div>

                    {/* Pending Tasks */}
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <Clock className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Pending Tasks</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {metrics.pendingTasks}
                        </p>
                      </div>
                    </div>

                    {/* Total Entities */}
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Entities</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {metrics.totalEntities}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Indicators */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center space-x-4">
                      {/* Portal Access */}
                      {client.hasPortalAccess && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-slate-600">Portal</span>
                        </div>
                      )}
                      
                      {/* Overdue Tasks Warning */}
                      {metrics.overdueTasks > 0 && (
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="text-xs text-red-600">{metrics.overdueTasks} Overdue</span>
                        </div>
                      )}
                      
                      {/* Recent Activity */}
                      {metrics.recentTasks > 0 && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600">{metrics.recentTasks} Recent</span>
                        </div>
                      )}
                    </div>

                    {/* Total Tasks Summary */}
                    <div className="text-xs text-slate-500">
                      {metrics.totalTasks} total tasks
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination for Cards */}
      {filteredClients.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{filteredClients.length}</span> of{" "}
              <span className="font-medium">{filteredClients.length}</span> results
            </p>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  1
                </PaginationLink>
              </PaginationItem>
              {filteredClients.length > 10 && (
                <>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
      />
      
      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditClientModalOpen}
        onClose={() => {
          setIsEditClientModalOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
      />
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteConfirmationOpen}
        onClose={() => {
          setIsDeleteConfirmationOpen(false);
          setSelectedClient(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Client"
        description={`Are you sure you want to delete client "${selectedClient?.displayName}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  );
}
