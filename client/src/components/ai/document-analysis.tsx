import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, ArrowDown, Upload, Download, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocumentAnalysisProps {
  className?: string;
}

type DocumentType = "invoice" | "tax_form" | "financial_statement" | "other";

export function DocumentAnalysis({ className = "" }: DocumentAnalysisProps) {
  const { toast } = useToast();
  const [documentType, setDocumentType] = useState<DocumentType>("invoice");
  const [documentText, setDocumentText] = useState("");
  const [extractedInfo, setExtractedInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract document info mutation
  const extractDocumentMutation = useMutation({
    mutationFn: (data: { documentType: string; documentContent: string }) => 
      apiRequest("/api/v1/ai/extract-document", data, "POST"),
    onSuccess: (data) => {
      if (data.success && data.extractedInfo) {
        setExtractedInfo(data.extractedInfo);
        
        toast({
          title: "Document analyzed successfully",
          description: `Extracted information from ${documentType} document.`,
        });
      } else {
        toast({
          title: "Failed to analyze document",
          description: data.error || "There was an error analyzing the document.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to analyze document",
        description: error.message || "There was an error analyzing the document.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setDocumentText(text);
    };
    reader.readAsText(file);
  };

  const handleExtractInfo = () => {
    if (!documentText.trim()) {
      toast({
        title: "Missing document content",
        description: "Please enter or upload document text to analyze.",
        variant: "destructive",
      });
      return;
    }

    extractDocumentMutation.mutate({
      documentType,
      documentContent: documentText,
    });
  };

  const handleCopyToClipboard = () => {
    if (extractedInfo) {
      navigator.clipboard.writeText(JSON.stringify(extractedInfo, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Copied to clipboard",
        description: "The extracted information has been copied to your clipboard.",
      });
    }
  };

  const handleDownloadJSON = () => {
    if (extractedInfo) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(extractedInfo, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `extracted_${documentType}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <FileText className="h-5 w-5 mr-2 text-indigo-500" />
          AI Document Analysis
        </CardTitle>
        <CardDescription>
          Extract key information from financial and accounting documents using AI.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select 
              value={documentType} 
              onValueChange={(value) => setDocumentType(value as DocumentType)}
            >
              <SelectTrigger id="document-type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="tax_form">Tax Form</SelectItem>
                <SelectItem value="financial_statement">Financial Statement</SelectItem>
                <SelectItem value="other">Other Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="document-text">Document Content</Label>
            <div className="flex flex-col space-y-2">
              <Textarea
                id="document-text"
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste document text here or upload a file..."
                className="min-h-[200px]"
              />
              <div className="flex justify-end space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv,.md,.json"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExtractInfo}
                  disabled={!documentText.trim() || extractDocumentMutation.isPending}
                >
                  {extractDocumentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Extract Information
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {extractDocumentMutation.isPending && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-2" />
              <p className="text-slate-600">Analyzing document content...</p>
            </div>
          )}
          
          {extractedInfo && !extractDocumentMutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Extracted Information</Label>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    className="h-8"
                  >
                    {copied ? (
                      "Copied!"
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadJSON}
                    className="h-8"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              <Card className="border-slate-200">
                <ScrollArea className="h-[300px] w-full p-4">
                  <pre className="text-sm text-slate-800 whitespace-pre-wrap">
                    {JSON.stringify(extractedInfo, null, 2)}
                  </pre>
                </ScrollArea>
              </Card>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="text-sm text-slate-500">
        <p>
          Supported file formats: Plain text (.txt), CSV (.csv), Markdown (.md), JSON (.json)
        </p>
      </CardFooter>
    </Card>
  );
}