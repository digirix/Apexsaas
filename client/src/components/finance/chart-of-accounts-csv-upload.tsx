import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertCircle, 
  ArrowLeft, 
  FileUp, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

// Define parsing logic for CSV
const parseCSV = (csv: string) => {
  const lines = csv.split('\n');
  
  // Find header row and determine indexes
  const headerRow = lines[0];
  const headers = headerRow.split(',').map(h => h.trim().toLowerCase());
  
  const accountNameIndex = headers.indexOf('account name');
  const elementGroupIndex = headers.indexOf('element group');
  const subElementGroupIndex = headers.indexOf('sub element group');
  const detailedGroupIndex = headers.indexOf('detailed group');
  const descriptionIndex = headers.indexOf('description');
  const openingBalanceIndex = headers.indexOf('opening balance');
  
  // Validate that required headers exist
  if (accountNameIndex === -1 || elementGroupIndex === -1 || 
      subElementGroupIndex === -1 || detailedGroupIndex === -1) {
    throw new Error('CSV must include columns for: "Account Name", "Element Group", "Sub Element Group", and "Detailed Group"');
  }
  
  // Parse data rows
  const accounts = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Skip empty lines
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(v => v.trim());
    
    // Skip rows that don't have values for required fields
    if (!values[accountNameIndex] || !values[elementGroupIndex] || 
        !values[subElementGroupIndex] || !values[detailedGroupIndex]) {
      continue;
    }
    
    const account = {
      accountName: values[accountNameIndex],
      elementGroupName: values[elementGroupIndex],
      subElementGroupName: values[subElementGroupIndex],
      detailedGroupName: values[detailedGroupIndex],
      description: descriptionIndex !== -1 ? values[descriptionIndex] || null : null,
      openingBalance: openingBalanceIndex !== -1 ? values[openingBalanceIndex] || "0.00" : "0.00"
    };
    
    accounts.push(account);
  }
  
  return accounts;
};

export default function ChartOfAccountsCSVUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for file handling
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<'select' | 'preview' | 'uploading' | 'results'>('select');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Check if file is CSV
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a valid CSV file');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    
    // Read the file content
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const accounts = parseCSV(content);
        
        if (accounts.length === 0) {
          setError('No valid account records found in CSV');
          return;
        }
        
        setCsvData(accounts);
        setUploadStep('preview');
      } catch (err) {
        setError(err.message || 'Failed to parse CSV file');
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read the file');
    };
    
    reader.readAsText(selectedFile);
  };
  
  // Reset the file input
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
    setCsvData([]);
    setError(null);
    setUploadStep('select');
    setUploadResults(null);
  };
  
  // CSV upload mutation
  const uploadCSVMutation = useMutation({
    mutationFn: async (data: { accounts: any[] }) => {
      return apiRequest('POST', '/api/v1/finance/chart-of-accounts/csv-upload', data);
    },
    onMutate: () => {
      setUploadStep('uploading');
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Upload Completed",
        description: `Successfully imported ${data.successful} accounts${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
      });
      setUploadStep('results');
      setUploadResults(data);
      
      // Refresh ALL Chart of Accounts data including structure
      queryClient.invalidateQueries({
        queryKey: ['/api/v1/finance/chart-of-accounts']
      });
      
      // If all accounts imported successfully and no errors, auto-close after a delay
      if (data.successful > 0 && data.failed === 0) {
        setTimeout(() => {
          setIsDialogOpen(false);
          resetFileInput();
        }, 2000);
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to upload CSV');
      setUploadStep('preview');
      toast({
        title: "CSV Upload Failed",
        description: error.message || "An error occurred during the upload",
        variant: "destructive",
      });
    },
  });
  
  // Handle upload button click
  const handleUpload = () => {
    if (csvData.length === 0) {
      setError('No data to upload');
      return;
    }
    
    uploadCSVMutation.mutate({ accounts: csvData });
  };
  
  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" />
            Import from CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Import Chart of Accounts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your Chart of Accounts data. The file should include columns for Account Name, Element Group, Sub Element Group, and Detailed Group.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {uploadStep === 'select' && (
              <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="csvFile">Select CSV File</Label>
                  <Input 
                    id="csvFile"
                    type="file" 
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-semibold mb-2">CSV Format Requirements:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>File must be in CSV format</li>
                    <li>Required columns: "Account Name", "Element Group", "Sub Element Group", "Detailed Group"</li>
                    <li>Optional columns: "Description", "Opening Balance"</li>
                    <li>Element, Sub Element, and Detailed Group names must match existing groups in your Chart of Accounts</li>
                  </ul>
                </div>
              </div>
            )}
            
            {uploadStep === 'preview' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Preview: {csvData.length} accounts ready to import</h3>
                
                <div className="max-h-[300px] overflow-y-auto border rounded-md">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Account Name</th>
                        <th className="p-2 text-left">Element Group</th>
                        <th className="p-2 text-left">Sub Element Group</th>
                        <th className="p-2 text-left">Detailed Group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 10).map((account, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{account.accountName}</td>
                          <td className="p-2">{account.elementGroupName}</td>
                          <td className="p-2">{account.subElementGroupName}</td>
                          <td className="p-2">{account.detailedGroupName}</td>
                        </tr>
                      ))}
                      {csvData.length > 10 && (
                        <tr>
                          <td colSpan={4} className="p-2 text-center text-sm text-muted-foreground">
                            ...and {csvData.length - 10} more accounts
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {uploadStep === 'uploading' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Uploading accounts...</h3>
                <Progress value={50} className="w-full" />
                <p className="text-center text-sm text-muted-foreground">
                  This may take a few moments. Please don't close this dialog.
                </p>
              </div>
            )}
            
            {uploadStep === 'results' && uploadResults && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {uploadResults.successful > 0 && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  <h3 className="font-semibold">Upload Complete</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-md">
                    <p className="text-lg font-semibold text-green-700">{uploadResults.successful}</p>
                    <p className="text-sm text-green-600">Accounts imported successfully</p>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-lg font-semibold text-red-700">{uploadResults.failed}</p>
                    <p className="text-sm text-red-600">Accounts failed to import</p>
                  </div>
                </div>
                
                {uploadResults.failed > 0 && uploadResults.errors && uploadResults.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Errors:</h4>
                    <div className="max-h-[200px] overflow-y-auto bg-red-50 p-3 rounded-md">
                      <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                        {uploadResults.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            {uploadStep === 'select' && (
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
            )}
            
            {uploadStep === 'preview' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={resetFileInput}
                  disabled={uploadCSVMutation.isPending}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={csvData.length === 0 || uploadCSVMutation.isPending}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload {csvData.length} Accounts
                </Button>
              </>
            )}
            
            {uploadStep === 'uploading' && (
              <Button disabled>
                Uploading...
              </Button>
            )}
            
            {uploadStep === 'results' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={resetFileInput}
                >
                  Upload Another File
                </Button>
                <Button 
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetFileInput();
                  }}
                >
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}