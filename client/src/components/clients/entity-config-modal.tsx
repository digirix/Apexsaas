import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Entity, ServiceType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  PlusCircle,
} from "lucide-react";

interface EntityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: number | null;
  clientId: number;
}

export function EntityConfigModal({ isOpen, onClose, entityId, clientId }: EntityConfigModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("services");
  
  // Get entity details
  const { data: entity, isLoading: isEntityLoading } = useQuery<Entity>({
    queryKey: [`/api/v1/entities/${entityId}`],
    enabled: isOpen && !!entityId,
  });
  
  // Get available service types
  const { data: serviceTypes = [], isLoading: isServiceTypesLoading } = useQuery<ServiceType[]>({
    queryKey: ["/api/v1/setup/service-types", entity?.countryId],
    enabled: isOpen && !!entity?.countryId,
  });
  
  // Reset active tab when modal is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab("services");
    }
  }, [isOpen]);
  
  if (!isOpen || !entityId) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Entity: {entity?.name}</DialogTitle>
          <DialogDescription>
            Configure services and tax jurisdictions for this entity
          </DialogDescription>
        </DialogHeader>
        
        {isEntityLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : !entity ? (
          <div className="py-10 text-center">
            <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
            <p>Entity not found. Please try again.</p>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="tax-jurisdictions">Tax Jurisdictions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="services" className="pt-4 space-y-4">
                {isServiceTypesLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : serviceTypes.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <AlertCircle className="h-10 w-10 text-yellow-500 mb-4" />
                      <p className="text-slate-500 mb-4">No service types found for this country</p>
                      <p className="text-slate-500 text-sm">
                        Please add service types in Setup &gt; Service Types
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-sm font-medium">Available Services</h3>
                      <Button size="sm" variant="outline">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Service
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Placeholder for services list */}
                      {serviceTypes.map((service) => (
                        <Card key={service.id} className="overflow-hidden">
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{service.name}</h4>
                              <p className="text-sm text-slate-500">
                                {service.description || "No description"}
                              </p>
                              <div className="mt-1">
                                {/* Service type details */}
                                <Badge variant="outline" className="mr-2">
                                  Rate: {service.rate}
                                </Badge>
                                <Badge variant="outline">
                                  Billing: {service.billingBasis}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Status indicator - not subscribed (placeholder) */}
                            <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                              Not Subscribed
                            </Badge>
                            
                            {/* Toggle status button - placeholder
                            <Button variant="outline" size="sm">
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Subscribe
                            </Button>
                            */}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="tax-jurisdictions" className="pt-4 space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-md font-medium">VAT/Sales Tax Registration</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Configure tax jurisdictions for this entity
                      </p>
                    </div>
                    
                    {/* VAT Registration Status */}
                    <div className="p-4 rounded-md bg-slate-50 flex items-start mb-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {entity.isVatRegistered ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-slate-900">
                          {entity.isVatRegistered ? 'VAT Registered' : 'Not VAT Registered'}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          {entity.isVatRegistered
                            ? `VAT ID: ${entity.vatId}`
                            : 'This entity is not registered for VAT'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Placeholder for tax jurisdictions configuration */}
                    <div className="mb-4 text-center py-6">
                      <p className="text-slate-500 text-sm">
                        Tax jurisdictions configuration coming soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}