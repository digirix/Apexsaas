import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Country, insertCountrySchema } from "@shared/schema";
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type CountryFormValues = z.infer<typeof insertCountrySchema>;

export function CountriesManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  
  const { data: countries = [], isLoading } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
  });
  
  const form = useForm<CountryFormValues>({
    resolver: zodResolver(insertCountrySchema.omit({ tenantId: true })),
    defaultValues: {
      name: "",
    },
  });
  
  const createCountryMutation = useMutation({
    mutationFn: async (data: CountryFormValues) => {
      const response = await apiRequest("POST", "/api/v1/setup/countries", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/countries"] });
      toast({
        title: "Success",
        description: "Country has been created successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create country. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCountryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CountryFormValues> }) => {
      const response = await apiRequest("PUT", `/api/v1/setup/countries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/countries"] });
      toast({
        title: "Success",
        description: "Country has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedCountry(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update country. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCountryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/v1/setup/countries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/countries"] });
      toast({
        title: "Success",
        description: "Country has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedCountry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete country. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onAddSubmit(data: CountryFormValues) {
    createCountryMutation.mutate(data);
  }

  function onEditSubmit(data: CountryFormValues) {
    if (selectedCountry) {
      updateCountryMutation.mutate({ id: selectedCountry.id, data });
    }
  }

  function handleEdit(country: Country) {
    setSelectedCountry(country);
    form.reset({ name: country.name });
    setIsEditDialogOpen(true);
  }

  function handleDelete(country: Country) {
    setSelectedCountry(country);
    setIsDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (selectedCountry) {
      deleteCountryMutation.mutate(selectedCountry.id);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Countries</CardTitle>
          <Button size="sm" onClick={() => {
            form.reset({ name: "" });
            setIsAddDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Country
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : countries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">No countries found</p>
              <Button onClick={() => {
                form.reset({ name: "" });
                setIsAddDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Country
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((country) => (
                  <TableRow key={country.id}>
                    <TableCell className="font-medium">{country.name}</TableCell>
                    <TableCell>{new Date(country.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(country)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(country)}
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

      {/* Add Country Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Country</DialogTitle>
            <DialogDescription>
              Enter the country name below. This will be used across the system.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. United States" {...field} />
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
                  disabled={createCountryMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCountryMutation.isPending}
                >
                  {createCountryMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : "Add Country"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Country Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Country</DialogTitle>
            <DialogDescription>
              Update the country name below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. United States" {...field} />
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
                  disabled={updateCountryMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateCountryMutation.isPending}
                >
                  {updateCountryMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : "Update Country"}
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
              This will permanently delete {selectedCountry?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCountryMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCountryMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteCountryMutation.isPending ? (
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
