import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { State, Country, insertStateSchema } from "@shared/schema";
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
import { Plus, Pencil, Trash2, Loader2, Filter } from "lucide-react";

// Modify the schema for the form
const stateFormSchema = z.object({
  name: z.string().min(2, "State name must be at least 2 characters"),
  countryId: z.string().min(1, "Please select a country"),
});

type StateFormValues = z.infer<typeof stateFormSchema>;

export function StatesManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [filterCountryId, setFilterCountryId] = useState<string | null>(null);
  
  // Fetch countries for the dropdown
  const { data: countries = [], isLoading: isLoadingCountries } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
  });
  
  // Fetch states with optional country filter
  const { data: states = [], isLoading: isLoadingStates } = useQuery<State[]>({
    queryKey: ["/api/v1/setup/states", filterCountryId],
    queryFn: async ({ queryKey }) => {
      const countryId = queryKey[1];
      const url = countryId 
        ? `/api/v1/setup/states?countryId=${countryId}` 
        : "/api/v1/setup/states";
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch states");
      }
      return res.json();
    },
  });
  
  const form = useForm<StateFormValues>({
    resolver: zodResolver(stateFormSchema),
    defaultValues: {
      name: "",
      countryId: "",
    },
  });
  
  const createStateMutation = useMutation({
    mutationFn: async (data: StateFormValues) => {
      const response = await apiRequest("POST", "/api/v1/setup/states", {
        name: data.name,
        countryId: parseInt(data.countryId),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/states"] });
      toast({
        title: "Success",
        description: "State has been added successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add state. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string, countryId: number } }) => {
      const response = await apiRequest("PUT", `/api/v1/setup/states/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/states"] });
      toast({
        title: "Success",
        description: "State has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedState(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update state. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteStateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/v1/setup/states/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/states"] });
      toast({
        title: "Success",
        description: "State has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedState(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete state. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to get country name by id
  const getCountryName = (id: number): string => {
    const country = countries.find(c => c.id === id);
    return country ? country.name : "Unknown";
  };

  function onAddSubmit(data: StateFormValues) {
    createStateMutation.mutate(data);
  }

  function onEditSubmit(data: StateFormValues) {
    if (selectedState) {
      updateStateMutation.mutate({ 
        id: selectedState.id, 
        data: {
          name: data.name,
          countryId: parseInt(data.countryId),
        }
      });
    }
  }

  function handleEdit(state: State) {
    setSelectedState(state);
    form.reset({ 
      name: state.name,
      countryId: state.countryId.toString(),
    });
    setIsEditDialogOpen(true);
  }

  function handleDelete(state: State) {
    setSelectedState(state);
    setIsDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (selectedState) {
      deleteStateMutation.mutate(selectedState.id);
    }
  }

  const isLoading = isLoadingCountries || isLoadingStates;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>States / Provinces</CardTitle>
          <div className="flex space-x-2">
            <Select
              value={filterCountryId || ""}
              onValueChange={(value) => setFilterCountryId(value || null)}
            >
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>{filterCountryId ? getCountryName(parseInt(filterCountryId)) : "All Countries"}</span>
                </div>
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
            
            <Button size="sm" onClick={() => {
              form.reset({ name: "", countryId: "" });
              setIsAddDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add State
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
          ) : states.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">No states found</p>
              <Button onClick={() => {
                form.reset({ name: "", countryId: "" });
                setIsAddDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First State
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {states.map((state) => (
                  <TableRow key={state.id}>
                    <TableCell className="font-medium">{state.name}</TableCell>
                    <TableCell>{getCountryName(state.countryId)}</TableCell>
                    <TableCell>{new Date(state.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(state)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(state)}
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

      {/* Add State Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New State/Province</DialogTitle>
            <DialogDescription>
              Enter the state or province name and select the country it belongs to.
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. California" {...field} />
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
                  disabled={createStateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createStateMutation.isPending}
                >
                  {createStateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : "Add State"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit State Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit State/Province</DialogTitle>
            <DialogDescription>
              Update the state or province details below.
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. California" {...field} />
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
                  disabled={updateStateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateStateMutation.isPending}
                >
                  {updateStateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : "Update State"}
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
              This will permanently delete {selectedState?.name} from {getCountryName(selectedState?.countryId || 0)}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteStateMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteStateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
