import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { InsertUser, insertUserSchema, Department, Designation } from "@shared/schema";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Extended schema with password confirmation
  const extendedSchema = insertUserSchema.extend({
    confirmPassword: z.string().min(1, "Confirm password is required"),
    password: z.string().min(8, "Password must be at least 8 characters")
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

  type FormValues = z.infer<typeof extendedSchema>;

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(extendedSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      isActive: true,
      isSuperAdmin: false
    },
  });

  // Fetch departments for dropdown
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/v1/departments'],
  });

  // Fetch designations for dropdown
  const { data: designations } = useQuery<Designation[]>({
    queryKey: ['/api/v1/designations'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: Omit<FormValues, 'confirmPassword'>) => {
      const { confirmPassword, ...userDataWithoutConfirm } = userData as any;
      
      const response = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userDataWithoutConfirm),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
      form.reset();
      setSubmitting(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitting(true);
      const { confirmPassword, ...userData } = data;
      await createUserMutation.mutateAsync(userData);
    } catch (error) {
      console.error("Error in form submission:", error);
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new team member for your organization
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {departments?.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
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
                name="designationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {designations?.map((designation) => (
                          <SelectItem key={designation.id} value={designation.id.toString()}>
                            {designation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <div className="text-sm text-slate-500">
                      Users with active status can log in to the system
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}