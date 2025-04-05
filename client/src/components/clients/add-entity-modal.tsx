import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Country, EntityType } from "@shared/schema";

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
}

const formSchema = z.object({
  name: z.string().min(2, "Entity name must be at least 2 characters"),
  countryId: z.string().min(1, "Please select a country"),
  stateId: z.string().optional(),
  address: z.string().optional(),
  entityTypeId: z.string().min(1, "Please select an entity type"),
  businessTaxId: z.string().optional(),
  isVatRegistered: z.boolean().default(false),
  vatId: z.string().optional(),
  fileAccessLink: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddEntityModal({ isOpen, onClose, clientId }: AddEntityModalProps) {
  const { toast } = useToast();
  
  // Fetch countries for dropdown
  const { data: countries = [], isLoading: isLoadingCountries } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
    enabled: isOpen,
  });
  
  // We would fetch entity types based on selected country, 
  // but for now let's just mock some data
  const { data: entityTypes = [], isLoading: isLoadingEntityTypes } = useQuery<EntityType[]>({
    queryKey: ["/api/v1/setup/entity-types"],
    enabled: isOpen,
    queryFn: async () => {
      // Mock data since we haven't implemented entity types API yet
      return [{
        id: 1,
        tenantId: 1,
        countryId: 1,
        name: "Corporation",
        createdAt: new Date()
      }, {
        id: 2,
        tenantId: 1,
        countryId: 1,
        name: "Limited Company",
        createdAt: new Date()
      }];
    }
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      countryId: "",
      stateId: "",
      address: "",
      entityTypeId: "",
      businessTaxId: "",
      isVatRegistered: false,
      vatId: "",
      fileAccessLink: "",
    },
  });

  const isVatRegistered = form.watch("isVatRegistered");
  
  const createEntityMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", `/api/v1/clients/${clientId}/entities`, {
        ...data,
        countryId: parseInt(data.countryId),
        entityTypeId: parseInt(data.entityTypeId),
        stateId: data.stateId ? parseInt(data.stateId) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}/entities`] });
      toast({
        title: "Success",
        description: "Entity has been created successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entity. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormValues) {
    createEntityMutation.mutate(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start">
            <div className="mr-4 bg-blue-100 p-2 rounded-full">
              <PlusCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Add New Entity</DialogTitle>
              <DialogDescription className="mt-1">
                Add a business entity for this client. Fields marked with * are required.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Name*</FormLabel>
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
                    <FormLabel>Country*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCountries ? (
                          <div className="flex justify-center items-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : countries.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No countries available
                          </SelectItem>
                        ) : (
                          countries.map((country) => (
                            <SelectItem key={country.id} value={country.id.toString()}>
                              {country.name}
                            </SelectItem>
                          ))
                        )}
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
                    <FormLabel>Entity Type*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingEntityTypes ? (
                          <div className="flex justify-center items-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : entityTypes.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No entity types available
                          </SelectItem>
                        ) : (
                          entityTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter address" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="businessTaxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Tax ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter business tax ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isVatRegistered"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Is Registered for Sales Tax or VAT?
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Check this if the entity is registered for VAT or sales tax.
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            {isVatRegistered && (
              <FormField
                control={form.control}
                name="vatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT/Sales Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter VAT or sales tax ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="fileAccessLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Access Link</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter file access link (URL)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={createEntityMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createEntityMutation.isPending}
              >
                {createEntityMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full" />
                    Saving...
                  </>
                ) : "Save Entity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
