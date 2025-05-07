import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Brain, 
  Edit, 
  Trash, 
  Plus, 
  Check, 
  X,
  Save,
  Settings,
  User
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

// AI Assistant personality options
const personalityOptions = [
  { value: 'Professional', label: 'Professional - Formal and business-oriented' },
  { value: 'Friendly', label: 'Friendly - Warm and approachable' },
  { value: 'Technical', label: 'Technical - Detail-oriented and precise' },
  { value: 'Concise', label: 'Concise - Brief and to the point' },
  { value: 'Detailed', label: 'Detailed - Thorough and comprehensive' },
];

// AI Assistant specialization options
const specializationOptions = [
  { value: 'General', label: 'General - All-purpose accounting assistant' },
  { value: 'Accounting', label: 'Accounting - Specialized in day-to-day bookkeeping' },
  { value: 'Tax', label: 'Tax - Specialized in tax matters' },
  { value: 'Audit', label: 'Audit - Specialized in audit processes' },
  { value: 'Finance', label: 'Finance - Specialized in financial analysis' },
  { value: 'Compliance', label: 'Compliance - Specialized in regulatory compliance' },
];

// AI Assistant response length options
const responseLengthOptions = [
  { value: 'Brief', label: 'Brief - Short, concise answers' },
  { value: 'Standard', label: 'Standard - Balanced level of detail' },
  { value: 'Detailed', label: 'Detailed - Comprehensive explanations' },
];

// AI Assistant tone options
const toneOptions = [
  { value: 'Formal', label: 'Formal - Professional and corporate' },
  { value: 'Neutral', label: 'Neutral - Balanced and straightforward' },
  { value: 'Casual', label: 'Casual - Relaxed and conversational' },
];

const aiAssistantCustomizationSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  personality: z.enum(['Professional', 'Friendly', 'Technical', 'Concise', 'Detailed']),
  specialization: z.enum(['General', 'Accounting', 'Tax', 'Audit', 'Finance', 'Compliance']),
  responseLength: z.enum(['Brief', 'Standard', 'Detailed']),
  tone: z.enum(['Formal', 'Neutral', 'Casual']),
  isActive: z.boolean().default(false),
});

type AiAssistantCustomization = z.infer<typeof aiAssistantCustomizationSchema>;

export default function AiAssistantCustomizationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCustomization, setEditingCustomization] = useState<AiAssistantCustomization | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCustomizationId, setSelectedCustomizationId] = useState<number | null>(null);

  // Query for fetching AI Assistant customizations
  const { data: customizationsData, isLoading } = useQuery({
    queryKey: ["/api/v1/ai/assistant/customizations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/ai/assistant/customizations");
      if (!response.ok) {
        throw new Error("Failed to fetch AI assistant customizations");
      }
      return response.json();
    },
  });

  // Form setup
  const form = useForm<AiAssistantCustomization>({
    resolver: zodResolver(aiAssistantCustomizationSchema),
    defaultValues: {
      name: "My Assistant",
      personality: "Professional",
      specialization: "General",
      responseLength: "Standard",
      tone: "Neutral",
      isActive: true,
    },
  });

  // Reset form when editing customization changes
  useEffect(() => {
    if (editingCustomization) {
      form.reset({
        ...editingCustomization
      });
    } else {
      form.reset({
        name: "My Assistant",
        personality: "Professional",
        specialization: "General",
        responseLength: "Standard",
        tone: "Neutral",
        isActive: true,
      });
    }
  }, [editingCustomization, form]);

  // Mutations
  const createCustomizationMutation = useMutation({
    mutationFn: async (data: AiAssistantCustomization) => {
      const response = await apiRequest("POST", "/api/v1/ai/assistant/customization", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create AI assistant customization");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/ai/assistant/customizations"] });
      toast({
        title: "AI assistant customization created",
        description: "Your personalized AI assistant settings have been saved.",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create AI assistant customization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCustomizationMutation = useMutation({
    mutationFn: async (data: AiAssistantCustomization) => {
      const response = await apiRequest("PUT", `/api/v1/ai/assistant/customization/${data.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update AI assistant customization");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/ai/assistant/customizations"] });
      toast({
        title: "AI assistant customization updated",
        description: "Your personalized AI assistant settings have been updated.",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update AI assistant customization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCustomizationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/ai/assistant/customization/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete AI assistant customization");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/ai/assistant/customizations"] });
      toast({
        title: "AI assistant customization deleted",
        description: "The customization has been removed.",
      });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete AI assistant customization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/v1/ai/assistant/customization/${id}`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update AI assistant customization status");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/ai/assistant/customizations"] });
      toast({
        title: variables.isActive ? "Assistant activated" : "Assistant deactivated",
        description: variables.isActive 
          ? "This AI assistant is now your active profile." 
          : "This AI assistant has been deactivated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AiAssistantCustomization) => {
    if (editingCustomization?.id) {
      updateCustomizationMutation.mutate({ ...values, id: editingCustomization.id });
    } else {
      createCustomizationMutation.mutate(values);
    }
  };

  const handleEdit = (customization: AiAssistantCustomization) => {
    setEditingCustomization(customization);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    setSelectedCustomizationId(id);
    setShowDeleteDialog(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSelectedCustomizationId(null);
  };

  const handleConfirmDelete = () => {
    if (selectedCustomizationId !== null) {
      deleteCustomizationMutation.mutate(selectedCustomizationId);
    }
  };

  const handleToggleActive = (id: number, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleAddNew = () => {
    setEditingCustomization(null);
    form.reset({
      name: "My Assistant",
      personality: "Professional",
      specialization: "General",
      responseLength: "Standard",
      tone: "Neutral",
      isActive: true,
    });
    setIsOpen(true);
  };

  const customizations = customizationsData?.customizations || [];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>AI Assistant Customization</CardTitle>
          <CardDescription>
            Personalize your AI assistant's personality, specialization, and communication style
          </CardDescription>
        </div>
        <Button onClick={handleAddNew} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create New Assistant
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : customizations && customizations.length > 0 ? (
          <div className="space-y-4">
            {customizations.map((customization: AiAssistantCustomization) => (
              <div 
                key={customization.id} 
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div className="flex items-center space-x-4">
                  <User className={`h-6 w-6 ${customization.isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                  <div>
                    <h3 className="font-medium">{customization.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant={customization.isActive ? "default" : "outline"}>
                        {customization.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {customization.personality} | {customization.specialization} | {customization.responseLength} | {customization.tone}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {!customization.isActive && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleToggleActive(customization.id as number, customization.isActive)}
                      className="text-emerald-600 border-emerald-600"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(customization)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {!customization.isActive && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(customization.id as number)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No AI assistant customizations yet.</p>
            <p className="text-sm">Click "Create New Assistant" to set up your personalized AI assistant.</p>
          </div>
        )}
      </CardContent>

      {/* AI Assistant Customization Edit/Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomization ? "Edit AI Assistant" : "Create New AI Assistant"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assistant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Assistant" {...field} />
                      </FormControl>
                      <FormDescription>
                        Give your AI assistant a name to easily identify it
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personality</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select personality" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {personalityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose how your assistant interacts with you
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {specializationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select what area your assistant should focus on
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responseLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Length</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select response length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {responseLengthOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define how detailed you want your assistant's answers to be
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {toneOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the communication style of your assistant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Set as Active Assistant
                        </FormLabel>
                        <FormDescription>
                          Make this your default AI assistant personality
                        </FormDescription>
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
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingCustomization ? "Update Assistant" : "Create Assistant"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete AI Assistant"
        description="Are you sure you want to delete this AI assistant customization? This action cannot be undone."
      />
    </Card>
  );
}