import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

interface AddWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowCreated: (workflowId: number) => void;
}

// Define form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerEvent: z.string().min(1, "Trigger event is required"),
});

type FormData = z.infer<typeof formSchema>;

export function AddWorkflowModal({ isOpen, onClose, onWorkflowCreated }: AddWorkflowModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerEvent: "task_status_changed",
    },
  });

  // Create workflow mutation
  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest('/api/v1/workflows', 'POST', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/workflows'] });
      toast({
        title: "Workflow created",
        description: "The workflow has been created successfully.",
      });
      // Close modal and trigger the callback with the new workflow ID
      if (response && response.id) {
        onWorkflowCreated(response.id);
      } else {
        onClose();
      }
    },
    onError: () => {
      toast({
        title: "Failed to create workflow",
        description: "There was an error creating the workflow. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Assign Tasks Automatically" {...field} />
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
                      placeholder="Describe what this workflow does..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggerEvent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Event</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trigger event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="task_created_admin">Admin Task Created</SelectItem>
                      <SelectItem value="task_created_revenue">Revenue Task Created</SelectItem>
                      <SelectItem value="task_status_changed">Task Status Changed</SelectItem>
                      <SelectItem value="task_assignee_changed">Task Assignee Changed</SelectItem>
                      <SelectItem value="task_due_date_arrives">Task Due Date Arrives</SelectItem>
                      <SelectItem value="task_due_date_approaching">Task Due Date Approaching</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Create Workflow
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}