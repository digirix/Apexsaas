import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, AlertCircle, Brain, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const { data: insights = [], isLoading, error, refetch } = useQuery({
    queryKey: [`/api/v1/ai/report-insights/${reportType}`, filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters as Record<string, string>);
      const response = await fetch(`/api/v1/ai/report-insights/${reportType}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      const data = await response.json();
      return data.insights || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-sm text-muted-foreground">Analyzing report data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || insights.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              AI-Powered Insights
            </CardTitle>
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
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Insights
          </CardTitle>
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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight: ReportInsight, index: number) => (
            <div
              key={index}
              className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  {getInsightIcon(insight.type)}
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getPriorityColor(insight.priority)}`}
                >
                  {insight.priority} priority
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm font-medium text-blue-900 mb-1">Recommendation:</p>
                <p className="text-sm text-blue-800">{insight.recommendation}</p>
              </div>
              
              {insight.metric && insight.value && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{insight.metric}:</span>
                  <span>{insight.value}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}