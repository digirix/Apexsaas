import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Country, State, EntityType, Entity } from "@shared/schema";

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
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface EditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Entity | null;
  clientId: number;
}

// Create the schema for editing an entity
const editEntitySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  countryId: z.coerce.number().min(1, { message: "Country is required" }),
  stateId: z.coerce.number().optional(),
  address: z.string().min(1, { message: "Address is required" }),
  entityTypeId: z.coerce.number().min(1, { message: "Entity type is required" }),
  businessTaxId: z.string().min(1, { message: "Business tax ID is required" }),
  isVatRegistered: z.boolean().default(false),
  vatId: z
    .string()
    .min(1, { message: "VAT ID is required" })
    .optional()
    .or(z.literal("")),
  fileAccessLink: z
    .string()
    .url({ message: "Must be a valid URL" })
    .optional()
    .or(z.literal("")),
});

type EditEntityFormValues = z.infer<typeof editEntitySchema>;

export function EditEntityModal({
  isOpen,
  onClose,
  entity,
  clientId,
}: EditEntityModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available countries, states, and entity types
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
    enabled: isOpen,
  });

  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["/api/v1/setup/states"],
    enabled: isOpen,
  });

  const { data: entityTypes = [] } = useQuery<EntityType[]>({
    queryKey: ["/api/v1/setup/entity-types"],
    enabled: isOpen,
  });

  // Form setup
  const form = useForm<EditEntityFormValues>({
    resolver: zodResolver(editEntitySchema),
    defaultValues: {
      name: entity?.name || "",
      countryId: entity?.countryId || 0,
      stateId: entity?.stateId || undefined,
      address: entity?.address || "",
      entityTypeId: entity?.entityTypeId || 0,
      businessTaxId: entity?.businessTaxId || "",
      isVatRegistered: entity?.isVatRegistered || false,
      vatId: entity?.vatId || "",
      fileAccessLink: entity?.fileAccessLink || "",
    },
  });

  // Update form values when entity changes
  useEffect(() => {
    if (entity) {
      form.reset({
        name: entity.name,
        countryId: entity.countryId,
        stateId: entity.stateId || undefined,
        address: entity.address || "",
        entityTypeId: entity.entityTypeId,
        businessTaxId: entity.businessTaxId || "",
        isVatRegistered: entity.isVatRegistered,
        vatId: entity.vatId || "",
        fileAccessLink: entity.fileAccessLink || "",
      });
    }
  }, [entity, form]);

  // Filter states based on selected country
  const selectedCountryId = form.watch("countryId");
  const filteredStates = states.filter(
    (state) => state.countryId === Number(selectedCountryId)
  );
  
  // Filter entity types based on selected country
  const filteredEntityTypes = entityTypes.filter(
    (entityType) => entityType.countryId === Number(selectedCountryId)
  );

  // Update entity mutation
  const updateEntity = useMutation({
    mutationFn: async (values: EditEntityFormValues) => {
      if (!entity) throw new Error("Entity not found");
      
      const response = await apiRequest(
        "PUT",
        `/api/v1/entities/${entity.id}`,
        values
      );
      
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitting(false);
      toast({
        title: "Entity updated",
        description: "Entity has been updated successfully",
      });
      
      // Invalidate entity queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/clients/${clientId}/entities`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/entities/${entity?.id}`],
      });
      
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to update entity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: EditEntityFormValues) => {
    // If entity is not VAT registered, clear VAT ID
    if (!values.isVatRegistered) {
      values.vatId = "";
    }
    
    setIsSubmitting(true);
    updateEntity.mutate(values);
  };

  // Reset form when modal is closed
  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Handle country change
  const handleCountryChange = (value: string) => {
    form.setValue("countryId", parseInt(value));
    form.setValue("stateId", undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Entity</DialogTitle>
        </DialogHeader>

        {!entity ? (
          <div className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-10 w-10 text-yellow-500 mb-4" />
            <p className="text-slate-500 text-center">
              Entity data not found. Please try again.
            </p>
          </div>
        ) : (
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

              <FormField
                control={form.control}
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select
                      onValueChange={handleCountryChange}
                      defaultValue={field.value.toString()}
                      value={field.value.toString()}
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
                name="stateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === "0" ? undefined : parseInt(value));
                      }}
                      defaultValue={field.value?.toString() || "0"}
                      value={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state/province" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        {filteredStates.map((state) => (
                          <SelectItem key={state.id} value={state.id.toString()}>
                            {state.name}
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address" {...field} />
                    </FormControl>
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
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredEntityTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
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
                name="businessTaxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Tax ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter business tax ID"
                        {...field}
                      />
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
                      <FormLabel>VAT/Sales Tax Registered</FormLabel>
                      <FormDescription>
                        Is this entity registered for VAT or sales tax?
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
                      <FormLabel>VAT/Sales Tax ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter VAT/Sales Tax ID"
                          {...field}
                        />
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
                    <FormLabel>File Access Link (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://drive.google.com/..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Link to documentation or external file storage
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Entity"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}