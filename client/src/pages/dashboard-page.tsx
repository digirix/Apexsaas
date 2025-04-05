import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, 
  ClipboardCheck, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/v1/clients"],
  });

  // Demo data for charts
  const taskStatusData = [
    { name: "New", value: 4, color: "#94A3B8" },
    { name: "In Progress", value: 7, color: "#3B82F6" },
    { name: "Completed", value: 12, color: "#10B981" },
    { name: "Overdue", value: 2, color: "#EF4444" },
  ];

  const monthlyRevenueData = [
    { name: "Jan", value: 3200 },
    { name: "Feb", value: 4500 },
    { name: "Mar", value: 5200 },
    { name: "Apr", value: 4800 },
    { name: "May", value: 6100 },
    { name: "Jun", value: 5800 },
  ];

  const clientsByCountryData = [
    { name: "United States", value: 8 },
    { name: "United Kingdom", value: 5 },
    { name: "Canada", value: 3 },
    { name: "Australia", value: 2 },
    { name: "Other", value: 3 },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Clients</p>
                <h3 className="text-2xl font-bold text-slate-900">{clients.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-4">
                <ClipboardCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Active Tasks</p>
                <h3 className="text-2xl font-bold text-slate-900">23</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-4">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Monthly Revenue</p>
                <h3 className="text-2xl font-bold text-slate-900">$5,800</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Overdue Tasks</p>
                <h3 className="text-2xl font-bold text-slate-900">2</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-md font-medium">Revenue Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <LineChart
                data={monthlyRevenueData}
                xAxis={{ dataKey: "name" }}
                series={[{ dataKey: "value", stroke: "#3B82F6" }]}
                tooltip
                yAxis={{ format: (value) => `$${value}` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-md font-medium">Task Status</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <PieChart
                data={taskStatusData}
                dataKey="value"
                category="name"
                colors={taskStatusData.map(item => item.color)}
                tooltip
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-md font-medium">Clients by Country</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <BarChart
                data={clientsByCountryData}
                xAxis={{ dataKey: "name" }}
                series={[{ dataKey: "value", color: "#3B82F6" }]}
                tooltip
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-md font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 h-2 w-2 rounded-full bg-amber-500"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Quarterly Tax Filing</p>
                    <p className="text-xs text-slate-500">Acme Corp - US Entity</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 mr-1" />
                  <span className="text-xs text-slate-500">2 days left</span>
                </div>
              </li>
              
              <li className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 h-2 w-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">VAT Return</p>
                    <p className="text-xs text-slate-500">Global Industries - UK Entity</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 mr-1" />
                  <span className="text-xs text-slate-500">5 days left</span>
                </div>
              </li>
              
              <li className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 h-2 w-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Annual Report</p>
                    <p className="text-xs text-slate-500">Tech Titans - US Entity</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-xs text-slate-500">Completed</span>
                </div>
              </li>
              
              <li className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 h-2 w-2 rounded-full bg-red-500"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Monthly Payroll</p>
                    <p className="text-xs text-slate-500">Acme Corp - US Entity</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-xs text-slate-500">Overdue</span>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
