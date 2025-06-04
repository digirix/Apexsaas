import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, BarChart3, PieChart, LineChart } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface KPIMetric {
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
  description: string;
}

interface TrendData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  clients: number;
}

interface ClientProfitability {
  clientName: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  cumulativeFlow: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('12');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Fetch KPI metrics
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['/api/v1/reports/analytics/kpi', selectedPeriod],
    enabled: true
  });

  // Fetch trend data
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['/api/v1/reports/analytics/trends', selectedPeriod],
    enabled: true
  });

  // Fetch client profitability
  const { data: clientProfitability, isLoading: clientLoading } = useQuery({
    queryKey: ['/api/v1/reports/analytics/client-profitability', selectedPeriod],
    enabled: true
  });

  // Fetch cash flow data
  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['/api/v1/reports/analytics/cash-flow', selectedPeriod],
    enabled: true
  });

  const safeParseNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatCurrency = (value: any) => {
    const numValue = safeParseNumber(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numValue);
  };

  const formatPercentage = (value: any) => {
    const numValue = safeParseNumber(value);
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(1)}%`;
  };

  const sanitizeChartData = (data: any[]): any[] => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(item)) {
        if (key === 'period' || key === 'clientName' || typeof value === 'string') {
          sanitized[key] = value;
        } else {
          sanitized[key] = safeParseNumber(value);
        }
      }
      return sanitized;
    });
  };

  const kpiMetrics: KPIMetric[] = kpiData ? [
    {
      title: 'Total Revenue',
      value: formatCurrency(kpiData.totalRevenue || 0),
      change: kpiData.revenueChange || 0,
      changeType: (kpiData.revenueChange || 0) >= 0 ? 'increase' : 'decrease',
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Total revenue for the selected period'
    },
    {
      title: 'Net Profit Margin',
      value: `${(kpiData.profitMargin || 0).toFixed(1)}%`,
      change: kpiData.profitMarginChange || 0,
      changeType: (kpiData.profitMarginChange || 0) >= 0 ? 'increase' : 'decrease',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Net profit as percentage of revenue'
    },
    {
      title: 'Active Clients',
      value: (kpiData.activeClients || 0).toString(),
      change: kpiData.clientChange || 0,
      changeType: (kpiData.clientChange || 0) >= 0 ? 'increase' : 'decrease',
      icon: <Users className="h-4 w-4" />,
      description: 'Number of active clients'
    },
    {
      title: 'Average Revenue per Client',
      value: formatCurrency(kpiData.revenuePerClient || 0),
      change: kpiData.revenuePerClientChange || 0,
      changeType: (kpiData.revenuePerClientChange || 0) >= 0 ? 'increase' : 'decrease',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Average revenue generated per client'
    }
  ] : [];

  const generateMockData = () => {
    // Generate realistic mock data based on current financial data structure
    const months = [];
    for (let i = parseInt(selectedPeriod) - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        period: format(date, 'MMM yyyy'),
        revenue: Math.floor(Math.random() * 50000) + 30000,
        expenses: Math.floor(Math.random() * 30000) + 20000,
        profit: 0,
        clients: Math.floor(Math.random() * 10) + 15
      });
    }
    
    // Calculate profit
    return months.map(month => ({
      ...month,
      profit: month.revenue - month.expenses
    }));
  };

  const mockTrendData = generateMockData();
  const mockClientData = [
    { clientName: 'ABC Corp', revenue: 45000, expenses: 28000, profit: 17000, profitMargin: 37.8 },
    { clientName: 'XYZ Ltd', revenue: 38000, expenses: 22000, profit: 16000, profitMargin: 42.1 },
    { clientName: 'Tech Solutions', revenue: 52000, expenses: 35000, profit: 17000, profitMargin: 32.7 },
    { clientName: 'Global Industries', revenue: 29000, expenses: 18000, profit: 11000, profitMargin: 37.9 },
    { clientName: 'Local Business', revenue: 21000, expenses: 15000, profit: 6000, profitMargin: 28.6 }
  ];

  const mockKPIData = {
    totalRevenue: 185000,
    revenueChange: 12.5,
    profitMargin: 35.6,
    profitMarginChange: 2.1,
    activeClients: 18,
    clientChange: 2,
    revenuePerClient: 10278,
    revenuePerClientChange: 8.3
  };

  // Use real data only, properly sanitized
  const displayTrendData = sanitizeChartData(trendData || []);
  const displayClientData = sanitizeChartData(clientProfitability || []);
  const displayCashFlowData = sanitizeChartData(cashFlowData || []);
  
  const displayKPIData = {
    totalRevenue: isNaN(kpiData?.totalRevenue) ? 0 : (kpiData?.totalRevenue || 0),
    revenueChange: isNaN(kpiData?.revenueChange) ? 0 : (kpiData?.revenueChange || 0),
    profitMargin: isNaN(kpiData?.profitMargin) ? 0 : (kpiData?.profitMargin || 0),
    profitMarginChange: isNaN(kpiData?.profitMarginChange) ? 0 : (kpiData?.profitMarginChange || 0),
    activeClients: isNaN(kpiData?.activeClients) ? 0 : (kpiData?.activeClients || 0),
    clientChange: isNaN(kpiData?.clientChange) ? 0 : (kpiData?.clientChange || 0),
    revenuePerClient: isNaN(kpiData?.revenuePerClient) ? 0 : (kpiData?.revenuePerClient || 0),
    revenuePerClientChange: isNaN(kpiData?.revenuePerClientChange) ? 0 : (kpiData?.revenuePerClientChange || 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your firm's financial performance
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
              <SelectItem value="24">Last 24 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metric.changeType === 'increase' ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={metric.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}>
                  {formatPercentage(metric.change)}
                </span>
                <span className="ml-1">from last period</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="profitability">Client Profitability</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
        </TabsList>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses Trend</CardTitle>
                <CardDescription>
                  Monthly comparison of revenue and expenses over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={displayTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="revenue" stroke="#0088FE" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" stroke="#FF8042" strokeWidth={2} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Trend</CardTitle>
                <CardDescription>
                  Net profit progression over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={displayTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="profit" stroke="#00C49F" fill="#00C49F" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Client Growth</CardTitle>
              <CardDescription>
                Active client count progression
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={displayTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="clients" fill="#8884D8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Profitability Tab */}
        <TabsContent value="profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Profitability</CardTitle>
              <CardDescription>
                Revenue, expenses, and profit margins by client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayClientData.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{client.clientName}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Revenue: {formatCurrency(client.revenue)}</span>
                        <span>Expenses: {formatCurrency(client.expenses)}</span>
                        <span>Profit: {formatCurrency(client.profit)}</span>
                      </div>
                    </div>
                    <Badge variant={client.profitMargin > 35 ? "default" : client.profitMargin > 25 ? "secondary" : "destructive"}>
                      {client.profitMargin.toFixed(1)}% margin
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>
                  Revenue breakdown by client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={displayClientData}
                      dataKey="revenue"
                      nameKey="clientName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {displayClientData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Margin Comparison</CardTitle>
                <CardDescription>
                  Profit margins across clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={displayClientData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 50]} />
                    <YAxis dataKey="clientName" type="category" width={100} />
                    <Tooltip formatter={(value: any) => `${safeParseNumber(value).toFixed(1)}%`} />
                    <Bar dataKey="profitMargin" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Analysis</CardTitle>
              <CardDescription>
                Monthly cash inflows, outflows, and net cash flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RechartsLineChart data={displayTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="revenue" stroke="#0088FE" strokeWidth={2} name="Cash Inflow" />
                  <Line type="monotone" dataKey="expenses" stroke="#FF8042" strokeWidth={2} name="Cash Outflow" />
                  <Line type="monotone" dataKey="profit" stroke="#00C49F" strokeWidth={2} name="Net Cash Flow" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executive Summary Tab */}
        <TabsContent value="executive" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>
                  Executive summary of financial performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900">Revenue Growth</h4>
                  <p className="text-sm text-blue-700">
                    Revenue has increased by {formatPercentage(displayKPIData.revenueChange)} compared to the previous period,
                    indicating strong business growth.
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900">Profit Margins</h4>
                  <p className="text-sm text-green-700">
                    Net profit margin of {displayKPIData.profitMargin.toFixed(1)}% demonstrates efficient cost management
                    and strong operational performance.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900">Client Base</h4>
                  <p className="text-sm text-purple-700">
                    Active client count has grown by {displayKPIData.clientChange} clients,
                    with average revenue per client at {formatCurrency(displayKPIData.revenuePerClient)}.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Strategic recommendations based on data analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                  <h4 className="font-semibold">Focus on High-Margin Clients</h4>
                  <p className="text-sm text-muted-foreground">
                    Prioritize clients with profit margins above 35% for service expansion opportunities.
                  </p>
                </div>
                <div className="p-4 border-l-4 border-green-500 bg-green-50">
                  <h4 className="font-semibold">Cost Optimization</h4>
                  <p className="text-sm text-muted-foreground">
                    Review expense categories to identify further cost reduction opportunities.
                  </p>
                </div>
                <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                  <h4 className="font-semibold">Client Acquisition</h4>
                  <p className="text-sm text-muted-foreground">
                    Current growth trend supports strategic investment in client acquisition initiatives.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}