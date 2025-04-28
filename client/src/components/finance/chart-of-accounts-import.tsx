import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileUp, Download, AlertTriangle, Check } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import coaTemplatePath from '@/assets/coa_import_template.csv';
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from '@/components/ui/progress';

export function ChartOfAccountsImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'uploading' | 'success' | 'error'>('idle');
  const [importResults, setImportResults] = useState<any>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
      setUploadStatus('idle');
      setImportResults(null);
    }
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
    setUploadStatus('idle');
    setImportResults(null);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = coaTemplatePath;
    link.download = 'chart_of_accounts_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(',');
      const entry: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        entry[headers[j]] = values[j]?.trim() || '';
      }
      
      results.push(entry);
    }
    
    return results;
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadStatus('validating');
      
      // Read the file and parse CSV
      const fileContent = await file.text();
      const accounts = parseCSV(fileContent);
      
      if (accounts.length === 0) {
        toast({
          title: "Empty CSV",
          description: "The CSV file contains no accounts to import",
          variant: "destructive"
        });
        setIsUploading(false);
        setUploadStatus('error');
        return;
      }
      
      setUploadStatus('uploading');
      
      // Send to server
      const response = await apiRequest('/api/v1/finance/chart-of-accounts/import', {
        method: 'POST',
        body: { accounts },
      });
      
      // Update state with results
      setImportResults(response);
      setUploadStatus('success');
      
      // Show success message
      toast({
        title: "Import Complete",
        description: `Successfully imported ${response.results.success} out of ${response.results.total} accounts`,
        variant: response.results.failures > 0 ? "default" : "success"
      });
      
      // Show detailed results if there were failures
      if (response.results.failures > 0) {
        setShowResultsDialog(true);
      }
      
      // Refresh accounts list
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      
      // Reset file input for next import
      resetFileInput();
    } catch (error) {
      console.error('Import error:', error);
      setUploadStatus('error');
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getUploadStatusProgress = () => {
    switch (uploadStatus) {
      case 'idle': return 0;
      case 'validating': return 30;
      case 'uploading': return 70;
      case 'success': return 100;
      case 'error': return 100;
      default: return 0;
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Import Chart of Accounts</CardTitle>
          <CardDescription>
            Quickly import multiple accounts from a CSV file. 
            <Button variant="link" className="p-0 h-auto" onClick={handleDownloadTemplate}>
              Download the template <Download className="ml-1 h-4 w-4" />
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label htmlFor="coa-csv" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Select CSV File
              </label>
              <input
                ref={fileInputRef}
                id="coa-csv"
                type="file"
                accept=".csv"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {file && (
                <p className="text-xs text-muted-foreground">Selected: {file.name}</p>
              )}
            </div>
            
            {uploadStatus !== 'idle' && (
              <div className="space-y-2">
                <Progress value={getUploadStatusProgress()} className={uploadStatus === 'error' ? 'bg-red-200' : ''} />
                <p className="text-xs text-muted-foreground">
                  {uploadStatus === 'validating' && 'Validating file...'}
                  {uploadStatus === 'uploading' && 'Uploading and processing accounts...'}
                  {uploadStatus === 'success' && 'Import successful!'}
                  {uploadStatus === 'error' && 'Import failed. Please check the file and try again.'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetFileInput} disabled={!file || isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || isUploading}
            className={isUploading ? 'opacity-80' : ''}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Import Accounts
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Results Dialog */}
      <AlertDialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Import Results</AlertDialogTitle>
            <AlertDialogDescription>
              {importResults && (
                <div className="space-y-2">
                  <div className="flex space-x-4">
                    <div className="flex items-center text-green-600">
                      <Check className="h-5 w-5 mr-1" />
                      <span className="font-semibold">{importResults.results.success} Successful</span>
                    </div>
                    {importResults.results.failures > 0 && (
                      <div className="flex items-center text-amber-600">
                        <AlertTriangle className="h-5 w-5 mr-1" />
                        <span className="font-semibold">{importResults.results.failures} Failed</span>
                      </div>
                    )}
                  </div>
                  
                  {importResults.results.failures > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold">Errors</h4>
                      <div className="max-h-64 overflow-y-auto mt-2 border rounded-md">
                        <table className="min-w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold">Row</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold">Account</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold">Error</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {importResults.results.errors.map((error: any, index: number) => (
                              <tr key={index} className="bg-card">
                                <td className="px-4 py-2 text-sm">{error.row}</td>
                                <td className="px-4 py-2 text-sm">{error.accountName}</td>
                                <td className="px-4 py-2 text-sm text-red-600">{error.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}