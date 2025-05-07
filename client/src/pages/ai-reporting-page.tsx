import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart,
  BarChart2,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Brain,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Terminal
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { BarChart as RechartsBarChart, LineChart as RechartsLineChart, PieChart as RechartsPieChart } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReportData {
  text: string;
  charts?: {
    type: "bar" | "line" | "pie";
    title: string;
    data: any[];
    xAxis?: {
      dataKey: string;
      label?: string;
    };
    series?: {
      dataKey: string;
      color?: string;
    }[];
    // For pie charts
    dataKey?: string;
    category?: string;
    colors?: string[];
  }[];
  rawData?: any;
  sql?: string;
  processingTimeMs?: number;
}

export default function AiReportingPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("report");
  const { toast } = useToast();
  
  // Check if AI is configured for this tenant
  const aiStatusQuery = useQuery<{
    isAvailable: boolean;
    provider: string | null;
    model: string | null;
  }>({
    queryKey: ["/api/v1/ai/chat/status"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const isAiAvailable = aiStatusQuery.data?.isAvailable || false;
  const aiProvider = aiStatusQuery.data?.provider;
  const aiModel = aiStatusQuery.data?.model;
  
  // Mutation for generating reports
  const generateReportMutation = useMutation({
    mutationFn: async (userQuery: string) => {
      const response = await apiRequest("POST", "/api/v1/ai/report", { query: userQuery });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate report");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report generated",
        description: "Your report has been generated successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate report",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a question to generate a report.",
        variant: "destructive"
      });
      return;
    }
    
    generateReportMutation.mutate(query);
  };
  
  const reportData: ReportData | undefined = generateReportMutation.data;
  
  const renderCharts = () => {
    if (!reportData?.charts || reportData.charts.length === 0) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {reportData.charts.map((chart, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-md font-medium">{chart.title}</CardTitle>
              {chart.type === "bar" && <BarChart2 className="h-4 w-4 text-slate-500" />}
              {chart.type === "line" && <LineChartIcon className="h-4 w-4 text-slate-500" />}
              {chart.type === "pie" && <PieChartIcon className="h-4 w-4 text-slate-500" />}
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {chart.type === "bar" && (
                  <RechartsBarChart
                    data={chart.data}
                    xAxis={chart.xAxis ? { dataKey: chart.xAxis.dataKey, label: chart.xAxis.label } : { dataKey: "name" }}
                    series={chart.series || []}
                    tooltip
                  />
                )}
                {chart.type === "line" && (
                  <RechartsLineChart
                    data={chart.data}
                    xAxis={chart.xAxis ? { dataKey: chart.xAxis.dataKey, label: chart.xAxis.label } : { dataKey: "name" }}
                    series={chart.series || []}
                    tooltip
                  />
                )}
                {chart.type === "pie" && (
                  <RechartsPieChart
                    data={chart.data}
                    dataKey={chart.dataKey || "value"}
                    category={chart.category || "name"}
                    colors={chart.colors || ["#3B82F6", "#F59E0B", "#10B981", "#6366F1", "#EC4899"]}
                    tooltip
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <AppLayout title="AI Reporting">
      {!isAiAvailable ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            AI services are not configured for your account. Please go to Setup &gt; AI Configurations 
            to set up an AI provider before using this feature.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-blue-500" />
              AI Reporting
            </CardTitle>
            <CardDescription>
              Ask questions about your financial data and get instant reports with visualizations.
              {aiProvider && aiModel && (
                <div className="text-xs text-muted-foreground mt-1">
                  Using {aiProvider} ({aiModel})
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateReport}>
              <div className="space-y-4">
                <Textarea
                  placeholder="Ask a question about your business data (e.g., 'What were my top 5 revenue sources last month?', 'Show me client activity trends for Q2', 'Compare invoice payment times across clients')"
                  className="min-h-[100px] resize-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit"
                    disabled={generateReportMutation.isPending || !query.trim()}
                    className="flex items-center"
                  >
                    {generateReportMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {generateReportMutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Skeleton className="h-[200px] rounded-md" />
                <Skeleton className="h-[200px] rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {generateReportMutation.isSuccess && reportData && (
        <Card>
          <CardHeader>
            <Tabs defaultValue="report" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="report">Report</TabsTrigger>
                {reportData.sql && <TabsTrigger value="sql">SQL Query</TabsTrigger>}
                {reportData.rawData && <TabsTrigger value="data">Raw Data</TabsTrigger>}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <TabsContent value="report" className="space-y-6 mt-0">
              <div className="prose prose-blue max-w-none">
                <div dangerouslySetInnerHTML={{ __html: reportData.text.replace(/\n/g, '<br/>') }} />
              </div>
              {renderCharts()}
            </TabsContent>
            
            {reportData.sql && (
              <TabsContent value="sql" className="mt-0">
                <div className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto">
                  <pre className="text-sm font-mono">{reportData.sql}</pre>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  <Terminal className="inline-block h-3 w-3 mr-1" />
                  This is the SQL query that was generated to retrieve your data.
                </p>
              </TabsContent>
            )}
            
            {reportData.rawData && (
              <TabsContent value="data" className="mt-0">
                <div className="bg-slate-100 p-4 rounded-md overflow-x-auto">
                  <pre className="text-sm">{JSON.stringify(reportData.rawData, null, 2)}</pre>
                </div>
              </TabsContent>
            )}
          </CardContent>
          <CardFooter className="border-t bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
            <div>
              Generated in {reportData.processingTimeMs ? (reportData.processingTimeMs / 1000).toFixed(2) : '?'} seconds
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8"
              onClick={() => generateReportMutation.mutate(query)}
              disabled={generateReportMutation.isPending}
            >
              {generateReportMutation.isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1">Regenerate</span>
            </Button>
          </CardFooter>
        </Card>
      )}
    </AppLayout>
  );
}