import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart4, 
  Loader2, 
  Database, 
  Lightbulb, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Settings
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Form schema for AI query
const financialQuerySchema = z.object({
  queryType: z.string().min(1, { message: "Please select an analysis type" }),
  customQuery: z.string().min(5, { message: "Please enter a specific question (minimum 5 characters)" }),
  timePeriod: z.string().min(1, { message: "Please select a time period" }),
});

type FinancialQueryFormValues = z.infer<typeof financialQuerySchema>;

export function AIFinancialAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  
  // Check if AI is configured
  const aiConfigQuery = useQuery({
    queryKey: ["/api/v1/setup/ai-configuration"],
    enabled: !!user,
  });
  
  // Form setup
  const form = useForm<FinancialQueryFormValues>({
    resolver: zodResolver(financialQuerySchema),
    defaultValues: {
      queryType: "",
      customQuery: "",
      timePeriod: "last-quarter",
    },
  });
  
  // Financial data query (journals, accounts, etc)
  const journalsQuery = useQuery({
    queryKey: ["/api/v1/finance/journal-entries", { limit: 100 }],
    enabled: !!user,
  });
  
  const accountsQuery = useQuery({
    queryKey: ["/api/v1/finance/chart-of-accounts"],
    enabled: !!user,
  });
  
  // Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (values: FinancialQueryFormValues) => {
      setIsLoading(true);
      
      // Prepare financial data for analysis
      const financialData = {
        journals: journalsQuery.data || [],
        accounts: accountsQuery.data || [],
        timePeriod: values.timePeriod,
      };
      
      const response = await fetch("/api/v1/ai/analyze-finance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          data: financialData,
          query: `${values.queryType}: ${values.customQuery}`
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to analyze financial data");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      toast({
        title: "Analysis Complete",
        description: "Financial analysis has been generated successfully",
      });
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze financial data",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });
  
  // Handle form submission
  const onSubmit = (values: FinancialQueryFormValues) => {
    setAnalysis(null);
    analysisMutation.mutate(values);
  };
  
  // Determine if AI is configured properly
  const isAIConfigured = aiConfigQuery.data?.apiKeyConfigured && aiConfigQuery.data?.selectedModel;
  const dataLoading = journalsQuery.isLoading || accountsQuery.isLoading || aiConfigQuery.isLoading;
  
  // Generate query examples based on available data
  const getQueryExamples = () => {
    return [
      "Analyze revenue trends over the selected time period",
      "Identify largest expense categories and suggest optimization options",
      "Compare profitability across different months",
      "Calculate key financial ratios and explain their significance",
      "Detect unusual transactions or patterns in the data",
    ];
  };
  
  // Handle example selection
  const handleSelectExample = (example: string) => {
    form.setValue("customQuery", example);
    form.trigger("customQuery");
  };
  
  return (
    <div className="space-y-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Financial Analysis</h2>
            <p className="text-muted-foreground">
              Generate insights from your financial data using AI
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="sr-only">Toggle query panel</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart4 className="mr-2 h-5 w-5" />
                Financial Data Analysis Query
              </CardTitle>
              <CardDescription>
                Use AI to analyze your financial data and generate insights
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {!isAIConfigured && !aiConfigQuery.isLoading ? (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>AI Not Configured</AlertTitle>
                    <AlertDescription>
                      Please set up AI integration in the Setup section to use this feature.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href="/setup">
                        <Settings className="mr-2 h-4 w-4" />
                        Configure AI
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="queryType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Analysis Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select analysis type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="trend-analysis">Trend Analysis</SelectItem>
                                  <SelectItem value="financial-health">Financial Health</SelectItem>
                                  <SelectItem value="cost-optimization">Cost Optimization</SelectItem>
                                  <SelectItem value="revenue-analysis">Revenue Analysis</SelectItem>
                                  <SelectItem value="custom-query">Custom Query</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Select the type of financial analysis you need
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="timePeriod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time Period</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select time period" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="last-month">Last Month</SelectItem>
                                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                                  <SelectItem value="last-year">Last Year</SelectItem>
                                  <SelectItem value="ytd">Year to Date</SelectItem>
                                  <SelectItem value="all-time">All Time</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The time period to analyze
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="customQuery"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Question</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="What specific financial question would you like to answer?"
                                className="min-h-24 resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Be specific about what insights you're looking for
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Example Questions:</p>
                        <div className="flex flex-wrap gap-2">
                          {getQueryExamples().map((example, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectExample(example)}
                              className="text-xs"
                            >
                              <Lightbulb className="mr-1 h-3 w-3" />
                              {example}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={dataLoading || isLoading || !isAIConfigured}
                          className="min-w-32"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : dataLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading Data...
                            </>
                          ) : (
                            <>
                              <Database className="mr-2 h-4 w-4" />
                              Generate Analysis
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
      
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="mr-2 h-5 w-5" />
              Financial Insights
            </CardTitle>
            <CardDescription>
              AI-generated analysis based on your financial data
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border">
                {analysis}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="border-t bg-slate-50 p-4 text-sm text-muted-foreground">
            <p>
              This analysis is generated by AI based on your financial data. Always verify important insights with your accounting team before making business decisions.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}