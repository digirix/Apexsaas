import { Search, Filter, Plus, Edit, Trash2, MoreHorizontal, Building2, CheckCircle, Clock, DollarSign, AlertTriangle, Users, FileText, Calendar, Grid3X3, List, ChevronDown } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function ClientList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // View and pagination state for scalability
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table'); // Default to table for large datasets
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/v1/clients"],
  });

  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/tasks"],
  });

  const { data: allInvoices = [] } = useQuery<any[]>({
    queryKey: ["/api/v1/invoices"],
  });

  // Advanced filtering and sorting for large datasets
  const filteredAndSortedClients = clients
    .filter((client) => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        client.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.mobile.includes(searchTerm);
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'tasks':
          const aTaskCount = allTasks.filter(task => task.clientId === a.id).length;
          const bTaskCount = allTasks.filter(task => task.clientId === b.id).length;
          comparison = aTaskCount - bTaskCount;
          break;
        case 'outstanding':
          const aOutstanding = getClientMetrics(a.id).totalOutstanding;
          const bOutstanding = getClientMetrics(b.id).totalOutstanding;
          comparison = aOutstanding - bOutstanding;
          break;
        default:
          comparison = a.displayName.localeCompare(b.displayName);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalItems = filteredAndSortedClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredAndSortedClients.slice(startIndex, endIndex);

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function getRandomColor(name: string): string {
    const colors = [
      "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
      "#06B6D4", "#84CC16", "#F97316", "#EC4899", "#6366F1"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  function getClientMetrics(clientId: number) {
    const clientTasks = allTasks.filter(task => task.clientId === clientId);
    const clientInvoices = allInvoices.filter(invoice => invoice.clientId === clientId);
    
    const totalOutstanding = clientInvoices
      .filter(invoice => invoice.status === 'sent' || invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
      
    const totalRevenue = clientInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
      
    const pendingTasks = clientTasks.filter(task => task.statusId !== 1).length;
    const overdueCount = clientTasks.filter(task => 
      task.statusId !== 1 && new Date(task.dueDate) < new Date()
    ).length;
    
    const entityCount = 1; // Simplified for now
    
    return {
      totalOutstanding,
      totalRevenue,
      pendingTasks,
      overdueCount,
      entityCount
    };
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function handleViewClient(clientId: number) {
    setLocation(`/clients/${clientId}`);
  }

  function handleEditClient(client: Client, event: React.MouseEvent) {
    event.stopPropagation();
    setSelectedClient(client);
    setIsEditClientModalOpen(true);
  }

  function handleDeleteClient(client: Client, event: React.MouseEvent) {
    event.stopPropagation();
    setSelectedClient(client);
    setIsDeleteConfirmationOpen(true);
  }

  const deleteClient = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest(`/api/v1/clients/${clientId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete client");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/clients"] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      setIsDeleteConfirmationOpen(false);
      setSelectedClient(null);
      setIsDeleting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
      setIsDeleting(false);
    },
  });

  function confirmDelete() {
    if (!selectedClient) return;
    setIsDeleting(true);
    deleteClient.mutate(selectedClient.id);
  }

  return (
    <>
      {/* Header with Statistics Summary */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Client Management
            </h2>
            <div className="flex items-center space-x-6 mt-2">
              <div className="text-sm text-slate-600">
                <span className="font-medium">{totalItems}</span> total clients
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-medium">{clients.filter(c => c.status === 'Active').length}</span> active
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-medium">
                  {allTasks.filter(task => 
                    task.statusId !== 1 && // Not completed
                    new Date(task.dueDate) < new Date() // Overdue
                  ).length}
                </span> overdue tasks
              </div>
            </div>
          </div>

          <Button onClick={() => setIsAddClientModalOpen(true)}>
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Advanced Controls Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search clients, emails, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="created">Date Added</SelectItem>
                <SelectItem value="tasks">Task Count</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order & Items per Page */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Responsive View */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : paginatedClients.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">
            {filteredAndSortedClients.length === 0 ? "No clients found" : "No clients match your filters"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredAndSortedClients.length === 0 
              ? "Get started by creating a new client."
              : "Try adjusting your search or filter criteria."
            }
          </p>
          {filteredAndSortedClients.length === 0 && (
            <div className="mt-6">
              <Button onClick={() => setIsAddClientModalOpen(true)}>
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add Client
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            /* Table View for Large Datasets */
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Outstanding
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Tasks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Entities
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedClients.map((client) => {
                      const metrics = getClientMetrics(client.id);
                      
                      return (
                        <tr 
                          key={client.id} 
                          className="hover:bg-slate-50 cursor-pointer"
                          onClick={() => handleViewClient(client.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-3">
                                <AvatarFallback 
                                  className="text-xs font-medium text-white"
                                  style={{ backgroundColor: getRandomColor(client.displayName) }}
                                >
                                  {getInitials(client.displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {client.displayName}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {client.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={client.status === "Active" ? "default" : "secondary"}
                              className={
                                client.status === "Active"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                              }
                            >
                              {client.status === "Active" ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <Clock className="w-3 h-3 mr-1" />
                              )}
                              {client.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${
                              metrics.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(metrics.totalOutstanding)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-slate-900">
                                {metrics.pendingTasks}
                              </span>
                              {metrics.overdueCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {metrics.overdueCount} overdue
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {metrics.entityCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => handleEditClient(client, e)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => handleDeleteClient(client, e)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View for Visual Overview */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedClients.map((client) => {
                const metrics = getClientMetrics(client.id);
                
                return (
                  <Card 
                    key={client.id} 
                    className="group hover:shadow-md transition-all duration-200 cursor-pointer border-slate-200"
                    onClick={() => handleViewClient(client.id)}
                  >
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                            <AvatarFallback 
                              className="text-sm font-medium text-white"
                              style={{ backgroundColor: getRandomColor(client.displayName) }}
                            >
                              {getInitials(client.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                              {client.displayName}
                            </h3>
                            <p className="text-sm text-slate-500">{client.email}</p>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEditClient(client, e)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => handleDeleteClient(client, e)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Status Badge */}
                      <div className="mb-4">
                        <Badge
                          variant={client.status === "Active" ? "default" : "secondary"}
                          className={
                            client.status === "Active"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                          }
                        >
                          {client.status === "Active" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {client.status}
                        </Badge>
                      </div>

                      {/* Key Metrics */}
                      <div className="space-y-3">
                        {/* Financial Summary */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-slate-500" />
                            <span className="text-sm text-slate-600">Outstanding</span>
                          </div>
                          <span className={`text-sm font-medium ${
                            metrics.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(metrics.totalOutstanding)}
                          </span>
                        </div>

                        {/* Tasks Overview */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-slate-600">Pending Tasks</span>
                          </div>
                          <span className="text-sm font-medium text-blue-600">
                            {metrics.pendingTasks}
                          </span>
                        </div>

                        {/* Activity Indicators */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center space-x-1 text-slate-500">
                            <Users className="h-3 w-3" />
                            <span>{metrics.entityCount} entities</span>
                          </div>
                          <div className="flex items-center space-x-1 text-slate-500">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {metrics.overdueCount > 0 && (
                                <span className="text-red-500 font-medium">
                                  {metrics.overdueCount} overdue
                                </span>
                              )}
                              {metrics.overdueCount === 0 && "Up to date"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} clients
              </div>
              
              <Pagination>
                <PaginationContent>
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="cursor-pointer"
                      />
                    </PaginationItem>
                  )}
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    </>
                  )}
                  
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="cursor-pointer"
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
      />

      {selectedClient && (
        <EditClientModal
          isOpen={isEditClientModalOpen}
          onClose={() => {
            setIsEditClientModalOpen(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteConfirmationOpen}
        onClose={() => {
          setIsDeleteConfirmationOpen(false);
          setSelectedClient(null);
          setIsDeleting(false);
        }}
        onConfirm={confirmDelete}
        title="Delete Client"
        description={`Are you sure you want to delete "${selectedClient?.displayName}"? This action cannot be undone.`}
      />
    </>
  );
}