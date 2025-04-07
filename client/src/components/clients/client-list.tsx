import { Search, Filter, Plus, Edit, Trash2, MoreHorizontal } from "lucide-react";
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

      {/* Client List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
          <ul className="divide-y divide-slate-200">
            {filteredClients.map((client) => (
              <li key={client.id} className="hover:bg-slate-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center text-left"
                      onClick={() => handleViewClient(client.id)}
                    >
                      <Avatar className={`h-10 w-10 ${getRandomColor(client.displayName)}`}>
                        <AvatarFallback className="text-white">
                          {getInitials(client.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {client.displayName}
                        </div>
                        <div className="text-sm text-slate-500">
                          {client.email}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-end">
                        <div className="text-sm text-slate-500">
                          {/* Will be populated with entities count in real app */}
                          0 Entities
                        </div>
                        <div className="mt-1 flex items-center">
                          <Badge variant={client.status === 'Active' ? 'success' : 'warning'}>
                            {client.status}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-5 w-5" />
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
                </div>
              </li>
            ))}
          </ul>
        )}

        {filteredClients.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button variant="outline" size="sm">
                Previous
              </Button>
              <Button variant="outline" size="sm" className="ml-3">
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
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
          </div>
        )}
      </div>

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
