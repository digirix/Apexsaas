import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaxJurisdiction, Country, State, insertTaxJurisdictionSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, Filter } from "lucide-react";

// Modify the schema for the form
const taxJurisdictionFormSchema = z.object({
  name: z.string().min(2, "Jurisdiction name must be at least 2 characters"),
  description: z.string().optional(),
  countryId: z.string().min(1, "Please select a country"),
  stateId: z.string().optional(),
});

type TaxJurisdictionFormValues = z.infer<typeof taxJurisdictionFormSchema>;

export function TaxJurisdictionsManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<TaxJurisdiction | null>(null);
  const [filterCountryId, setFilterCountryId] = useState<string | null>(null);
  const [filteredStates, setFilteredStates] = useState<State[]>([]);
  
  // Fetch countries for the dropdown
  const { data: countries = [], isLoading: isLoadingCountries } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
  });
  
  // Fetch states
  const { data: allStates = [], isLoading: isLoadingStates } = useQuery<State[]>({
    queryKey: ["/api/v1/setup/states"],
  });
  
  // Fetch tax jurisdictions with optional country filter
  const { data: taxJurisdictions = [], isLoading: isLoadingJurisdictions } = useQuery<TaxJurisdiction[]>({
    queryKey: ["/api/v1/setup/tax-jurisdictions", filterCountryId],
    queryFn: async ({ queryKey }) => {
      const countryId = queryKey[1];
      const url = countryId && countryId !== "all"
        ? `/api/v1/setup/tax-jurisdictions?countryId=${countryId}` 
        : "/api/v1/setup/tax-jurisdictions";
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch tax jurisdictions");
      }
      return res.json();
    },
  });
  
  const form = useForm<TaxJurisdictionFormValues>({
    resolver: zodResolver(taxJurisdictionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      countryId: "",
      stateId: "",
    },
  });

  // Watch the country ID to filter states
  const watchCountryId = form.watch("countryId");
  
  useEffect(() => {
    if (watchCountryId) {
      const countryIdNumber = parseInt(watchCountryId);
      const relevantStates = allStates.filter(state => state.countryId === countryIdNumber);
      setFilteredStates(relevantStates);
    } else {
      setFilteredStates([]);
    }
  }, [watchCountryId, allStates]);
  
  const createJurisdictionMutation = useMutation({
    mutationFn: async (data: TaxJurisdictionFormValues) => {
      const response = await apiRequest("POST", "/api/v1/setup/tax-jurisdictions", {
        name: data.name,
        description: data.description || null,
        countryId: parseInt(data.countryId),
        stateId: data.stateId && data.stateId !== "country_wide" ? parseInt(data.stateId) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/tax-jurisdictions"] });
      toast({
        title: "Success",
        description: "Tax jurisdiction has been added successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add tax jurisdiction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateJurisdictionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string, description: string | null, countryId: number, stateId: number | null } }) => {
      const response = await apiRequest("PUT", `/api/v1/setup/tax-jurisdictions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/tax-jurisdictions"] });
      toast({
        title: "Success",
        description: "Tax jurisdiction has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedJurisdiction(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tax jurisdiction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteJurisdictionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/v1/setup/tax-jurisdictions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/tax-jurisdictions"] });
      toast({
        title: "Success",
        description: "Tax jurisdiction has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedJurisdiction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tax jurisdiction. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to get country name by id
  const getCountryName = (id: number): string => {
    const country = countries.find(c => c.id === id);
    return country ? country.name : "Unknown";
  };

  // Helper function to get state name by id
  const getStateName = (id: number | null): string => {
    if (!id) return "N/A";
    const state = allStates.find(s => s.id === id);
    return state ? state.name : "Unknown";
  };

  function onAddSubmit(data: TaxJurisdictionFormValues) {
    createJurisdictionMutation.mutate(data);
  }

  function onEditSubmit(data: TaxJurisdictionFormValues) {
    if (selectedJurisdiction) {
      updateJurisdictionMutation.mutate({ 
        id: selectedJurisdiction.id, 
        data: {
          name: data.name,
          description: data.description || null,
          countryId: parseInt(data.countryId),
          stateId: data.stateId && data.stateId !== "country_wide" ? parseInt(data.stateId) : null,
        }
      });
    }
  }

  function handleEdit(jurisdiction: TaxJurisdiction) {
    setSelectedJurisdiction(jurisdiction);
    form.reset({ 
      name: jurisdiction.name,
      description: jurisdiction.description || "",
      countryId: jurisdiction.countryId.toString(),
      stateId: jurisdiction.stateId ? jurisdiction.stateId.toString() : "country_wide",
    });
    setIsEditDialogOpen(true);
  }

  function handleDelete(jurisdiction: TaxJurisdiction) {
    setSelectedJurisdiction(jurisdiction);
    setIsDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (selectedJurisdiction) {
      deleteJurisdictionMutation.mutate(selectedJurisdiction.id);
    }
  }

  const isLoading = isLoadingCountries || isLoadingStates || isLoadingJurisdictions;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>VAT/Sales Tax Jurisdictions</CardTitle>
          <div className="flex space-x-2">
            <Select
              value={filterCountryId || "all"}
              onValueChange={(value) => setFilterCountryId(value !== "all" ? value : null)}
            >
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>{filterCountryId ? getCountryName(parseInt(filterCountryId)) : "All Countries"}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button size="sm" onClick={() => {
              form.reset({ name: "", description: "", countryId: "", stateId: "" });
              setIsAddDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Jurisdiction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : countries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">Please add countries first</p>
              <Button variant="outline" onClick={() => {
                // Navigate to Countries tab
              }}>
                Go to Countries Setup
              </Button>
            </div>
          ) : taxJurisdictions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">No tax jurisdictions found</p>
              <Button onClick={() => {
                form.reset({ name: "", description: "", countryId: "", stateId: "" });
                setIsAddDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Tax Jurisdiction
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jurisdiction Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>State/Province</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxJurisdictions.map((jurisdiction) => (
                  <TableRow key={jurisdiction.id}>
                    <TableCell className="font-medium">{jurisdiction.name}</TableCell>
                    <TableCell>{jurisdiction.description || "-"}</TableCell>
                    <TableCell>{getCountryName(jurisdiction.countryId)}</TableCell>
                    <TableCell>{getStateName(jurisdiction.stateId)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(jurisdiction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(jurisdiction)}
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

      {/* Add Jurisdiction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Tax Jurisdiction</DialogTitle>
            <DialogDescription>
              Enter the tax jurisdiction details including country and optional state/province.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
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
                name="stateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!watchCountryId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a state (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!watchCountryId ? (
                          <SelectItem value="country_required">Please select a country first</SelectItem>
                        ) : filteredStates.length === 0 ? (
                          <SelectItem value="no_states">No states available for this country</SelectItem>
                        ) : (
                          <>
                            <SelectItem value="country_wide">No specific state (country-wide)</SelectItem>
                            {filteredStates.map((state) => (
                              <SelectItem key={state.id} value={state.id.toString()}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jurisdiction Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. California Sales Tax" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter additional details about this tax jurisdiction" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={createJurisdictionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createJurisdictionMutation.isPending}
                >
                  {createJurisdictionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : "Add Jurisdiction"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Jurisdiction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tax Jurisdiction</DialogTitle>
            <DialogDescription>
              Update the tax jurisdiction details below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
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
                name="stateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!watchCountryId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a state (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!watchCountryId ? (
                          <SelectItem value="country_required">Please select a country first</SelectItem>
                        ) : filteredStates.length === 0 ? (
                          <SelectItem value="no_states">No states available for this country</SelectItem>
                        ) : (
                          <>
                            <SelectItem value="country_wide">No specific state (country-wide)</SelectItem>
                            {filteredStates.map((state) => (
                              <SelectItem key={state.id} value={state.id.toString()}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jurisdiction Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. California Sales Tax" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter additional details about this tax jurisdiction" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateJurisdictionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateJurisdictionMutation.isPending}
                >
                  {updateJurisdictionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : "Update Jurisdiction"}
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
            <AlertDialogTitle>Delete Tax Jurisdiction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tax jurisdiction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteJurisdictionMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteJurisdictionMutation.isPending}
            >
              {deleteJurisdictionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}