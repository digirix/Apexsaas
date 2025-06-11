import { useQuery } from '@tanstack/react-query';
import SaasLayout from '@/components/saas-admin/saas-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, DollarSign, TrendingUp, TrendingDown, Calendar, AlertTriangle, Activity, Clock, CreditCard, UserPlus, Search, Filter, Eye, Play, Pause, Ban, Trash2, MoreHorizontal, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useState } from 'react';
import { Link } from 'wouter';

interface DashboardKPIs {
  totalTenants: number;
  activeTrials: number;
  mrr: number;
  churnRate: number;
  newSignups: number;
  recentTenants: Array<{
    id: number;
    companyName: string;
    status: string;
    createdAt: string;
  }>;
  // Enhanced metrics
  arpu: number; // Average Revenue Per User
  ltv: number; // Lifetime Value
  conversionRate: number;
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  billing: {
    totalRevenue: number;
    pendingPayments: number;
    failedPayments: number;
    nextBillingCycle: string;
  };
  usage: {
    totalUsers: number;
    totalEntities: number;
    totalTasks: number;
    totalInvoices: number;
  };
}

interface TenantGrowthData {
  month: string;
  tenants: number;
  revenue: number;
  trials: number;
}

interface RevenueBreakdown {
  packageName: string;
  revenue: number;
  tenantCount: number;
  color: string;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface TenantData {
  id: number;
  companyName: string;
  status: string;
  createdAt: string;
  packageName?: string;
  userCount?: number;
  entityCount?: number;
  taskCount?: number;
  mrr?: number;
  lastLoginAt?: string;
  trialEndsAt?: string;
}

// Define TenantManagementSection as a separate component
function TenantManagementSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Build query parameters for API call
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: pageSize.toString(),
    search: searchTerm,
    status: statusFilter === 'all' ? '' : statusFilter,
    sortBy,
  }).toString();

  const { data: tenantsResponse, isLoading } = useQuery<{
    tenants: TenantData[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['/api/saas-admin/tenants', queryParams],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tenant Directory Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenant Directory</h2>
          <p className="text-slate-600">
            {isLoading ? 'Loading...' : `${tenantsResponse?.total || 0} total tenants`}
          </p>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Created Date</SelectItem>
              <SelectItem value="companyName">Company Name</SelectItem>
              <SelectItem value="mrr">MRR</SelectItem>
              <SelectItem value="userCount">User Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Tenants Overview
          </CardTitle>
          <CardDescription>
            Comprehensive tenant management with usage metrics and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-1/4" />
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-slate-200 rounded animate-pulse w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : tenantsResponse?.tenants && tenantsResponse.tenants.length > 0 ? (
            <div className="space-y-4">
              {tenantsResponse.tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900">{tenant.companyName}</h3>
                        <Badge className={`text-xs ${getStatusColor(tenant.status)}`}>
                          {tenant.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>Created: {formatDate(tenant.createdAt)}</span>
                        {tenant.packageName && (
                          <span>Package: {tenant.packageName}</span>
                        )}
                        {tenant.trialEndsAt && tenant.status === 'trial' && (
                          <span className="text-amber-600">
                            Trial ends: {formatDate(tenant.trialEndsAt)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{tenant.userCount || 0} users</span>
                        <span>{tenant.entityCount || 0} entities</span>
                        <span>{tenant.taskCount || 0} tasks</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {tenant.mrr && (
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(tenant.mrr)}
                        </div>
                        <div className="text-xs text-slate-500">MRR</div>
                      </div>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/saas-admin/tenants/${tenant.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Impersonate
                        </DropdownMenuItem>
                        {tenant.status === 'active' && (
                          <DropdownMenuItem className="text-amber-600">
                            <Pause className="w-4 h-4 mr-2" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                        {tenant.status === 'suspended' && (
                          <DropdownMenuItem className="text-green-600">
                            <Play className="w-4 h-4 mr-2" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600">
                          <Ban className="w-4 h-4 mr-2" />
                          Cancel Subscription
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {tenantsResponse.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-slate-600">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, tenantsResponse.total)} of {tenantsResponse.total} tenants
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, tenantsResponse.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(tenantsResponse.totalPages - 4, page - 2)) + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === tenantsResponse.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No tenants found</h3>
              <p className="text-slate-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'No tenants have been registered yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SaasDashboardPage() {
  const { data: kpis, isLoading } = useQuery<DashboardKPIs>({
    queryKey: ['/api/saas-admin/dashboard/kpis'],
  });

  const { data: growthData, isLoading: growthLoading } = useQuery<TenantGrowthData[]>({
    queryKey: ['/api/saas-admin/dashboard/growth'],
  });

  const { data: revenueBreakdown, isLoading: revenueLoading } = useQuery<RevenueBreakdown[]>({
    queryKey: ['/api/saas-admin/dashboard/revenue-breakdown'],
  });

  const { data: systemAlerts, isLoading: alertsLoading } = useQuery<SystemAlert[]>({
    queryKey: ['/api/saas-admin/dashboard/alerts'],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <SaasLayout>
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold text-slate-900">SaaS Control Tower</h1>
          <p className="text-slate-600 mt-2">Comprehensive business analytics and tenant management</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="growth">Growth Analytics</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Insights</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                  <Building2 className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : kpis?.totalTenants || 0}
                  </div>
                  <p className="text-xs text-slate-600">
                    {isLoading ? '...' : `${kpis?.newSignups || 0} new this month`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : formatCurrency(kpis?.mrr || 0)}
                  </div>
                  <p className="text-xs text-slate-600">
                    ARPU: {isLoading ? '...' : formatCurrency(kpis?.arpu || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
                  <UserPlus className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : kpis?.activeTrials || 0}
                  </div>
                  <p className="text-xs text-slate-600">
                    Conversion: {isLoading ? '...' : formatPercentage(kpis?.conversionRate || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Customer LTV</CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : formatCurrency(kpis?.ltv || 0)}
                  </div>
                  <p className="text-xs text-slate-600">
                    Churn: {isLoading ? '...' : formatPercentage(kpis?.churnRate || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* System Health & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uptime</span>
                      <span className="font-medium">{isLoading ? '...' : formatPercentage(kpis?.systemHealth?.uptime || 99.9)}</span>
                    </div>
                    <Progress value={kpis?.systemHealth?.uptime || 99.9} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Response Time</span>
                      <span className="font-medium">{isLoading ? '...' : `${kpis?.systemHealth?.responseTime || 120}ms`}</span>
                    </div>
                    <Progress value={Math.max(0, 100 - (kpis?.systemHealth?.responseTime || 120) / 10)} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Error Rate</span>
                      <span className="font-medium">{isLoading ? '...' : formatPercentage(kpis?.systemHealth?.errorRate || 0.1)}</span>
                    </div>
                    <Progress value={Math.max(0, 100 - (kpis?.systemHealth?.errorRate || 0.1) * 20)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Billing Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Revenue</span>
                    <span className="font-bold">{isLoading ? '...' : formatCurrency(kpis?.billing?.totalRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending Payments</span>
                    <span className="font-medium text-amber-600">{isLoading ? '...' : kpis?.billing?.pendingPayments || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Failed Payments</span>
                    <span className="font-medium text-red-600">{isLoading ? '...' : kpis?.billing?.failedPayments || 0}</span>
                  </div>
                  <div className="text-xs text-slate-600 pt-2 border-t">
                    Next billing cycle: {isLoading ? '...' : formatDate(kpis?.billing?.nextBillingCycle || new Date().toISOString())}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    System Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alertsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : systemAlerts && systemAlerts.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {systemAlerts.slice(0, 5).map((alert) => (
                        <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                          alert.type === 'error' ? 'border-red-500 bg-red-50' :
                          alert.type === 'warning' ? 'border-amber-500 bg-amber-50' :
                          'border-blue-500 bg-blue-50'
                        }`}>
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-slate-600">{formatDate(alert.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Activity className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">All systems operational</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Usage Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Usage</CardTitle>
                  <CardDescription>Cross-tenant activity metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Total Users</span>
                      </div>
                      <span className="font-bold">{isLoading ? '...' : kpis?.usage?.totalUsers?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Total Entities</span>
                      </div>
                      <span className="font-bold">{isLoading ? '...' : kpis?.usage?.totalEntities?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">Total Tasks</span>
                      </div>
                      <span className="font-bold">{isLoading ? '...' : kpis?.usage?.totalTasks?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        <span className="text-sm">Total Invoices</span>
                      </div>
                      <span className="font-bold">{isLoading ? '...' : kpis?.usage?.totalInvoices?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Recent Tenants
                  </CardTitle>
                  <CardDescription>
                    {isLoading ? 'Loading...' : `${kpis?.newSignups || 0} new sign-ups this month`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2" />
                          </div>
                          <div className="h-6 bg-slate-200 rounded animate-pulse w-16" />
                        </div>
                      ))}
                    </div>
                  ) : kpis?.recentTenants && kpis.recentTenants.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {kpis.recentTenants.map((tenant) => (
                        <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{tenant.companyName}</p>
                              <p className="text-sm text-slate-600">
                                Joined {formatDate(tenant.createdAt)}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={tenant.status === 'active' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {tenant.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No recent sign-ups</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tenants" className="space-y-6">
            <TenantManagementSection />
          </TabsContent>

          <TabsContent value="growth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Growth Trend</CardTitle>
                <CardDescription>Monthly tenant acquisition and revenue growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                {growthLoading ? (
                  <div className="h-80 bg-slate-200 rounded animate-pulse" />
                ) : growthData && growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value, name) => [
                        name === 'revenue' ? formatCurrency(Number(value)) : value,
                        name === 'tenants' ? 'Tenants' : name === 'revenue' ? 'Revenue' : 'Trials'
                      ]} />
                      <Line yAxisId="left" type="monotone" dataKey="tenants" stroke="#8884d8" strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="trials" stroke="#82ca9d" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-slate-600">No growth data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Package</CardTitle>
                  <CardDescription>Distribution of revenue across subscription tiers</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueLoading ? (
                    <div className="h-64 bg-slate-200 rounded animate-pulse" />
                  ) : revenueBreakdown && revenueBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={revenueBreakdown}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="revenue"
                          label={({ packageName, revenue }) => `${packageName}: ${formatCurrency(revenue)}`}
                        >
                          {revenueBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-slate-600">No revenue data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Package Performance</CardTitle>
                  <CardDescription>Tenant count and revenue by subscription package</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueLoading ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : revenueBreakdown && revenueBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {revenueBreakdown.map((pkg, index) => (
                        <div key={pkg.packageName} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">{pkg.packageName}</h4>
                            <Badge style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                              {pkg.tenantCount} tenants
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm text-slate-600">
                            <span>Monthly Revenue</span>
                            <span className="font-bold text-slate-900">{formatCurrency(pkg.revenue)}</span>
                          </div>
                          <div className="mt-2">
                            <Progress 
                              value={(pkg.revenue / Math.max(...revenueBreakdown.map(p => p.revenue))) * 100} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No package data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    System Performance
                  </CardTitle>
                  <CardDescription>Real-time platform health metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">System Uptime</span>
                      <span className="text-lg font-bold text-green-600">
                        {isLoading ? '...' : formatPercentage(kpis?.systemHealth?.uptime || 99.9)}
                      </span>
                    </div>
                    <Progress value={kpis?.systemHealth?.uptime || 99.9} className="h-3" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Response Time</span>
                      <span className="text-lg font-bold">
                        {isLoading ? '...' : `${kpis?.systemHealth?.responseTime || 120}ms`}
                      </span>
                    </div>
                    <Progress value={Math.max(0, 100 - (kpis?.systemHealth?.responseTime || 120) / 10)} className="h-3" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Error Rate</span>
                      <span className="text-lg font-bold text-red-600">
                        {isLoading ? '...' : formatPercentage(kpis?.systemHealth?.errorRate || 0.1)}
                      </span>
                    </div>
                    <Progress value={Math.max(0, 100 - (kpis?.systemHealth?.errorRate || 0.1) * 20)} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    System Alerts & Monitoring
                  </CardTitle>
                  <CardDescription>Active alerts and system notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  {alertsLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : systemAlerts && systemAlerts.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {systemAlerts.map((alert) => (
                        <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                          alert.type === 'error' ? 'border-red-500 bg-red-50' :
                          alert.type === 'warning' ? 'border-amber-500 bg-amber-50' :
                          'border-blue-500 bg-blue-50'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{alert.message}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {formatDate(alert.timestamp)}
                              </p>
                            </div>
                            <Badge variant={alert.resolved ? 'secondary' : 'destructive'}>
                              {alert.resolved ? 'Resolved' : 'Active'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">All Systems Operational</h3>
                      <p className="text-slate-600">No active alerts or issues detected</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SaasLayout>
  );
}