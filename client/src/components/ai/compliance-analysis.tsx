import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ComplianceAnalysisProps {
  entityId: number;
  entityName: string;
  className?: string;
}

export function ComplianceAnalysis({ 
  entityId, 
  entityName,
  className = ""
}: ComplianceAnalysisProps) {
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [activeTab, setActiveTab] = useState("full");

  // Generate compliance analysis mutation
  const analyzeComplianceMutation = useMutation({
    mutationFn: (data: { entityId: number }) => 
      apiRequest("/api/v1/ai/analyze-compliance", data, "POST"),
    onSuccess: (data) => {
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        
        toast({
          title: "Compliance analysis complete",
          description: `Generated compliance analysis for ${entityName}.`,
        });
      } else {
        toast({
          title: "Failed to generate analysis",
          description: data.error || "There was an error generating the compliance analysis.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate analysis",
        description: error.message || "There was an error generating the compliance analysis.",
        variant: "destructive",
      });
    },
  });

  const handleRunAnalysis = () => {
    analyzeComplianceMutation.mutate({ entityId });
  };

  // Helper function to apply formatting to the analysis result
  const formatAnalysisResult = (text: string) => {
    // Format headers (# Header)
    text = text.replace(/^#\s+(.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>');
    // Format subheaders (## Subheader)
    text = text.replace(/^##\s+(.+)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-1">$1</h3>');
    // Format lists
    text = text.replace(/^-\s+(.+)$/gm, '<li class="ml-4">$1</li>');
    text = text.replace(/(<li.+<\/li>\n)+/g, '<ul class="list-disc my-2">$&</ul>');
    // Format numbered lists
    text = text.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-6">$1</li>');
    text = text.replace(/(<li.+<\/li>\n)+/g, '<ol class="list-decimal my-2">$&</ol>');
    // Bold text
    text = text.replace(/\*\*(.+?)\*\*/g, '<span class="font-bold">$1</span>');
    // Compliance status badges
    text = text.replace(/Compliant/g, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Compliant</span>');
    text = text.replace(/At Risk/g, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">At Risk</span>');
    text = text.replace(/Non-Compliant/g, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Non-Compliant</span>');
    // Format paragraphs
    text = text.replace(/^([^<\n].+)$/gm, '<p class="my-2">$1</p>');
    // Handle line breaks
    text = text.replace(/\n\n/g, '<div class="my-4"></div>');
    
    return text;
  };

  // Split the analysis into sections for the tabs
  const getAnalysisSection = (sectionName: string) => {
    if (!analysisResult) return '';
    
    const fullAnalysis = analysisResult;
    
    switch (sectionName) {
      case "summary":
        // Extract the summary section - typically the first section before any headers
        const summaryMatch = fullAnalysis.match(/^(.*?)(?=#|$)/s);
        return summaryMatch ? summaryMatch[0] : '';
      
      case "issues":
        // Extract sections mentioning issues, non-compliant items
        const issuesSections = [];
        if (fullAnalysis.includes("Missing") || fullAnalysis.includes("Overdue")) {
          const issuesMatch = fullAnalysis.match(/#+\s*(Missing|Overdue|Non-Compliant|Compliance Issues|Risk)[^\n]*\n(.*?)(?=#+|$)/gs);
          if (issuesMatch) {
            issuesSections.push(...issuesMatch);
          }
        }
        return issuesSections.join('\n\n');
      
      case "deadlines":
        // Extract sections about upcoming deadlines
        const deadlinesMatch = fullAnalysis.match(/#+\s*(Upcoming|Deadlines|Calendar|Next 30|Next 60|Next 90)[^\n]*\n(.*?)(?=#+|$)/gs);
        return deadlinesMatch ? deadlinesMatch.join('\n\n') : '';
      
      case "recommendations":
        // Extract recommendations section
        const recommendationsMatch = fullAnalysis.match(/#+\s*(Recommendations|Strategic|Improvements|Action Items)[^\n]*\n(.*?)(?=#+|$)/gs);
        return recommendationsMatch ? recommendationsMatch.join('\n\n') : '';
        
      case "full":
      default:
        return fullAnalysis;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 mr-2 text-emerald-500" />
          AI Compliance Analysis
        </CardTitle>
        <CardDescription>
          Generate a comprehensive compliance analysis for {entityName} across all jurisdictions.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!analysisResult && !analyzeComplianceMutation.isPending && (
          <div className="py-8 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 mb-6">
              No compliance analysis generated yet. Click the button below to generate an AI-powered analysis of {entityName}'s compliance status.
            </p>
            <Button 
              onClick={handleRunAnalysis}
              disabled={analyzeComplianceMutation.isPending}
            >
              {analyzeComplianceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Compliance...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Run Compliance Analysis
                </>
              )}
            </Button>
          </div>
        )}

        {analyzeComplianceMutation.isPending && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-slate-600">
              Analyzing compliance status across jurisdictions and services...
            </p>
            <p className="text-slate-500 text-sm mt-2">
              This may take a minute as we process all relevant information.
            </p>
          </div>
        )}

        {analysisResult && !analyzeComplianceMutation.isPending && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="full">Full Analysis</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>
            
            {["full", "summary", "issues", "deadlines", "recommendations"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <div className="max-h-[500px] overflow-y-auto border rounded-md p-4 bg-white">
                  {getAnalysisSection(tab) ? (
                    <div 
                      className="compliance-analysis prose prose-sm max-w-none" 
                      dangerouslySetInnerHTML={{ 
                        __html: formatAnalysisResult(getAnalysisSection(tab)) 
                      }} 
                    />
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No information</AlertTitle>
                      <AlertDescription>
                        No {tab} information found in the analysis.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
      
      {analysisResult && !analyzeComplianceMutation.isPending && (
        <CardFooter className="flex justify-between">
          <div className="text-sm text-slate-500 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
          <Button 
            variant="outline"
            onClick={handleRunAnalysis}
            disabled={analyzeComplianceMutation.isPending}
          >
            {analyzeComplianceMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : "Refresh Analysis"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}