import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { User, insertUserSchema, Department, Designation } from "@shared/schema";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
}

export function EditUserModal({ isOpen, onClose, user, onSuccess }: EditUserModalProps) {
  const { toast } = useToast();

  // Modified schema for editing (without password)
  const editUserSchema = insertUserSchema.omit({ password: true });
  type FormValues = z.infer<typeof editUserSchema>;

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      departmentId: user.departmentId,
      designationId: user.designationId,
      isActive: user.isActive,
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

  // Update user when props change
  useEffect(() => {
    form.reset({
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      departmentId: user.departmentId,
      designationId: user.designationId,
      isActive: user.isActive,
    });
  }, [user, form]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: FormValues) => {
      return fetch(`/api/v1/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      }).then(res => {
        if (!res.ok) throw new Error("Failed to update user");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/users/${user.id}`] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateUserMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
              <Button type="button" variant="outline" onClick={onClose} className="mr-2">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}