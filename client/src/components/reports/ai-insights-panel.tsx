import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, AlertCircle, Brain, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

interface ReportInsight {
  type: 'success' | 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  metric?: string;
  value?: string | number;
}

interface AIInsightsPanelProps {
  reportType: 'task-performance' | 'compliance-overview' | 'team-efficiency' | 'task-lifecycle' | 'risk-assessment' | 'jurisdiction-analysis';
  filters?: Record<string, any>;
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function AIInsightsPanel({ reportType, filters = {} }: AIInsightsPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/v1/ai/report-insights/${reportType}`, filters],
    enabled: open, // Only fetch when dialog is opened
  });

  const insights = response?.insights || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="flex items-center gap-2"
          variant="outline"
        >
          <Brain className="w-4 h-4" />
          AI Insights
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Report Insights
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-sm text-muted-foreground">Analyzing report data...</p>
              </div>
            </div>
          ) : error || insights.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Info className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {error ? 'Unable to generate insights at this time' : 'No insights available for current data'}
                </p>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {insights.length} insights generated from current filters
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="grid gap-4">
                {insights.map((insight: ReportInsight, index: number) => (
                  <Card key={index} className="border-l-4 border-l-purple-400">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{insight.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPriorityColor(insight.priority)}`}
                            >
                              {insight.priority} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                          {insight.recommendation && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                              <p className="text-sm font-medium text-blue-900 mb-1">Recommendation:</p>
                              <p className="text-sm text-blue-800">{insight.recommendation}</p>
                            </div>
                          )}
                          {insight.metric && insight.value && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">{insight.metric}:</span>
                              <span className="font-medium">{insight.value}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}