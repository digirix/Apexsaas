import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ServiceType, Country, Currency } from "@shared/schema";

// Default billing basis options
const DEFAULT_BILLING_BASIS = [
  "Per Hour",
  "Per Day",
  "Per Week",
  "Per Month",
  "Per Quarter",
  "Per Year",
  "Per Filing",
  "Per Transaction",
  "Per Project",
  "Other"
];

// Create a schema for the form
const serviceTypeFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  countryId: z.string().min(1, "Country is required"),
  currencyId: z.string().min(1, "Currency is required"),
  rate: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: "Rate must be greater than 0",
    }
  ),
  billingBasis: z.string().min(1, "Billing basis is required"),
});

type ServiceTypeFormValues = z.infer<typeof serviceTypeFormSchema>;

export function ServiceTypesManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
  const [filterCountryId, setFilterCountryId] = useState<string | null>(null);
  const [customBillingBasis, setCustomBillingBasis] = useState<string>("");
  
  // Fetch countries for the dropdown
  const { data: countries = [], isLoading: isLoadingCountries } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
  });
  
  // Fetch currencies for the dropdown
  const { data: currencies = [], isLoading: isLoadingCurrencies } = useQuery<Currency[]>({
    queryKey: ["/api/v1/setup/currencies"],
  });
  
  // Fetch service types with optional country filter
  const { data: serviceTypes = [], isLoading: isLoadingServiceTypes } = useQuery<ServiceType[]>({
    queryKey: ["/api/v1/setup/service-types", filterCountryId],
    queryFn: async ({ queryKey }) => {
      const countryId = queryKey[1];
      const url = countryId 
        ? `/api/v1/setup/service-types?countryId=${countryId}` 
        : "/api/v1/setup/service-types";
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch service types");
      }
      return res.json();
    },
  });
  
  const form = useForm<ServiceTypeFormValues>({
    resolver: zodResolver(serviceTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      countryId: "",
      currencyId: "",
      rate: "",
      billingBasis: "",
    },
  });
  
  const createServiceTypeMutation = useMutation({
    mutationFn: async (data: ServiceTypeFormValues) => {
      // Handle custom billing basis
      const billingBasis = data.billingBasis === "Other" ? customBillingBasis : data.billingBasis;
      
      const response = await apiRequest("POST", "/api/v1/setup/service-types", {
        name: data.name,
        description: data.description || null,
        countryId: parseInt(data.countryId),
        currencyId: parseInt(data.currencyId),
        rate: parseFloat(data.rate),
        billingBasis,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/service-types"] });
      toast({
        title: "Success",
        description: "Service type has been created successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
      setCustomBillingBasis("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service type. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const updateServiceTypeMutation = useMutation({
    mutationFn: async (data: ServiceTypeFormValues) => {
      // Handle custom billing basis
      const billingBasis = data.billingBasis === "Other" ? customBillingBasis : data.billingBasis;
      
      const response = await apiRequest(
        "PUT", 
        `/api/v1/setup/service-types/${selectedServiceType?.id}`,
        {
          name: data.name,
          description: data.description || null,
          countryId: parseInt(data.countryId),
          currencyId: parseInt(data.currencyId),
          rate: parseFloat(data.rate),
          billingBasis,
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/service-types"] });
      toast({
        title: "Success",
        description: "Service type has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      form.reset();
      setCustomBillingBasis("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service type. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const deleteServiceTypeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "DELETE", 
        `/api/v1/setup/service-types/${selectedServiceType?.id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/service-types"] });
      toast({
        title: "Success",
        description: "Service type has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service type. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: ServiceTypeFormValues) => {
    createServiceTypeMutation.mutate(data);
  };
  
  const onEditSubmit = (data: ServiceTypeFormValues) => {
    updateServiceTypeMutation.mutate(data);
  };
  
  const handleEdit = (serviceType: ServiceType) => {
    setSelectedServiceType(serviceType);
    
    // Check if it's a custom billing basis
    const isCustomBasis = !DEFAULT_BILLING_BASIS.includes(serviceType.billingBasis);
    
    if (isCustomBasis) {
      setCustomBillingBasis(serviceType.billingBasis);
      form.reset({
        name: serviceType.name,
        description: serviceType.description || "",
        countryId: serviceType.countryId.toString(),
        currencyId: serviceType.currencyId.toString(),
        rate: serviceType.rate.toString(),
        billingBasis: "Other",
      });
    } else {
      form.reset({
        name: serviceType.name,
        description: serviceType.description || "",
        countryId: serviceType.countryId.toString(),
        currencyId: serviceType.currencyId.toString(),
        rate: serviceType.rate.toString(),
        billingBasis: serviceType.billingBasis,
      });
    }
    
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (serviceType: ServiceType) => {
    setSelectedServiceType(serviceType);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    deleteServiceTypeMutation.mutate();
  };
  
  const getCountryName = (countryId: number) => {
    const country = countries.find(c => c.id === countryId);
    return country ? country.name : "Unknown";
  };
  
  const getCurrencyCode = (currencyId: number) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.code : "Unknown";
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
          <CardDescription>
            Configure the types of services offered to clients. Each service type must be unique within a country.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Select 
                value={filterCountryId || ""} 
                onValueChange={(value) => setFilterCountryId(value || null)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => {
              form.reset({
                name: "",
                description: "",
                countryId: "",
                currencyId: "",
                rate: "",
                billingBasis: "",
              });
              setCustomBillingBasis("");
              setIsAddDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service Type
            </Button>
          </div>
          
          {isLoadingServiceTypes || isLoadingCountries || isLoadingCurrencies ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : countries.length === 0 || currencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">
                {countries.length === 0 
                  ? "Please add countries first" 
                  : "Please add currencies first"}
              </p>
              <Button variant="outline" onClick={() => {
                // Navigate to Countries or Currencies tab
              }}>
                {countries.length === 0 
                  ? "Go to Countries Setup" 
                  : "Go to Currencies Setup"}
              </Button>
            </div>
          ) : serviceTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">No service types found</p>
              <Button onClick={() => {
                form.reset();
                setIsAddDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Service Type
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Billing Basis</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceTypes.map((serviceType) => (
                  <TableRow key={serviceType.id}>
                    <TableCell className="font-medium">{serviceType.name}</TableCell>
                    <TableCell>{getCountryName(serviceType.countryId)}</TableCell>
                    <TableCell>
                      {getCurrencyCode(serviceType.currencyId)} {serviceType.rate.toFixed(2)}
                    </TableCell>
                    <TableCell>{serviceType.billingBasis}</TableCell>
                    <TableCell>{serviceType.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(serviceType)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(serviceType)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Service Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Service Type</DialogTitle>
            <DialogDescription>
              Add a new service type for a specific country. Service types must be unique within each country.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Tax Filing, Bookkeeping" {...field} />
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
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a country" />
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
                  name="currencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.id.toString()}>
                              {currency.code} - {currency.name}
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
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Rate</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" placeholder="e.g., 150.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="billingBasis"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Billing Basis</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value !== "Other") {
                            setCustomBillingBasis("");
                          }
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select billing basis" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEFAULT_BILLING_BASIS.map((basis) => (
                            <SelectItem key={basis} value={basis}>
                              {basis}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch("billingBasis") === "Other" && (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Custom Billing Basis</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter custom billing basis" 
                        value={customBillingBasis}
                        onChange={(e) => setCustomBillingBasis(e.target.value)}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the service provided" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createServiceTypeMutation.isPending}
                >
                  {createServiceTypeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Service Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Service Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Service Type</DialogTitle>
            <DialogDescription>
              Update the service type details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a country" />
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
                  name="currencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.id.toString()}>
                              {currency.code} - {currency.name}
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
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Rate</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="billingBasis"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Billing Basis</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value !== "Other") {
                            setCustomBillingBasis("");
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select billing basis" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEFAULT_BILLING_BASIS.map((basis) => (
                            <SelectItem key={basis} value={basis}>
                              {basis}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch("billingBasis") === "Other" && (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Custom Billing Basis</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter custom billing basis" 
                        value={customBillingBasis}
                        onChange={(e) => setCustomBillingBasis(e.target.value)}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateServiceTypeMutation.isPending}
                >
                  {updateServiceTypeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Service Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the service type "{selectedServiceType?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteServiceTypeMutation.isPending}
            >
              {deleteServiceTypeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}