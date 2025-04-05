import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  displayName: z.string().min(2, "Client name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string().min(6, "Mobile number must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      mobile: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/v1/clients", {
        ...data,
        status: "Active",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/clients"] });
      toast({
        title: "Success",
        description: "Client has been created successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormValues) {
    createClientMutation.mutate(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start">
            <div className="mr-4 bg-blue-100 p-2 rounded-full">
              <PlusCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Add New Client</DialogTitle>
              <DialogDescription className="mt-1">
                Please enter the client details below. All fields are required.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Display Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Email*</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter client email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile*</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Enter mobile number" {...field} />
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
                disabled={createClientMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full" />
                    Saving...
                  </>
                ) : "Save Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
