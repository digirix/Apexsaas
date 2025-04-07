import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Client } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

const editClientSchema = z.object({
  displayName: z
    .string()
    .min(2, { message: "Display name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  mobile: z.string().min(3, { message: "Please enter a valid mobile number" }),
  status: z.enum(["Active", "Inactive"]),
});

type EditClientFormValues = z.infer<typeof editClientSchema>;

export function EditClientModal({ isOpen, onClose, client }: EditClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      displayName: client?.displayName || "",
      email: client?.email || "",
      mobile: client?.mobile || "",
      status: (client?.status as "Active" | "Inactive") || "Active",
    },
  });

  // Update form values when client changes
  useState(() => {
    if (client) {
      form.reset({
        displayName: client.displayName,
        email: client.email,
        mobile: client.mobile,
        status: client.status as "Active" | "Inactive",
      });
    }
  });

  const updateClient = useMutation({
    mutationFn: async (values: EditClientFormValues) => {
      if (!client) throw new Error("Client not found");
      
      const response = await apiRequest(
        "PUT",
        `/api/v1/clients/${client.id}`,
        values
      );
      
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitting(false);
      toast({
        title: "Client updated",
        description: "Client has been updated successfully",
      });
      
      // Invalidate client queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/clients"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/clients/${client?.id}`],
      });
      
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: EditClientFormValues) => {
    setIsSubmitting(true);
    updateClient.mutate(values);
  };

  // Reset form when modal is closed
  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>

        {!client ? (
          <div className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-10 w-10 text-yellow-500 mb-4" />
            <p className="text-slate-500 text-center">
              Client data not found. Please try again.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter display name" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                      />
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
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Enter mobile number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
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
                  {isSubmitting ? "Updating..." : "Update Client"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}