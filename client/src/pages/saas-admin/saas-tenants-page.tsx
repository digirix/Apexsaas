import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import SaasLayout from '@/components/saas-admin/saas-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Eye, Building2, Filter, Download, Users, DollarSign, Calendar, TrendingUp } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 10;

  const { data, isLoading } = useQuery<TenantsResponse>({
    queryKey: ['/api/saas-admin/tenants', { search: searchTerm, status: statusFilter, page: currentPage, limit }],
  });

  const { data: stats } = useQuery<TenantStats>({
    queryKey: ['/api/saas-admin/tenants/stats'],
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

  const handleSelectAll = () => {
    if (selectedTenants.length === data?.tenants.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(data?.tenants.map(t => t.id) || []);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedTenants.length === 0) return;
    
    try {
      // Implement bulk actions here
      console.log(`Performing ${action} on tenants:`, selectedTenants);
      // Add actual API calls for bulk operations
      setSelectedTenants([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
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
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
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
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filter Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by company name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
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
              {(searchTerm || (statusFilter && statusFilter !== 'all')) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  size="sm"
                >
                  Clear Filters
                </Button>
              )}
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
                  <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Entities</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.tenants?.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{tenant.companyName}</p>
                              <p className="text-sm text-slate-600">ID: {tenant.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(tenant.status)}
                        </TableCell>
                        <TableCell>
                          {tenant.packageName || (
                            <span className="text-slate-400">No package</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tenant.userCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tenant.entityCount}</Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(tenant.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Link href={`/saas-admin/tenants/${tenant.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-600">
                          No tenants found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, data?.pagination?.total || 0)} of {data?.pagination?.total || 0} tenants
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SaasLayout>
  );
}