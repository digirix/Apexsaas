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
import { EntityType, Country } from "@shared/schema";

// Create a schema for the form
const entityTypeFormSchema = z.object({
  name: z.string().min(1, "Entity type name is required"),
  countryId: z.string().min(1, "Country is required"),
});

type EntityTypeFormValues = z.infer<typeof entityTypeFormSchema>;

export function EntityTypesManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null);
  const [filterCountryId, setFilterCountryId] = useState<string | null>(null);
  
  // Fetch countries for the dropdown
  const { data: countries = [], isLoading: isLoadingCountries } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
  });
  
  // Fetch entity types with optional country filter
  const { data: entityTypes = [], isLoading: isLoadingEntityTypes } = useQuery<EntityType[]>({
    queryKey: ["/api/v1/setup/entity-types", filterCountryId],
    queryFn: async ({ queryKey }) => {
      const countryId = queryKey[1];
      const url = countryId 
        ? `/api/v1/setup/entity-types?countryId=${countryId}` 
        : "/api/v1/setup/entity-types";
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch entity types");
      }
      return res.json();
    },
  });
  
  const form = useForm<EntityTypeFormValues>({
    resolver: zodResolver(entityTypeFormSchema),
    defaultValues: {
      name: "",
      countryId: "",
    },
  });
  
  const createEntityTypeMutation = useMutation({
    mutationFn: async (data: EntityTypeFormValues) => {
      const response = await apiRequest("POST", "/api/v1/setup/entity-types", {
        name: data.name,
        countryId: parseInt(data.countryId),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/entity-types"] });
      toast({
        title: "Success",
        description: "Entity type has been created successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entity type. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const updateEntityTypeMutation = useMutation({
    mutationFn: async (data: EntityTypeFormValues) => {
      const response = await apiRequest(
        "PUT", 
        `/api/v1/setup/entity-types/${selectedEntityType?.id}`,
        {
          name: data.name,
          countryId: parseInt(data.countryId),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/entity-types"] });
      toast({
        title: "Success",
        description: "Entity type has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entity type. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const deleteEntityTypeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "DELETE", 
        `/api/v1/setup/entity-types/${selectedEntityType?.id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/entity-types"] });
      toast({
        title: "Success",
        description: "Entity type has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entity type. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: EntityTypeFormValues) => {
    createEntityTypeMutation.mutate(data);
  };
  
  const onEditSubmit = (data: EntityTypeFormValues) => {
    updateEntityTypeMutation.mutate(data);
  };
  
  const handleEdit = (entityType: EntityType) => {
    setSelectedEntityType(entityType);
    form.reset({
      name: entityType.name,
      countryId: entityType.countryId.toString(),
    });
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (entityType: EntityType) => {
    setSelectedEntityType(entityType);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    deleteEntityTypeMutation.mutate();
  };
  
  const getCountryName = (countryId: number) => {
    const country = countries.find(c => c.id === countryId);
    return country ? country.name : "Unknown";
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Entity Types</CardTitle>
          <CardDescription>
            Manage entity types for different countries. Each entity type must be unique within a country.
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
              form.reset({ name: "", countryId: "" });
              setIsAddDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity Type
            </Button>
          </div>
          
          {isLoadingEntityTypes || isLoadingCountries ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
          ) : entityTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">No entity types found</p>
              <Button onClick={() => {
                form.reset({ name: "", countryId: "" });
                setIsAddDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Entity Type
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Type Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityTypes.map((entityType) => (
                  <TableRow key={entityType.id}>
                    <TableCell className="font-medium">{entityType.name}</TableCell>
                    <TableCell>{getCountryName(entityType.countryId)}</TableCell>
                    <TableCell>{new Date(entityType.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(entityType)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entityType)}
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

      {/* Add Entity Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Entity Type</DialogTitle>
            <DialogDescription>
              Add a new entity type for a specific country. Entity types must be unique within each country.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <FormLabel>Entity Type Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., LLC, Corporation, Partnership" {...field} />
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
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createEntityTypeMutation.isPending}
                >
                  {createEntityTypeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Entity Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Entity Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Entity Type</DialogTitle>
            <DialogDescription>
              Update the entity type details. Entity types must be unique within each country.
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
                    <FormLabel>Entity Type Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateEntityTypeMutation.isPending}
                >
                  {updateEntityTypeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Entity Type
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
              This will permanently delete the entity type "{selectedEntityType?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteEntityTypeMutation.isPending}
            >
              {deleteEntityTypeMutation.isPending ? (
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