import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Currency, Country, insertCurrencySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
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

// Extend the schema to include code, name, and countryId
const currencyFormSchema = z.object({
  countryId: z.string().min(1, "Please select a country"),
  code: z.string().min(2, "Currency code must be at least 2 characters").max(5, "Currency code must be 5 characters or less"),
  name: z.string().min(2, "Currency name must be at least 2 characters"),
});

type CurrencyFormValues = z.infer<typeof currencyFormSchema>;

export function CurrenciesManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  
  const { data: currencies = [], isLoading } = useQuery<Currency[]>({
    queryKey: ["/api/v1/setup/currencies"],
  });
  
  const { data: countries = [], isLoading: isCountriesLoading } = useQuery<Country[]>({
    queryKey: ["/api/v1/setup/countries"],
  });
  
  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: {
      countryId: "",
      code: "",
      name: "",
    },
  });
  
  const createCurrencyMutation = useMutation({
    mutationFn: async (data: CurrencyFormValues) => {
      const response = await apiRequest("POST", "/api/v1/setup/currencies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/currencies"] });
      toast({
        title: "Success",
        description: "Currency has been added successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add currency. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CurrencyFormValues> }) => {
      const response = await apiRequest("PUT", `/api/v1/setup/currencies/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/currencies"] });
      toast({
        title: "Success",
        description: "Currency has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedCurrency(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update currency. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/v1/setup/currencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/currencies"] });
      toast({
        title: "Success",
        description: "Currency has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedCurrency(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete currency. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onAddSubmit(data: CurrencyFormValues) {
    createCurrencyMutation.mutate(data);
  }

  function onEditSubmit(data: CurrencyFormValues) {
    if (selectedCurrency) {
      updateCurrencyMutation.mutate({ id: selectedCurrency.id, data });
    }
  }

  function handleEdit(currency: Currency) {
    setSelectedCurrency(currency);
    form.reset({ 
      countryId: currency.countryId ? currency.countryId.toString() : "",
      code: currency.code, 
      name: currency.name 
    });
    setIsEditDialogOpen(true);
  }

  function handleDelete(currency: Currency) {
    setSelectedCurrency(currency);
    setIsDeleteDialogOpen(true);
  }

  function confirmDelete() {
    if (selectedCurrency) {
      deleteCurrencyMutation.mutate(selectedCurrency.id);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Currencies</CardTitle>
          <Button size="sm" onClick={() => {
            form.reset({ countryId: "", code: "", name: "" });
            setIsAddDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Currency
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : currencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-slate-500 mb-4">No currencies found</p>
              <Button onClick={() => {
                form.reset({ countryId: "", code: "", name: "" });
                setIsAddDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Currency
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((currency) => {
                  const country = countries.find(c => c.id === currency.countryId);
                  return (
                    <TableRow key={currency.id}>
                      <TableCell className="font-medium">{currency.code}</TableCell>
                      <TableCell>{currency.name}</TableCell>
                      <TableCell>{country?.name || 'Unknown'}</TableCell>
                      <TableCell>{new Date(currency.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(currency)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(currency)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Currency Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Currency</DialogTitle>
            <DialogDescription>
              Enter the currency details below. Currency code should be a standard code like USD, EUR, etc.
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
                      disabled={isCountriesLoading || countries.length === 0}
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
                    {countries.length === 0 && !isCountriesLoading && (
                      <p className="text-sm text-amber-600">
                        Please add at least one country first
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. USD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. US Dollar" {...field} />
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
                  disabled={createCurrencyMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCurrencyMutation.isPending}
                >
                  {createCurrencyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : "Add Currency"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Currency Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Currency</DialogTitle>
            <DialogDescription>
              Update the currency details below.
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
                      disabled={isCountriesLoading || countries.length === 0}
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
                    {countries.length === 0 && !isCountriesLoading && (
                      <p className="text-sm text-amber-600">
                        Please add at least one country first
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. USD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. US Dollar" {...field} />
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
                  disabled={updateCurrencyMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateCurrencyMutation.isPending}
                >
                  {updateCurrencyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : "Update Currency"}
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
              This will permanently delete the {selectedCurrency?.name} ({selectedCurrency?.code}) currency. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCurrencyMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCurrencyMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteCurrencyMutation.isPending ? (
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
