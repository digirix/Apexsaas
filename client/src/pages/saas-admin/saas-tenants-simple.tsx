import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, Pause, Play, Building2, TrendingUp, Users, DollarSign, Calendar, Filter, UserPlus, RefreshCw, Download, MoreHorizontal, Shield, AlertTriangle } from 'lucide-react';
import SaasLayout from '@/components/saas-admin/saas-layout';
import { apiRequest } from '@/lib/queryClient';

interface Tenant {
  id: number;
  companyName: string;
  status: 'active' | 'trial' | 'suspended' | 'canceled';
  createdAt: string;
  trialEndsAt: string | null;
  subscriptionId: number | null;
  userCount: number;
  entityCount: number;
  packageName: string | null;
}

interface TenantsResponse {
  tenants: Tenant[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  totalRevenue: number;
  avgUsersPerTenant: number;
}

export default function SaasTenantsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const limit = 10;

  const { data, isLoading, refetch } = useQuery<TenantsResponse>({
    queryKey: ['/api/saas-admin/tenants', { search: searchTerm, status: statusFilter, page: currentPage, limit }],
  });

  const { data: stats } = useQuery<TenantStats>({
    queryKey: ['/api/saas-admin/tenants/stats'],
  });

  // Suspend/Unsuspend tenant mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ tenantId, action }: { tenantId: number; action: 'suspend' | 'unsuspend' }) => {
      const response = await fetch(`/api/saas-admin/tenants/${tenantId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to update tenant status');
      }
      return response.json();
    },
    onSuccess: (_, { action }) => {
      toast({
        title: `Tenant ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully`,
        description: `The tenant has been ${action === 'suspend' ? 'suspended' : 'reactivated'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/tenants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/tenants/stats'] });
      setShowSuspendDialog(false);
      setSelectedTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Action failed',
        description: error.message || 'Failed to update tenant status',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      trial: 'secondary',
      suspended: 'destructive',
      canceled: 'outline',
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewTenant = (tenantId: number) => {
    setLocation(`/saas-admin/tenants/${tenantId}`);
  };

  const handleSuspendClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowSuspendDialog(true);
  };

  const handleConfirmSuspend = () => {
    if (selectedTenant) {
      const action = selectedTenant.status === 'suspended' ? 'unsuspend' : 'suspend';
      suspendMutation.mutate({ tenantId: selectedTenant.id, action });
    }
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/tenants/stats'] });
  };

  const handleExport = () => {
    // Export functionality would be implemented here
    toast({
      title: 'Export started',
      description: 'Tenant data export will be available shortly.',
    });
  };

  const totalPages = Math.ceil((data?.pagination?.total || 0) / limit);

  return (
    <SaasLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tenant Management</h1>
            <p className="text-slate-600">Comprehensive oversight of all accounting firms on the platform</p>
          </div>
        </div>

        {/* Analytics Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Building2 className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTenants}</div>
                <p className="text-xs text-slate-600">All registered firms</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeTenants}</div>
                <p className="text-xs text-slate-600">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trial Tenants</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.trialTenants}</div>
                <p className="text-xs text-slate-600">On trial period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">${stats.totalRevenue?.toLocaleString() || 0}</div>
                <p className="text-xs text-slate-600">Recurring revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Users</CardTitle>
                <Users className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.avgUsersPerTenant?.toFixed(1) || 0}</div>
                <p className="text-xs text-slate-600">Per tenant</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Search & Filter Tenants
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by company name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add Tenant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              All Tenants ({data?.pagination?.total || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
                      <div className="h-3 bg-slate-200 rounded w-1/4 animate-pulse" />
                    </div>
                    <div className="w-20 h-6 bg-slate-200 rounded animate-pulse" />
                    <div className="w-24 h-8 bg-slate-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : data?.tenants && data.tenants.length > 0 ? (
              <div className="space-y-4">
                {data.tenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {tenant.companyName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-medium text-slate-900">{tenant.companyName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <span>Created {formatDate(tenant.createdAt)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {tenant.userCount} users
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {tenant.entityCount} entities
                          </span>
                          {tenant.packageName && (
                            <>
                              <span>•</span>
                              <span className="font-medium bg-slate-100 px-2 py-1 rounded text-xs">
                                {tenant.packageName}
                              </span>
                            </>
                          )}
                          {tenant.trialEndsAt && tenant.status === 'trial' && (
                            <>
                              <span>•</span>
                              <span className="text-orange-600 font-medium">
                                Trial ends {formatDate(tenant.trialEndsAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(tenant.status)}
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewTenant(tenant.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        {tenant.status === 'suspended' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleSuspendClick(tenant)}
                            disabled={suspendMutation.isPending}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Unsuspend
                          </Button>
                        ) : tenant.status === 'canceled' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            disabled
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Canceled
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => handleSuspendClick(tenant)}
                            disabled={suspendMutation.isPending}
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            Suspend
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-slate-600">
                      Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, data?.pagination?.total || 0)} of {data?.pagination?.total || 0} tenants
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-slate-600 px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No tenants found</h3>
                <p className="text-slate-600">
                  {searchTerm 
                    ? "Try adjusting your search criteria" 
                    : "No tenants have been registered yet"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suspend/Unsuspend Confirmation Dialog */}
        <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTenant?.status === 'suspended' ? (
                  <>
                    <Play className="w-5 h-5 text-green-600" />
                    Unsuspend Tenant
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Suspend Tenant
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedTenant?.status === 'suspended' ? (
                  <>
                    Are you sure you want to <strong>unsuspend</strong> {selectedTenant?.companyName}? 
                    This will restore their access to the platform and all services.
                  </>
                ) : (
                  <>
                    Are you sure you want to <strong>suspend</strong> {selectedTenant?.companyName}? 
                    This will immediately block their access to the platform until unsuspended.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSuspend}
                disabled={suspendMutation.isPending}
                className={selectedTenant?.status === 'suspended' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-orange-600 hover:bg-orange-700'
                }
              >
                {suspendMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : selectedTenant?.status === 'suspended' ? (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Unsuspend Tenant
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Suspend Tenant
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SaasLayout>
  );
}