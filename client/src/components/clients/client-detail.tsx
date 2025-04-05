import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Client, Entity } from "@shared/schema";
import { ArrowLeft, Edit, Plus, MapPin, Building, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddEntityModal } from "./add-entity-modal";

interface ClientDetailProps {
  clientId: number;
}

export function ClientDetail({ clientId }: ClientDetailProps) {
  const [, setLocation] = useLocation();
  const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("entities");

  const { data: client, isLoading: isClientLoading } = useQuery<Client>({
    queryKey: [`/api/v1/clients/${clientId}`],
  });

  const { data: entities = [], isLoading: isEntitiesLoading } = useQuery<Entity[]>({
    queryKey: [`/api/v1/clients/${clientId}/entities`],
    enabled: !!clientId,
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
          <Button variant="outline" size="sm">
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
                              <span>{entity.countryId}</span>
                              {entity.stateId && <span>, {entity.stateId}</span>}
                            </div>
                            <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                              <Building className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                              <span>{entity.entityTypeId}</span>
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
                          <Button variant="outline" size="icon" className="h-9 w-9">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9">
                            <Edit className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-1.5 h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            0 Services
                          </Badge>
                          {entity.isVatRegistered && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-1.5 h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              VAT Registered
                            </Badge>
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
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">Portal access management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="pt-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">Task management for this client coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoices" className="pt-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">Invoicing functionality coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AddEntityModal
        isOpen={isAddEntityModalOpen}
        onClose={() => setIsAddEntityModalOpen(false)}
        clientId={clientId}
      />
    </>
  );
}
