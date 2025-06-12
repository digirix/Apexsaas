import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import SaasLayout from '@/components/saas-admin/saas-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Users, 
  Briefcase, 
  Calendar, 
  CreditCard, 
  Eye,
  Pause,
  Play,
  UserX,
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TenantDetails {
  id: number;
  companyName: string;
  status: string;
  createdAt: string;
  trialEndsAt: string | null;
  primaryAdminUser: {
    id: number;
    email: string;
    displayName: string;
  } | null;
  stats?: {
    userCount: number;
    entityCount: number;
    taskCount: number;
    invoiceCount: number;
  };
  subscription: {
    id: number;
    packageName: string;
    status: string;
    currentPeriodEnd: string;
    stripeSubscriptionId: string | null;
  } | null;
}

export default function SaasTenantDetailPage() {
  const [match, params] = useRoute('/saas-admin/tenants/:tenantId');
  const tenantId = params?.tenantId;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tenant, isLoading } = useQuery<TenantDetails>({
    queryKey: ['/api/saas-admin/tenants', tenantId],
    enabled: !!tenantId,
  });

  const impersonateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/saas-admin/tenants/${tenantId}/impersonate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to start impersonation');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to tenant application with impersonation token
      window.location.href = data.loginUrl;
      toast({
        title: 'Impersonation Started',
        description: `Redirecting to tenant dashboard...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Impersonation Failed',
        description: error.message || 'Failed to start impersonation',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (action: 'suspend' | 'unsuspend' | 'cancel') => {
      const response = await fetch(`/api/saas-admin/tenants/${tenantId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to ${action} tenant`);
      }
      return response.json();
    },
    onSuccess: (data, action) => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/tenants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/tenants'] });
      toast({
        title: 'Success',
        description: `Tenant ${action} successful`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Action Failed',
        description: error.message || 'Failed to update tenant status',
        variant: 'destructive',
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!match || !tenantId) {
    return (
      <SaasLayout>
        <div className="text-center py-8">
          <p className="text-slate-600">Tenant not found</p>
        </div>
      </SaasLayout>
    );
  }

  if (isLoading) {
    return (
      <SaasLayout>
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-48" />
          </div>
          <div className="h-96 bg-slate-200 rounded animate-pulse" />
        </div>
      </SaasLayout>
    );
  }

  if (!tenant) {
    return (
      <SaasLayout>
        <div className="text-center py-8">
          <p className="text-slate-600">Tenant not found</p>
        </div>
      </SaasLayout>
    );
  }

  return (
    <SaasLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Building2 className="w-8 h-8" />
                {tenant.companyName}
              </h1>
              <p className="text-slate-600 mt-2">
                Created {formatDate(tenant.createdAt)} • ID: {tenant.id}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(tenant.status)}>
                {tenant.status}
              </Badge>
              <Button
                onClick={() => impersonateMutation.mutate()}
                disabled={impersonateMutation.isPending || tenant.status === 'suspended'}
                size="sm"
                variant="outline"
              >
                <Eye className="w-4 h-4 mr-2" />
                Impersonate
              </Button>
            </div>
          </div>
        </div>

        {/* Status Alert */}
        {tenant.status === 'trial' && tenant.trialEndsAt && (
          <Alert>
            <Calendar className="w-4 h-4" />
            <AlertDescription>
              Trial ends on {formatDate(tenant.trialEndsAt)}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscription">Subscription & Billing</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Primary Admin */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Primary Administrator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium">{tenant.primaryAdminUser?.displayName || 'No admin assigned'}</p>
                    <p className="text-sm text-slate-600">{tenant.primaryAdminUser?.email || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Users</CardTitle>
                  <Users className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenant.stats?.userCount || 0}</div>
                  <p className="text-xs text-slate-600">Active users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Entities</CardTitle>
                  <Briefcase className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenant.stats?.entityCount || 0}</div>
                  <p className="text-xs text-slate-600">Client entities</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                  <Calendar className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenant.stats?.taskCount || 0}</div>
                  <p className="text-xs text-slate-600">Total tasks</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                  <CreditCard className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenant.stats?.invoiceCount || 0}</div>
                  <p className="text-xs text-slate-600">Generated invoices</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tenant.subscription ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Package</p>
                        <p className="text-lg font-semibold">{tenant.subscription.packageName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Status</p>
                        <Badge className={getStatusColor(tenant.subscription.status)}>
                          {tenant.subscription.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Current Period Ends</p>
                        <p>{formatDate(tenant.subscription.currentPeriodEnd)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Stripe Subscription</p>
                        <p className="text-sm text-slate-500">
                          {tenant.subscription.stripeSubscriptionId || 'Not connected'}
                        </p>
                      </div>
                    </div>
                    
                    {tenant.subscription.stripeSubscriptionId && (
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View in Stripe
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-600">No active subscription</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Actions</CardTitle>
                <CardDescription>
                  Manage this tenant's status and access. Use with caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Suspend Access</p>
                      <p className="text-sm text-slate-600">
                        Temporarily disable tenant access to the application
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => statusMutation.mutate('suspend')}
                      disabled={statusMutation.isPending || tenant.status === 'suspended'}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Suspend
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Restore Access</p>
                      <p className="text-sm text-slate-600">
                        Re-enable access for a suspended tenant
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => statusMutation.mutate('unsuspend')}
                      disabled={statusMutation.isPending || tenant.status !== 'suspended'}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Unsuspend
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                    <div>
                      <p className="font-medium text-red-900">Cancel Subscription</p>
                      <p className="text-sm text-red-700">
                        Permanently cancel this tenant's subscription. This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => statusMutation.mutate('cancel')}
                      disabled={statusMutation.isPending || tenant.status === 'cancelled'}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SaasLayout>
  );
}