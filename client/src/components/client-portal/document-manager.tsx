import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  Building,
  Eye,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClientDocument {
  id: number;
  fileName: string;
  originalFileName: string;
  description: string;
  documentType: string;
  documentYear: number;
  fileSize: number;
  createdAt: string;
  canDownload: boolean;
}

interface DocumentManagerProps {
  entityId?: number;
}

export function DocumentManager({ entityId }: DocumentManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<ClientDocument[]>({
    queryKey: ['/api/client-portal/documents', entityId],
    queryFn: () => {
      const url = entityId 
        ? `/api/client-portal/documents?entityId=${entityId}`
        : '/api/client-portal/documents';
      return fetch(url).then(res => res.json());
    }
  });

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.originalFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === "all" || doc.documentYear?.toString() === selectedYear;
    const matchesType = selectedType === "all" || doc.documentType === selectedType;
    
    return matchesSearch && matchesYear && matchesType;
  });

  // Get unique years and types for filters
  const availableYears = [...new Set(documents.map(doc => doc.documentYear).filter(Boolean))].sort((a, b) => b - a);
  const availableTypes = [...new Set(documents.map(doc => doc.documentType).filter(Boolean))];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'Tax Return': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Financial Statement': return 'bg-green-100 text-green-800 border-green-200';
      case 'Supporting Document': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Compliance Report': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownload = async (document: ClientDocument) => {
    if (!document.canDownload) {
      alert('This is a sample document and cannot be downloaded.');
      return;
    }

    try {
      const response = await fetch(`/api/client-portal/documents/${document.id}/download`);
      if (response.ok) {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.originalFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-slate-600">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Document Library</h2>
          <p className="text-slate-600">Access your tax returns, financial statements, and supporting documents</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {filteredDocuments.length} documents
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {availableTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setSelectedYear("all");
                setSelectedType("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Documents Found</h3>
            <p className="text-slate-500">
              {searchTerm || selectedYear !== "all" || selectedType !== "all" 
                ? "Try adjusting your search criteria or filters."
                : "Your documents will appear here once they are uploaded by your accounting firm."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document, index) => (
            <motion.div
              key={document.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 mb-2">
                        {document.originalFileName}
                      </CardTitle>
                      <Badge className={`text-xs ${getDocumentTypeColor(document.documentType)}`}>
                        {document.documentType}
                      </Badge>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500 flex-shrink-0 ml-2" />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {document.description && (
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {document.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-xs text-slate-500">
                    {document.documentYear && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Year: {document.documentYear}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Building className="h-3 w-3" />
                      <span>Size: {formatFileSize(document.fileSize)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Uploaded: {new Date(document.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(document)}
                      disabled={!document.canDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {document.canDownload ? "Download" : "Sample"}
                    </Button>
                    
                    {!document.canDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-3"
                        title="This is a sample document for demonstration"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {!document.canDownload && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-yellow-700">Sample document for demonstration</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}