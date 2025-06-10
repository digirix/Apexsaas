import { useQuery } from '@tanstack/react-query';
import SaasLayout from '@/components/saas-admin/saas-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

export default function SaasDashboardPage() {
  const { data: kpis, isLoading } = useQuery<DashboardKPIs>({
    queryKey: ['/api/saas-admin/dashboard/kpis'],
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

  return (
    <SaasLayout>
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold text-slate-900">SaaS Dashboard</h1>
          <p className="text-slate-600 mt-2">Monitor tenant activity and business metrics</p>
        </div>

        {/* KPI Cards */}
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
                Active accounting firms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : kpis?.activeTrials || 0}
              </div>
              <p className="text-xs text-slate-600">
                Currently in trial period
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
                Recurring revenue (MRR)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              {(kpis?.churnRate || 0) > 5 ? (
                <TrendingUp className="h-4 w-4 text-red-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : `${(kpis?.churnRate || 0).toFixed(1)}%`}
              </div>
              <p className="text-xs text-slate-600">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tenants */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Recent Sign-ups
              </CardTitle>
              <CardDescription>
                {isLoading ? (
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-48" />
                ) : (
                  `${kpis?.newSignups || 0} new tenants in the last 30 days`
                )}
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
                <div className="space-y-4">
                  {kpis.recentTenants.slice(0, 5).map((tenant) => (
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Growth Metrics
              </CardTitle>
              <CardDescription>
                Key performance indicators for business growth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Tenants</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? '...' : kpis?.totalTenants || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? '...' : formatCurrency(kpis?.mrr || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Churn Rate</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? '...' : `${(kpis?.churnRate || 0).toFixed(1)}%`}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    (kpis?.churnRate || 0) > 5 ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {(kpis?.churnRate || 0) > 5 ? (
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SaasLayout>
  );
}