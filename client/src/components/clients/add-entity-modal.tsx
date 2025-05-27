import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Country, EntityType, State } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
}

// Define a simple schema for our form
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  countryId: z.coerce.number().min(1, "Country is required"),
  entityTypeId: z.coerce.number().min(1, "Entity type is required"),
  stateId: z.coerce.number().optional(),
  businessTaxId: z.string().optional(),
  isVatRegistered: z.boolean().default(false),
  vatId: z.string().optional(),
  address: z.string().optional(),
  fileAccessLink: z.string().optional(),
  whatsappGroupLink: z.string().optional(),
  tenantId: z.number().min(1, "Tenant ID is required"),
});

export function AddEntityModal({ isOpen, onClose, clientId }: AddEntityModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  
  // Fetch countries
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
    enabled: isOpen,
  });
  
  // Fetch entity types
  const { data: entityTypes = [] } = useQuery<EntityType[]>({
    queryKey: ["/api/v1/setup/entity-types"],
    enabled: isOpen,
  });
  
  // Fetch states for selected country
  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["/api/v1/setup/states", selectedCountryId],
    enabled: isOpen && !!selectedCountryId,
  });
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      countryId: 0,
      entityTypeId: 0,
      stateId: 0,
      businessTaxId: "",
      isVatRegistered: false,
      vatId: "",
      address: "",
      fileAccessLink: "",
      whatsappGroupLink: "",
      tenantId: user?.tenantId || 0,
    },
  });
  
  // Set tenant ID when user data changes
  useEffect(() => {
    if (user?.tenantId) {
      form.setValue("tenantId", user.tenantId);
    }
  }, [user, form]);
  
  // Create entity mutation
  const createEntity = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      console.log("Creating entity with data:", values);
      
      // Create submission data
      const data = {
        name: values.name,
        countryId: values.countryId,
        entityTypeId: values.entityTypeId,
        clientId: clientId,
        tenantId: values.tenantId,
        isVatRegistered: values.isVatRegistered,
      };
      
      // Add optional fields if they have values
      if (values.stateId && values.stateId > 0) {
        (data as any).stateId = values.stateId;
      }
      
      if (values.businessTaxId) {
        (data as any).businessTaxId = values.businessTaxId;
      }
      
      if (values.vatId) {
        (data as any).vatId = values.vatId;
      }
      
      if (values.address) {
        (data as any).address = values.address;
      }
      
      if (values.fileAccessLink) {
        (data as any).fileAccessLink = values.fileAccessLink;
      }
      
      if (values.whatsappGroupLink) {
        (data as any).whatsappGroupLink = values.whatsappGroupLink;
      }
      
      const response = await apiRequest(
        "POST", 
        `/api/v1/clients/${clientId}/entities`, 
        data
      );
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/v1/clients/${clientId}/entities`] 
      });
      
      // Show success message
      toast({
        title: "Success",
        description: "Entity created successfully",
      });
      
      // Reset form and close modal
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      console.error("Error creating entity:", error);
      
      // Show error message
      toast({
        title: "Error",
        description: error.message || "Failed to create entity",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });
  
  // Form submission handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);
    
    // Make sure tenant ID is set
    if (!values.tenantId && user?.tenantId) {
      values.tenantId = user.tenantId;
    }
    
    createEntity.mutate(values);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Entity</DialogTitle>
          <DialogDescription>
            Create a new entity for this client
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter entity name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(Number(value));
                        setSelectedCountryId(Number(value));
                        form.setValue("entityTypeId", 0);
                        form.setValue("stateId", 0);
                      }}
                      value={field.value > 0 ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="entityTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value > 0 ? field.value.toString() : undefined}
                      disabled={!selectedCountryId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entityTypes
                          .filter((entityType) => entityType.countryId === selectedCountryId)
                          .map((entityType) => (
                            <SelectItem key={entityType.id} value={entityType.id.toString()}>
                              {entityType.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {!selectedCountryId && (
                      <FormDescription>
                        Select a country first
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="stateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value > 0 ? field.value.toString() : undefined}
                      disabled={!selectedCountryId || states.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.id.toString()}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedCountryId && states.length === 0 && (
                      <FormDescription>
                        No states available for this country
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="businessTaxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Tax ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter business tax ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter entity address" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isVatRegistered"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) {
                              form.setValue("vatId", "");
                            }
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>VAT Registered</FormLabel>
                        <FormDescription>
                          Is this entity registered for VAT?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {form.watch("isVatRegistered") && (
                  <FormField
                    control={form.control}
                    name="vatId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter VAT ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <FormField
                control={form.control}
                name="fileAccessLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Access Link (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter file access link" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      URL to client files (e.g., Google Drive, OneDrive)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="whatsappGroupLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Group Link (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter WhatsApp group link" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      WhatsApp group link for client communication
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Entity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}