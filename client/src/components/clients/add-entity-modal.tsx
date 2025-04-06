import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { insertEntitySchema, InsertEntity, Country, EntityType, State } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import {
  Dialog,
  DialogContent,
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
    queryKey: ["/api/v1/setup/entity-types", selectedCountryId],
    enabled: isOpen && !!selectedCountryId,
  });
  
  // Fetch states for selected country
  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["/api/v1/setup/states", selectedCountryId],
    enabled: isOpen && !!selectedCountryId,
  });
  
  // Extend schema with validation
  const formSchema = insertEntitySchema.extend({
    name: z.string().min(2, "Name must be at least 2 characters"),
    countryId: z.coerce.number({ 
      required_error: "Country is required",
      invalid_type_error: "Must be a number"
    }),
    entityTypeId: z.coerce.number({ 
      required_error: "Entity type is required",
      invalid_type_error: "Must be a number"
    }),
    stateId: z.coerce.number().optional(),
    businessTaxId: z.string().optional(),
    vatId: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    fileAccessLink: z.string().optional().or(z.literal('')),
    // Add tenantId
    tenantId: z.number(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      countryId: 0, // Default to 0 instead of undefined
      entityTypeId: 0, // Default to 0 instead of undefined
      stateId: 0, // Default to 0 instead of undefined
      businessTaxId: "",
      isVatRegistered: false,
      vatId: "",
      address: "",
      fileAccessLink: "",
      tenantId: user?.tenantId || 0, // Set initial value if user is available
    },
  });
  
  // Set tenantId when user data is available
  useEffect(() => {
    if (user?.tenantId) {
      form.setValue("tenantId", user.tenantId);
    }
  }, [user, form]);

  const createEntityMutation = useMutation({
    mutationFn: async (data: InsertEntity) => {
      console.log("Mutation function executing with data:", data);
      
      // Check required fields
      if (!data.name || !data.countryId || !data.entityTypeId || !data.tenantId || !data.clientId) {
        console.error("Missing required fields:", { 
          name: data.name, 
          countryId: data.countryId, 
          entityTypeId: data.entityTypeId,
          tenantId: data.tenantId,
          clientId: data.clientId 
        });
        throw new Error("Missing required fields");
      }
      
      try {
        console.log(`Sending request to: /api/v1/clients/${clientId}/entities`);
        console.log("With data:", data);
        
        const response = await apiRequest("POST", `/api/v1/clients/${clientId}/entities`, data);
        console.log("API Response status:", response.status);
        console.log("API Response ok:", response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response text:", errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            console.error("Failed to parse error response as JSON:", e);
            throw new Error(`Failed to create entity: ${response.status} ${response.statusText}`);
          }
          
          console.error("API error data:", errorData);
          throw new Error(errorData.message || "Failed to create entity");
        }
        
        const responseText = await response.text();
        console.log("API Success response text:", responseText);
        
        let responseData;
        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error("Failed to parse success response as JSON:", e);
          return {}; // Return empty object if we can't parse the response
        }
        
        console.log("API Success response data:", responseData);
        return responseData;
      } catch (err) {
        console.error("API call error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log("Mutation successful with data:", data);
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}/entities`] });
      toast({
        title: "Success",
        description: "Entity created successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while creating the entity",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
    onSettled: () => {
      console.log("Mutation settled");
      setIsSubmitting(false);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Form submit triggered!");
    // Check for form validation errors
    console.log("Form errors:", form.formState.errors);
    console.log("Form values:", values);
    
    setIsSubmitting(true);
    
    // Make sure tenantId is set
    if (!values.tenantId && user?.tenantId) {
      console.log("Setting tenantId from user context:", user.tenantId);
      values.tenantId = user.tenantId;
    }
    
    // Validate required fields
    if (!values.name) {
      console.log("Entity name is missing");
      form.setError("name", { message: "Entity name is required" });
      setIsSubmitting(false);
      return;
    }
    
    if (!values.countryId || values.countryId === 0) {
      console.log("Country is missing or 0");
      form.setError("countryId", { message: "Country is required" });
      setIsSubmitting(false);
      return;
    }
    
    if (!values.entityTypeId || values.entityTypeId === 0) {
      console.log("Entity type is missing or 0");
      form.setError("entityTypeId", { message: "Entity type is required" });
      setIsSubmitting(false);
      return;
    }
    
    // Debug what's being submitted
    console.log("Submitting entity:", {
      ...values,
      clientId,
      tenantId: values.tenantId
    });
    
    try {
      // Create the complete entity object
      const entityData: InsertEntity = {
        name: values.name,
        countryId: values.countryId,
        entityTypeId: values.entityTypeId,
        clientId: clientId,
        tenantId: values.tenantId,
        isVatRegistered: values.isVatRegistered || false
      };
      
      // Handle optional fields - only include if they have a value and are not the default "0" for numeric fields
      if (values.stateId && values.stateId !== 0) {
        entityData.stateId = values.stateId;
      }
      
      if (values.businessTaxId && values.businessTaxId.trim() !== '') {
        entityData.businessTaxId = values.businessTaxId;
      }
      
      if (values.vatId && values.vatId.trim() !== '') {
        entityData.vatId = values.vatId;
      }
      
      if (values.address && values.address.trim() !== '') {
        entityData.address = values.address;
      }
      
      if (values.fileAccessLink && values.fileAccessLink.trim() !== '') {
        entityData.fileAccessLink = values.fileAccessLink;
      }
      
      console.log("Final entity data:", entityData);
      createEntityMutation.mutate(entityData);
    } catch (error) {
      console.error("Error submitting entity:", error);
      toast({
        title: "Submission Error",
        description: "Error submitting form. Check console for details.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Entity</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={(e) => {
              console.log("Form submitted via native submit");
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-4">
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
                        // Reset dependent fields with 0 to avoid errors
                        form.setValue("entityTypeId", 0);
                        form.setValue("stateId", 0);
                      }}
                      value={field.value?.toString()}
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
                      value={field.value?.toString()}
                      disabled={!selectedCountryId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entityTypes.map((entityType) => (
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
                      value={field.value?.toString()}
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
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                onClick={(e) => {
                  console.log("Create Button clicked");
                  if (!form.formState.isSubmitting) {
                    console.log("Manually triggering submit");
                    form.handleSubmit(onSubmit)();
                  }
                }}
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