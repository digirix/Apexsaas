import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Entity, ServiceType, TaxJurisdiction, State, Country } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  MinusCircle,
  XCircle,
  InfoIcon
} from "lucide-react";

// Extended service type with subscription status
interface ServiceWithStatus extends ServiceType {
  isRequired: boolean;
  isSubscribed: boolean;
}

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
  const [selectedTaxJurisdictionId, setSelectedTaxJurisdictionId] = useState<number | null>(null);
  const [showAddServices, setShowAddServices] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  
  // Get entity details
  const { data: entity, isLoading: isEntityLoading } = useQuery<Entity>({
    queryKey: [`/api/v1/entities/${entityId}`],
    enabled: isOpen && !!entityId,
  });
  
  // Get entity services with status
  const { 
    data: services = [], 
    isLoading: isServicesLoading,
    refetch: refetchServices
  } = useQuery<ServiceWithStatus[]>({
    queryKey: [`/api/v1/entities/${entityId}/services`],
    enabled: isOpen && !!entityId,
  });

  // Get all available services for the country (for adding new services)
  const { data: allAvailableServices = [] } = useQuery<ServiceType[]>({
    queryKey: [`/api/v1/setup/service-types`],
    enabled: isOpen && !!entity?.countryId && showAddServices,
    select: (data) => data.filter(service => 
      service.countryId === entity?.countryId && 
      !services.some(existingService => existingService.id === service.id)
    )
  });
  
  // Get entity tax jurisdictions
  const { 
    data: entityTaxJurisdictions = [], 
    isLoading: isEntityTaxJurisdictionsLoading,
    refetch: refetchEntityTaxJurisdictions
  } = useQuery<TaxJurisdiction[]>({
    queryKey: [`/api/v1/entities/${entityId}/tax-jurisdictions`],
    enabled: isOpen && !!entityId && !!entity?.isVatRegistered,
  });
  
  // Get all available tax jurisdictions 
  const { 
    data: availableTaxJurisdictions = [], 
    isLoading: isAvailableTaxJurisdictionsLoading 
  } = useQuery<TaxJurisdiction[]>({
    queryKey: ["/api/v1/setup/tax-jurisdictions"],
    enabled: isOpen && !!entityId && !!entity?.isVatRegistered,
  });
  
  // Fetch countries for reference
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
    enabled: isOpen,
  });
  
  // Fetch states for reference
  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["/api/v1/setup/states"],
    enabled: isOpen,
  });
  
  // Filter tax jurisdictions by entity's country and exclude already assigned ones
  const filteredTaxJurisdictions = availableTaxJurisdictions.filter(
    tj => tj.countryId === entity?.countryId && !entityTaxJurisdictions.some(etj => etj.id === tj.id)
  );
  
  // Reset active tab when modal is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab("services");
      setSelectedTaxJurisdictionId(null);
    }
  }, [isOpen]);
  
  // Update service subscription mutation
  const updateServiceSubscription = useMutation({
    mutationFn: async ({ 
      serviceId, 
      isRequired, 
      isSubscribed 
    }: { 
      serviceId: number; 
      isRequired: boolean; 
      isSubscribed: boolean;
    }) => {
      if (!entityId) throw new Error("Entity ID is required");
      
      try {
        // Try to update first
        const response = await apiRequest(
          "PUT",
          `/api/v1/entities/${entityId}/services/${serviceId}`,
          { isRequired, isSubscribed }
        );
        
        return response.json();
      } catch (error: any) {
        // If 404 (service subscription not found), create it
        if (error.status === 404) {
          console.log("Service subscription not found, creating a new one");
          const createResponse = await apiRequest(
            "POST",
            `/api/v1/entities/${entityId}/services`,
            { 
              serviceTypeId: serviceId, 
              isRequired, 
              isSubscribed 
            }
          );
          
          return createResponse.json();
        }
        // Re-throw for other errors
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/entities/${entityId}/services`]
      });
      
      toast({
        title: "Service updated",
        description: "Service subscription updated successfully",
      });
      
      refetchServices();
    },
    onError: (error: any) => {
      console.error("Error updating service subscription:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update service subscription",
        variant: "destructive",
      });
    }
  });
  
  // Add tax jurisdiction mutation
  const addTaxJurisdiction = useMutation({
    mutationFn: async (taxJurisdictionId: number) => {
      if (!entityId) throw new Error("Entity ID is required");
      
      const response = await apiRequest(
        "POST",
        `/api/v1/entities/${entityId}/tax-jurisdictions`,
        { taxJurisdictionId }
      );
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/entities/${entityId}/tax-jurisdictions`]
      });
      
      toast({
        title: "Tax jurisdiction added",
        description: "Tax jurisdiction added successfully",
      });
      
      setSelectedTaxJurisdictionId(null);
      refetchEntityTaxJurisdictions();
    },
    onError: (error: any) => {
      console.error("Error adding tax jurisdiction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add tax jurisdiction",
        variant: "destructive",
      });
    }
  });
  
  // Add services to entity mutation
  const addServicesToEntity = useMutation({
    mutationFn: async (serviceIds: number[]) => {
      if (!entityId) throw new Error("Entity ID is required");
      
      const promises = serviceIds.map(serviceId =>
        apiRequest("POST", `/api/v1/entities/${entityId}/services`, {
          serviceTypeId: serviceId,
          isRequired: false,
          isSubscribed: false
        })
      );
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/entities/${entityId}/services`]
      });
      
      toast({
        title: "Services added",
        description: "Selected services have been added to the entity",
      });
      
      setShowAddServices(false);
      setSelectedServiceIds([]);
      refetchServices();
    },
    onError: (error: any) => {
      console.error("Error adding services:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add services",
        variant: "destructive",
      });
    }
  });

  // Remove tax jurisdiction mutation
  const removeTaxJurisdiction = useMutation({
    mutationFn: async (taxJurisdictionId: number) => {
      if (!entityId) throw new Error("Entity ID is required");
      
      const response = await apiRequest(
        "DELETE",
        `/api/v1/entities/${entityId}/tax-jurisdictions/${taxJurisdictionId}`,
        {}
      );
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/entities/${entityId}/tax-jurisdictions`]
      });
      
      toast({
        title: "Tax jurisdiction removed",
        description: "Tax jurisdiction removed successfully",
      });
      
      refetchEntityTaxJurisdictions();
    },
    onError: (error: any) => {
      console.error("Error removing tax jurisdiction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove tax jurisdiction",
        variant: "destructive",
      });
    }
  });
  
  // Handle service subscription toggle
  const handleServiceToggle = (
    serviceId: number,
    isRequiredCurrent: boolean,
    isSubscribedCurrent: boolean,
    field: 'isRequired' | 'isSubscribed'
  ) => {
    let isRequired = isRequiredCurrent;
    let isSubscribed = isSubscribedCurrent;
    
    if (field === 'isRequired') {
      isRequired = !isRequired;
      // If turning off required, also turn off subscribed
      if (!isRequired) {
        isSubscribed = false;
      }
    } else {
      isSubscribed = !isSubscribed;
      // If turning on subscribed, also turn on required
      if (isSubscribed) {
        isRequired = true;
      }
    }
    
    updateServiceSubscription.mutate({
      serviceId,
      isRequired,
      isSubscribed
    });
  };
  
  // Handle tax jurisdiction add
  const handleAddTaxJurisdiction = () => {
    if (selectedTaxJurisdictionId) {
      addTaxJurisdiction.mutate(selectedTaxJurisdictionId);
    }
  };
  
  if (!isOpen || !entityId) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
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
                {showAddServices ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium">Add Services to Entity</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Select services from your setup that are relevant to this entity
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowAddServices(false);
                            setSelectedServiceIds([]);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>

                      {allAvailableServices.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                          <p className="text-slate-500 mb-2">No additional services available</p>
                          <p className="text-sm text-slate-400">
                            All services for this country have already been added to this entity.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                            {allAvailableServices.map((service) => (
                              <Card key={service.id} className="border-2 transition-colors">
                                <CardContent className="p-4">
                                  <div className="flex items-start space-x-3">
                                    <Checkbox
                                      id={`select-service-${service.id}`}
                                      checked={selectedServiceIds.includes(service.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedServiceIds([...selectedServiceIds, service.id]);
                                        } else {
                                          setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                                        }
                                      }}
                                    />
                                    <div className="flex-1">
                                      <label
                                        htmlFor={`select-service-${service.id}`}
                                        className="text-sm font-medium cursor-pointer"
                                      >
                                        {service.name}
                                      </label>
                                      <p className="text-sm text-slate-500 mt-1">
                                        {service.description || "No description"}
                                      </p>
                                      <div className="flex items-center space-x-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                          Rate: {service.rate}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          Billing: {service.billingBasis}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t">
                            <p className="text-sm text-slate-500">
                              {selectedServiceIds.length} service(s) selected
                            </p>
                            <Button 
                              onClick={() => addServicesToEntity.mutate(selectedServiceIds)}
                              disabled={selectedServiceIds.length === 0 || addServicesToEntity.isPending}
                            >
                              {addServicesToEntity.isPending ? "Adding..." : "Add Selected Services"}
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {isServicesLoading ? (
                      <div className="flex justify-center items-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                      </div>
                    ) : services.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-10">
                          <AlertCircle className="h-10 w-10 text-yellow-500 mb-4" />
                          <p className="text-slate-500 mb-4">No services configured for this entity</p>
                          <p className="text-slate-500 text-sm mb-4">
                            Add services from your setup to configure compliance requirements
                          </p>
                          <Button onClick={() => setShowAddServices(true)}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Services
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-sm font-medium">Configured Services</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Configure required and subscribed status for each service
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAddServices(true)}
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add More Services
                          </Button>
                        </div>
                    
                    <div className="space-y-2">
                      {services.map((service) => (
                        <Card key={service.id} className="overflow-hidden">
                          <CardContent className="p-4 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-6">
                              <h4 className="font-medium">{service.name}</h4>
                              <p className="text-sm text-slate-500 line-clamp-1">
                                {service.description || "No description"}
                              </p>
                              <div className="mt-1">
                                <Badge variant="outline" className="mr-2">
                                  Rate: {service.rate}
                                </Badge>
                                <Badge variant="outline">
                                  Billing: {service.billingBasis}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="col-span-3 flex items-center">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`required-${service.id}`}
                                  checked={service.isRequired}
                                  onCheckedChange={() => handleServiceToggle(
                                    service.id,
                                    service.isRequired,
                                    service.isSubscribed,
                                    'isRequired'
                                  )}
                                />
                                <label
                                  htmlFor={`required-${service.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Required
                                </label>
                              </div>
                            </div>
                            
                            <div className="col-span-3 flex items-center">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`subscribed-${service.id}`}
                                  checked={service.isSubscribed}
                                  disabled={!service.isRequired}
                                  onCheckedChange={() => handleServiceToggle(
                                    service.id,
                                    service.isRequired,
                                    service.isSubscribed,
                                    'isSubscribed'
                                  )}
                                />
                                <label
                                  htmlFor={`subscribed-${service.id}`}
                                  className={`text-sm font-medium leading-none ${!service.isRequired ? 'text-slate-400' : ''}`}
                                >
                                  Subscribed
                                </label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-4 rounded-md bg-slate-50">
                      <div className="flex items-start">
                        <InfoIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-slate-900">Service Configuration Info</h4>
                          <ul className="text-sm text-slate-500 mt-1 list-disc list-inside space-y-1">
                            <li><strong>Required:</strong> Services that must be provided to this entity</li>
                            <li><strong>Subscribed:</strong> Services that the entity is currently paying for</li>
                            <li>A service must be marked as Required before it can be Subscribed</li>
                          </ul>
                        </div>
                      </div>
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
                            ? `VAT ID: ${entity.vatId || 'Not provided'}`
                            : 'This entity is not registered for VAT/Sales Tax'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {!entity.isVatRegistered ? (
                      <div className="text-center py-4">
                        <p className="text-slate-500 text-sm">
                          VAT/Sales Tax registration is not enabled for this entity.
                          <br />
                          To enable it, edit the entity and set "VAT Registered" to Yes.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Add tax jurisdiction */}
                        <div className="mb-6 mt-6">
                          <h4 className="text-sm font-medium mb-2">Add Tax Jurisdiction</h4>
                          <div className="flex space-x-2">
                            <div className="flex-1">
                              <Select 
                                value={selectedTaxJurisdictionId?.toString() || ""} 
                                onValueChange={(value) => setSelectedTaxJurisdictionId(Number(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tax jurisdiction" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredTaxJurisdictions.length === 0 ? (
                                    <div className="p-2 text-center text-sm text-slate-500">
                                      No available tax jurisdictions
                                    </div>
                                  ) : (
                                    filteredTaxJurisdictions.map((tj) => (
                                      <SelectItem key={tj.id} value={tj.id.toString()}>
                                        {tj.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              type="button" 
                              size="sm"
                              onClick={handleAddTaxJurisdiction}
                              disabled={!selectedTaxJurisdictionId || filteredTaxJurisdictions.length === 0}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        </div>
                        
                        {/* List of assigned tax jurisdictions */}
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Assigned Tax Jurisdictions</h4>
                          
                          {isEntityTaxJurisdictionsLoading ? (
                            <div className="flex justify-center items-center py-6">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                          ) : entityTaxJurisdictions.length === 0 ? (
                            <div className="text-center py-6 border rounded-md">
                              <p className="text-slate-500 text-sm">
                                No tax jurisdictions assigned yet
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {entityTaxJurisdictions.map((tj) => (
                                <div 
                                  key={tj.id} 
                                  className="flex justify-between items-center p-3 border rounded-md"
                                >
                                  <div>
                                    <p className="font-medium">{tj.name}</p>
                                    <p className="text-sm text-slate-500">
                                      {tj.description || 
                                        `${countries.find(c => c.id === entity?.countryId)?.name || 'Country'}${
                                          tj.stateId && states.find(s => s.id === tj.stateId) 
                                            ? ` - ${states.find(s => s.id === tj.stateId)?.name}` 
                                            : ''
                                        }`
                                      }
                                    </p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeTaxJurisdiction.mutate(tj.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    <span className="sr-only">Remove</span>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
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