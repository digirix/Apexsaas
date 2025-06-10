import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SaasLayout from '@/components/saas-admin/saas-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Building2, 
  Zap,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

interface SaasPackage {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: string | null;
  annualPrice: string | null;
  limitsJson: {
    maxUsers?: number;
    maxEntities?: number;
    modules?: string[];
    aiAccess?: boolean;
  } | null;
  isActive: boolean;
  isPubliclyVisible: boolean;
  createdAt: string;
}

const packageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().optional(),
  monthlyPrice: z.string().optional(),
  annualPrice: z.string().optional(),
  maxUsers: z.number().min(1).optional(),
  maxEntities: z.number().min(1).optional(),
  modules: z.array(z.string()).default([]),
  aiAccess: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isPubliclyVisible: z.boolean().default(true),
});

type PackageFormData = z.infer<typeof packageSchema>;

const availableModules = [
  'tasks',
  'finance',
  'clients',
  'reporting',
  'compliance',
  'workflow',
  'notifications',
  'ai-reporting'
];

export default function SaasPackagesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SaasPackage | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: packages, isLoading } = useQuery<{ packages: SaasPackage[] }>({
    queryKey: ['/api/saas-admin/packages'],
  });

  const form = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: '',
      description: '',
      monthlyPrice: '',
      annualPrice: '',
      modules: [],
      aiAccess: false,
      isActive: true,
      isPubliclyVisible: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      const response = await fetch('/api/saas-admin/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          limitsJson: {
            maxUsers: data.maxUsers,
            maxEntities: data.maxEntities,
            modules: data.modules,
            aiAccess: data.aiAccess,
          },
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create package');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/packages'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Package created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create package',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PackageFormData }) => {
      const response = await fetch(`/api/saas-admin/packages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          limitsJson: {
            maxUsers: data.maxUsers,
            maxEntities: data.maxEntities,
            modules: data.modules,
            aiAccess: data.aiAccess,
          },
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update package');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/packages'] });
      setEditingPackage(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Package updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update package',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/saas-admin/packages/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete package');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/packages'] });
      toast({
        title: 'Success',
        description: 'Package deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete package',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PackageFormData) => {
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (pkg: SaasPackage) => {
    setEditingPackage(pkg);
    form.reset({
      name: pkg.name,
      description: pkg.description || '',
      monthlyPrice: pkg.monthlyPrice || '',
      annualPrice: pkg.annualPrice || '',
      maxUsers: pkg.limitsJson?.maxUsers,
      maxEntities: pkg.limitsJson?.maxEntities,
      modules: pkg.limitsJson?.modules || [],
      aiAccess: pkg.limitsJson?.aiAccess || false,
      isActive: pkg.isActive,
      isPubliclyVisible: pkg.isPubliclyVisible,
    });
  };

  const formatPrice = (price: string | null) => {
    if (!price) return 'Free';
    return `$${price}`;
  };

  const formatModules = (modules: string[] | undefined) => {
    if (!modules || modules.length === 0) return 'All modules';
    return modules.join(', ');
  };

  if (isLoading) {
    return (
      <SaasLayout>
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </SaasLayout>
    );
  }

  return (
    <SaasLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Package className="w-8 h-8" />
              Package Management
            </h1>
            <p className="text-slate-600 mt-2">
              Manage subscription packages and pricing tiers
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Package</DialogTitle>
                <DialogDescription>
                  Define a new subscription package with pricing and feature limits.
                </DialogDescription>
              </DialogHeader>
              <PackageForm 
                form={form} 
                onSubmit={onSubmit} 
                isSubmitting={createMutation.isPending}
                availableModules={availableModules}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages?.packages.map((pkg) => (
            <Card key={pkg.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {pkg.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                    {!pkg.isPubliclyVisible && (
                      <Badge variant="outline">Private</Badge>
                    )}
                  </div>
                </div>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Monthly</span>
                    <span className="font-semibold">{formatPrice(pkg.monthlyPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Annual</span>
                    <span className="font-semibold">{formatPrice(pkg.annualPrice)}</span>
                  </div>
                </div>

                <Separator />

                {/* Limits */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">
                      {pkg.limitsJson?.maxUsers ? `${pkg.limitsJson.maxUsers} users` : 'Unlimited users'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">
                      {pkg.limitsJson?.maxEntities ? `${pkg.limitsJson.maxEntities} entities` : 'Unlimited entities'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">
                      {pkg.limitsJson?.aiAccess ? 'AI Access' : 'No AI Access'}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Modules */}
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">Available Modules</p>
                  <p className="text-sm text-slate-500">
                    {formatModules(pkg.limitsJson?.modules)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(pkg)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this package?')) {
                        deleteMutation.mutate(pkg.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPackage} onOpenChange={() => setEditingPackage(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
              <DialogDescription>
                Update the package details, pricing, and feature limits.
              </DialogDescription>
            </DialogHeader>
            <PackageForm 
              form={form} 
              onSubmit={onSubmit} 
              isSubmitting={updateMutation.isPending}
              availableModules={availableModules}
            />
          </DialogContent>
        </Dialog>
      </div>
    </SaasLayout>
  );
}

function PackageForm({ 
  form, 
  onSubmit, 
  isSubmitting, 
  availableModules 
}: { 
  form: any; 
  onSubmit: (data: PackageFormData) => void; 
  isSubmitting: boolean;
  availableModules: string[];
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Package Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Starter, Professional, Enterprise" {...field} />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Brief description of the package" 
                    {...field} 
                    className="min-h-[80px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="monthlyPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Price ($)</FormLabel>
                <FormControl>
                  <Input placeholder="29.99" {...field} />
                </FormControl>
                <FormDescription>Leave empty for free packages</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="annualPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Price ($)</FormLabel>
                <FormControl>
                  <Input placeholder="299.99" {...field} />
                </FormControl>
                <FormDescription>Leave empty for free packages</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxUsers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Users</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Leave empty for unlimited" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxEntities"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Entities</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Leave empty for unlimited" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="modules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Available Modules</FormLabel>
              <FormDescription>
                Select which modules are available in this package. Leave empty for all modules.
              </FormDescription>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableModules.map((module) => (
                  <div key={module} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={module}
                      checked={field.value.includes(module)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange([...field.value, module]);
                        } else {
                          field.onChange(field.value.filter((m: string) => m !== module));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={module} className="text-sm capitalize">
                      {module.replace('-', ' ')}
                    </label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="aiAccess"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>AI Access</FormLabel>
                  <FormDescription>
                    Enable AI features
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
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Package is available
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
          <FormField
            control={form.control}
            name="isPubliclyVisible"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Public</FormLabel>
                  <FormDescription>
                    Visible to customers
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

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Package'}
          </Button>
        </div>
      </form>
    </Form>
  );
}