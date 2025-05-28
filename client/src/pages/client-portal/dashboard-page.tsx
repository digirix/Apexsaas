import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TenantSetting } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  FileText, 
  LogOut, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  FileBox, 
  BarChart, 
  Mail, 
  Phone,
  Building,
  Building2,
  CircleDollarSign,
  Briefcase,
  Globe,
  Map,
  MapPin,
  Receipt,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Shield,
  Star,
  Zap,
  ArrowRight,
  Eye,
  Filter,
  Sparkles,
  MessageCircle,
  AlertTriangle,
  XCircle
} from "lucide-react";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Format currency amount safely, handling both string and number inputs
const formatCurrencyAmount = (amount: any): string => {
  if (!amount) return '0.00';
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if it's a valid number
  if (isNaN(numAmount)) return '0.00';
  
  return numAmount.toFixed(2);
};

// Helper function to format date
const formatDate = (date: string | Date) => {
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "Invalid Date";
  }
};

// Entity Detail Section Component
function EntityDetailSection({ entity }: { entity: any }) {
  const { data: entityServices, isLoading: servicesLoading } = useQuery({
    queryKey: [`/api/v1/entities/${entity.id}/services`],
    enabled: !!entity.id
  });

  const { data: entityTasks } = useQuery({
    queryKey: [`/api/client-portal/tasks?entityId=${entity.id}`],
    enabled: !!entity.id
  });

  // Calculate compliance metrics using actual service data (same as admin portal)
  const services = entityServices || [];
  const totalServices = services.length;
  const requiredServices = services.filter((s: any) => s.isRequired).length;
  const subscribedServices = services.filter((s: any) => s.isSubscribed).length;
  const complianceRate = totalServices > 0 ? Math.round((subscribedServices / totalServices) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <Card className="bg-white/80 backdrop-blur-lg border border-white/40 shadow-xl rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">{entity.name}</CardTitle>
                <CardDescription className="text-slate-600">
                  Complete entity overview and service configuration
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="compliance">Compliance Analysis</TabsTrigger>
              <TabsTrigger value="history">Compliance History</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming Deadlines</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Service Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Service Configuration
                  </CardTitle>
                  <CardDescription>
                    Services configured for this entity and their current status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {servicesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  ) : services.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No services configured</p>
                      <p className="text-sm text-gray-400">Configure services to start tracking compliance</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {services.map((service: any) => (
                        <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <h4 className="font-medium text-gray-900">{service.name}</h4>
                                <p className="text-sm text-gray-500">
                                  {service.description || `Rate: ${service.rate || 'N/A'} • Billing: ${service.billingBasis || 'N/A'}`}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={service.isRequired ? "default" : "secondary"} className="text-xs">
                                  {service.isRequired ? "Required" : "Optional"}
                                </Badge>
                                <Badge variant={service.isSubscribed ? "default" : "outline"} className="text-xs">
                                  {service.isSubscribed ? "Subscribed" : "Not Subscribed"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {service.isSubscribed ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Compliance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Compliance Overview
                  </CardTitle>
                  <CardDescription>
                    Quick summary of compliance status across all services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Overall Compliance</span>
                        <span className="text-sm text-gray-600">{complianceRate}%</span>
                      </div>
                      <Progress value={complianceRate} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{requiredServices}</div>
                        <div className="text-xs text-gray-600">Required Services</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{subscribedServices}</div>
                        <div className="text-xs text-gray-600">Subscribed Services</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{subscribedServices}</div>
                        <div className="text-xs text-gray-600">Compliant</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">{entityTasks?.length || 0}</div>
                        <div className="text-xs text-gray-600">Active Tasks</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Detailed Compliance Analysis
                  </CardTitle>
                  <CardDescription>
                    Complete breakdown of compliance status for each service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Subscribed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service: any) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={service.isSubscribed ? 'default' : 'outline'}
                              className="capitalize"
                            >
                              {service.isSubscribed ? 'Active' : 'Not Subscribed'}
                            </Badge>
                          </TableCell>
                          <TableCell>{service.billingBasis || 'N/A'}</TableCell>
                          <TableCell>
                            {service.isRequired ? (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {service.isSubscribed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Compliance History
                  </CardTitle>
                  <CardDescription>
                    Historical compliance data for required services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance History</h3>
                    <p className="text-gray-600">Historical compliance data will appear here as tasks are completed.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Upcoming Compliance Deadlines
                  </CardTitle>
                  <CardDescription>
                    Next 12 months of compliance requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Deadlines</h3>
                    <p className="text-gray-600">All compliance requirements are up to date or no services are subscribed.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ClientPortalDashboardPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  
  // Fetch client profile
  const { 
    data: clientProfile, 
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ["/api/client-portal/profile"],
  });
  
  // Fetch client tasks - filter by entity if selected
  const { 
    data: clientTasks = [], 
    isLoading: isTasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useQuery<any[]>({
    queryKey: ["/api/client-portal/tasks", selectedEntityId],
    queryFn: async () => {
      const url = selectedEntityId 
        ? `/api/client-portal/tasks?entityId=${selectedEntityId}`
        : '/api/client-portal/tasks';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!clientProfile
  });
  
  // Fetch client invoices - filter by entity if selected
  const {
    data: clientInvoices = [],
    isLoading: isInvoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices
  } = useQuery<any[]>({
    queryKey: ["/api/client-portal/invoices", selectedEntityId],
    queryFn: async () => {
      const url = selectedEntityId 
        ? `/api/client-portal/invoices?entityId=${selectedEntityId}`
        : '/api/client-portal/invoices';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
    enabled: !!clientProfile
  });
  
  // Fetch client entities
  const { 
    data: clientEntities = [],
    isLoading: isEntitiesLoading,
    error: entitiesError,
  } = useQuery<any[]>({
    queryKey: ["/api/client-portal/entities"],
    enabled: !!clientProfile
  });

  // Fetch tenant settings for header and footer
  const { data: tenantSettings = [] } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    refetchOnWindowFocus: false
  });

  // Helper function to get setting value
  const getSetting = (key: string) => {
    const setting = tenantSettings.find(s => s.key === key);
    return setting ? setting.value : "";
  };

  // Header and footer configuration
  const headerEnabled = getSetting("header_enabled") !== "false";
  const headerTitle = getSetting("header_title") || "Welcome to Client Portal";
  const headerSubtitle = getSetting("header_subtitle") || "";
  const headerLogoText = getSetting("header_logo_text") || "";
  const headerContactInfo = getSetting("header_contact_info") !== "false";
  const headerBusinessHours = getSetting("header_business_hours") || "";
  
  const footerEnabled = getSetting("footer_enabled") !== "false";
  const footerCompanyInfo = getSetting("footer_company_info") !== "false";
  const footerCopyright = getSetting("footer_copyright") || "";
  const footerSupportEmail = getSetting("footer_support_email") || "";
  const footerSupportPhone = getSetting("footer_support_phone") || "";
  const footerDisclaimerText = getSetting("footer_disclaimer_text") || "";
  const footerAdditionalLinks = getSetting("footer_additional_links") || "";

  // Company information from settings
  const companyName = getSetting("company_name") || "";
  const companyEmail = getSetting("email") || "";
  const companyPhone = getSetting("phone") || "";
  const companyAddress = getSetting("address") || "";
  const companyWebsite = getSetting("website") || "";
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest({
        url: "/api/client-portal/logout",
        method: "POST",
      });
      
      toast({
        title: "Logged out successfully",
        description: "You have been safely logged out of the client portal",
      });
      
      setLocation("/client-portal/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if request fails
      setLocation("/client-portal/login");
    }
  };
  
  // Get entity selection text
  const getEntityFilterText = () => {
    if (!selectedEntityId) return "All entities";
    const entity = (clientEntities as any[]).find((e: any) => e.id === selectedEntityId);
    return entity ? entity.name : "Unknown entity";
  };
  
  // Calculate task completion rate
  const getTaskCompletionRate = () => {
    if (!clientTasks || clientTasks.length === 0) return 0;
    
    const completedTasks = clientTasks.filter(
      (task: any) => task.statusName?.toLowerCase().includes("completed") || task.statusName?.toLowerCase().includes("done")
    ).length;
    
    return Math.round((completedTasks / clientTasks.length) * 100);
  };
  
  // If the user is not authenticated, redirect to login
  useEffect(() => {
    if (profileError) {
      toast({
        title: "Authentication error",
        description: "You need to log in to access the client portal",
        variant: "destructive",
      });
      setLocation("/client-portal/login");
    }
  }, [profileError, setLocation, toast]);
  
  // Loading state
  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-600 font-medium"
          >
            Loading your portal...
          </motion.p>
        </motion.div>
      </div>
    );
  }
  
  // Error state (if not redirected)
  if (profileError && !clientProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-50 to-pink-50">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Alert variant="destructive" className="max-w-md mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              Please log in to access the client portal.
            </AlertDescription>
          </Alert>
          <Button onClick={() => setLocation("/client-portal/login")}>
            Go to Login
          </Button>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-4 -left-4 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="relative bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 z-10"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.div 
              className="flex items-center"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.div
                className="relative mr-4"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl blur-lg opacity-75"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
                  <Building className="h-8 w-8 text-white" />
                </div>
              </motion.div>
              <div>
                {headerLogoText && (
                  <motion.div 
                    className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                  >
                    {headerLogoText}
                  </motion.div>
                )}
                <motion.h1 
                  className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                >
                  {headerTitle || `Welcome, ${clientProfile?.client?.displayName || "Client"}`}
                </motion.h1>
                <motion.p 
                  className="text-sm text-slate-600 flex items-center mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.7 }}
                >
                  <Shield className="h-4 w-4 mr-2 text-green-500" />
                  {headerSubtitle || `Secure Client Portal - ${clientProfile?.client?.email || ""}`}
                </motion.p>
              </div>
            </motion.div>
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {headerContactInfo && (companyEmail || companyPhone || headerBusinessHours) && (
                <div className="hidden lg:flex items-center space-x-6 text-sm text-slate-600 mr-4">
                  {companyEmail && (
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4" />
                      <span>{companyEmail}</span>
                    </div>
                  )}
                  {companyPhone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{companyPhone}</span>
                    </div>
                  )}
                  {headerBusinessHours && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{headerBusinessHours}</span>
                    </div>
                  )}
                </div>
              )}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all duration-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.header>
      
      {/* Main Content */}
      <motion.main 
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <motion.div 
            className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.div
              className="relative"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl"></div>
              <TabsList className="relative bg-white/60 backdrop-blur-lg border border-white/30 shadow-xl rounded-2xl p-1.5">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl px-6 py-2 font-medium"
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="entities" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl px-6 py-2 font-medium"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Entities
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl px-6 py-2 font-medium"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl px-6 py-2 font-medium"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Invoices
                </TabsTrigger>
              </TabsList>
            </motion.div>
            
            {/* Entity Filter - Show on tasks and invoices tabs */}
            <AnimatePresence>
              {(activeTab === "tasks" || activeTab === "invoices") && (
                <motion.div 
                  className="flex items-center space-x-3"
                  initial={{ opacity: 0, x: 20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-lg rounded-full px-4 py-2 border border-white/30 shadow-lg">
                    <Filter className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Filter by Entity:</span>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Select
                      value={selectedEntityId ? selectedEntityId.toString() : "all"}
                      onValueChange={(value) => {
                        try {
                          if (value === "all") {
                            setSelectedEntityId(null);
                          } else if (value && value !== "") {
                            const entityId = parseInt(value, 10);
                            if (!isNaN(entityId) && entityId > 0) {
                              setSelectedEntityId(entityId);
                            }
                          }
                        } catch (error) {
                          console.error("Entity filter error:", error);
                          setSelectedEntityId(null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-48 bg-white/70 backdrop-blur-lg border border-white/30 shadow-lg rounded-xl hover:bg-white/80 transition-all duration-300">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/90 backdrop-blur-xl border border-white/30 shadow-xl rounded-xl">
                        <SelectItem value="all" className="hover:bg-blue-50/80 rounded-lg">
                          All Entities
                        </SelectItem>
                        {clientEntities && Array.isArray(clientEntities) && clientEntities.map((entity: any) => (
                          <SelectItem 
                            key={entity?.id || Math.random()} 
                            value={entity?.id?.toString() || ""}
                            className="hover:bg-blue-50/80 rounded-lg"
                          >
                            {entity?.name || "Unknown Entity"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Entity Overview Section */}
            {clientEntities && (clientEntities as any[]).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-slate-900">Your Business Entities</h2>
                </div>
                
{/* Compact Entity Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {(clientEntities as any[]).map((entity: any, index: number) => (
                    <motion.div
                      key={entity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ y: -2, scale: 1.02 }}
                      className="group"
                    >
                      <Card className="h-24 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-lg overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <div className="p-3 h-full flex items-center justify-between">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
                              <Building2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm text-slate-900 truncate">
                                {entity.name}
                              </h3>
                              <p className="text-xs text-slate-500 truncate">
                                {entity.entityType} • {entity.countryName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {entity.whatsappGroupLink && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                onClick={() => window.open(entity.whatsappGroupLink, '_blank')}
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {entity.fileAccessLink && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                onClick={() => window.open(entity.fileAccessLink, '_blank')}
                              >
                                <FileBox className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Detailed Entity Information */}
                {(clientEntities as any[]).map((entity: any, index: number) => (
                  <EntityDetailSection key={`detail-${entity.id}`} entity={entity} />
                ))}
              </motion.div>
            )}

            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, staggerChildren: 0.1 }}
            >
              {/* Active Tasks Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Active Tasks
                        </CardTitle>
                        <motion.div 
                          className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl"
                          whileHover={{ rotate: 10, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Clock className="h-4 w-4 text-white" />
                        </motion.div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <motion.div 
                        className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      >
                        {clientTasks ? clientTasks.length : "0"}
                      </motion.div>
                      <p className="text-xs text-slate-500 mt-2 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                        {getTaskCompletionRate()}% completed
                      </p>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="mt-3"
                      >
                        <Progress 
                          value={getTaskCompletionRate()} 
                          className="h-2 bg-slate-200/50"
                        />
                      </motion.div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Open Invoices Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Open Invoices
                        </CardTitle>
                        <motion.div 
                          className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl"
                          whileHover={{ rotate: -10, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Receipt className="h-4 w-4 text-white" />
                        </motion.div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <motion.div 
                        className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                      >
                        {clientInvoices ? clientInvoices.filter((inv: any) => inv.status !== 'Paid').length : "0"}
                      </motion.div>
                      <p className="text-xs text-slate-500 mt-2">
                        {clientInvoices && clientInvoices.length > 0
                          ? `Total: ${clientInvoices.length} invoices`
                          : "No invoices available"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Business Entities Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-emerald-400/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Business Entities
                        </CardTitle>
                        <motion.div 
                          className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl"
                          whileHover={{ rotate: 5, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Building2 className="h-4 w-4 text-white" />
                        </motion.div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <motion.div 
                        className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                      >
                        {clientEntities ? (clientEntities as any[]).length : "0"}
                      </motion.div>
                      <p className="text-xs text-slate-500 mt-2">
                        Registered entities
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>


            </motion.div>
            
            {/* Recent Activity Section */}
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                      <CardTitle>Recent Activity</CardTitle>
                    </div>
                    <CardDescription>
                      Latest updates on your tasks and invoices
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {clientTasks && clientTasks.slice(0, 3).map((task: any, index: number) => (
                        <motion.div 
                          key={task.id} 
                          className="flex items-start space-x-3 p-3 rounded-xl bg-white/50 hover:bg-white/70 transition-all duration-300"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                          whileHover={{ x: 5 }}
                        >
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {task.title || task.taskDetails || 'Task'}
                            </p>
                            <p className="text-xs text-slate-500">
                              Due: {formatDate(task.dueDate)} • {task.statusName || 'In Progress'}
                            </p>
                          </div>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setActiveTab("tasks")}
                              className="text-xs h-6 px-2"
                            >
                              View
                            </Button>
                          </motion.div>
                        </motion.div>
                      ))}
                      
                      {(!clientTasks || clientTasks.length === 0) && (
                        <motion.div 
                          className="text-center py-6 text-slate-500"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1 }}
                        >
                          <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No recent activity
                        </motion.div>
                      )}
                      
                      {clientTasks && clientTasks.length > 3 && (
                        <motion.div 
                          className="text-center pt-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.3 }}
                        >
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveTab("tasks")}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View all tasks
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
          
          {/* Entities Tab */}
          <TabsContent value="entities" className="space-y-6">
            <motion.div 
              className="grid grid-cols-1 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <CardTitle>Your Business Entities</CardTitle>
                    </div>
                    <CardDescription>
                      View and manage your registered businesses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEntitiesLoading ? (
                      <div className="flex justify-center py-8">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                        />
                      </div>
                    ) : entitiesError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load entities. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : (clientEntities as any[]).length === 0 ? (
                      <motion.div 
                        className="text-center py-8 text-slate-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        No entities found
                      </motion.div>
                    ) : (
                      <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.1 }}
                      >
                        {(clientEntities as any[]).map((entity: any, index: number) => (
                          <motion.div
                            key={entity.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="group"
                          >
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                              <Card className="relative bg-white/80 backdrop-blur-lg border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                <div className="p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <motion.div 
                                        className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"
                                        whileHover={{ rotate: 10, scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400 }}
                                      >
                                        <Building2 className="h-4 w-4 text-white" />
                                      </motion.div>
                                      <div>
                                        <h3 className="font-semibold text-slate-900 text-sm">
                                          {entity.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                          {entity.entityType} • {entity.countryName}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-7 text-xs px-2 py-1 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-colors"
                                          onClick={() => {
                                            setLocation(`/client-portal/entities/${entity.id}`);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Details
                                        </Button>
                                      </motion.div>
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-7 text-xs px-2 py-1 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                                          onClick={() => {
                                            setSelectedEntityId(entity.id);
                                            setActiveTab("tasks");
                                          }}
                                        >
                                          <Clock className="h-3 w-3 mr-1" />
                                          Tasks
                                        </Button>
                                      </motion.div>
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-7 text-xs px-2 py-1 hover:bg-purple-50 text-slate-600 hover:text-purple-600 transition-colors"
                                          onClick={() => {
                                            setSelectedEntityId(entity.id);
                                            setActiveTab("invoices");
                                          }}
                                        >
                                          <Receipt className="h-3 w-3 mr-1" />
                                          Invoices
                                        </Button>
                                      </motion.div>
                                      {entity.whatsappGroupLink && (
                                        <motion.div
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="h-7 text-xs px-2 py-1 hover:bg-green-50 text-slate-600 hover:text-green-600 transition-colors"
                                            onClick={() => {
                                              window.open(entity.whatsappGroupLink, '_blank');
                                            }}
                                          >
                                            <MessageCircle className="h-3 w-3 mr-1" />
                                            WhatsApp
                                          </Button>
                                        </motion.div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="px-4 pb-4">
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="flex flex-col">
                                      <span className="text-slate-500">Tax ID</span>
                                      <span className="font-medium truncate">
                                        {entity.businessTaxId || "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-slate-500">VAT Status</span>
                                      <span className="font-medium">
                                        {entity.isVatRegistered ? "Registered" : "Not Reg."}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-slate-500">VAT ID</span>
                                      <span className="font-medium truncate">
                                        {entity.vatId || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {entity.stats && (
                                    <div className="mt-3 pt-2 border-t border-slate-100">
                                      <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 flex items-center">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Tasks: {entity.stats.taskCount || 0}
                                        </span>
                                        <span className="text-slate-500 flex items-center">
                                          <Receipt className="h-3 w-3 mr-1" />
                                          Invoices: {entity.stats.invoiceCount || 0}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <CardTitle>Your Tasks</CardTitle>
                      </div>
                      <CardDescription>
                        Track your compliance and service tasks{selectedEntityId ? ` for ${getEntityFilterText()}` : ""}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedEntityId && (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedEntityId(null);
                              refetchTasks();
                            }}
                            className="border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                          >
                            Show All Tasks
                          </Button>
                        </motion.div>
                      )}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => refetchTasks()}
                          className="border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        >
                          Refresh
                        </Button>
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isTasksLoading ? (
                      <div className="flex justify-center py-8">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                        />
                      </div>
                    ) : tasksError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load tasks. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : clientTasks.length === 0 ? (
                      <motion.div 
                        className="text-center py-8 text-slate-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        {selectedEntityId ? "No tasks found for this entity" : "No tasks available"}
                      </motion.div>
                    ) : (
                      <motion.div 
                        className="space-y-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.1 }}
                      >
                        <div className="grid grid-cols-1 gap-4">
                          {clientTasks.map((task: any, index: number) => (
                            <motion.div 
                              key={task.id} 
                              className="relative group"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              whileHover={{ y: -2 }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                              <div className="relative border rounded-xl p-4 bg-white/80 backdrop-blur-lg border-white/40 hover:shadow-lg transition-all duration-300">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-xl"></div>
                                <div className="flex items-start justify-between pt-2">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <motion.div
                                        whileHover={{ rotate: 10, scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400 }}
                                      >
                                        <Clock className="h-4 w-4 text-blue-500" />
                                      </motion.div>
                                      <h3 className="font-medium text-slate-900">
                                        {task.title || task.taskDetails || 'Task'}
                                      </h3>
                                      {task.statusName && (
                                        <Badge variant="outline" className="bg-white/50">
                                          {task.statusName}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-600 ml-7">
                                      <div className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Due: {formatDate(task.dueDate)}
                                      </div>
                                      {task.entityId && (
                                        <div className="flex items-center">
                                          <Building2 className="h-3 w-3 mr-1" />
                                          Entity: {(clientEntities as any[]).find((e: any) => e.id === task.entityId)?.name || 'Unknown'}
                                        </div>
                                      )}
                                      <div className="flex items-center">
                                        <Briefcase className="h-3 w-3 mr-1" />
                                        Type: {task.taskType || 'Regular'}
                                      </div>
                                      {task.assigneeName && (
                                        <div className="flex items-center">
                                          <User className="h-3 w-3 mr-1" />
                                          Assigned: {task.assigneeName}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="ml-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                                      onClick={() => {
                                        setSelectedTaskId(task.id);
                                        setShowTaskDetails(true);
                                      }}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Details
                                    </Button>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
          
          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Receipt className="h-5 w-5 text-purple-500" />
                        <CardTitle>Your Invoices</CardTitle>
                      </div>
                      <CardDescription>
                        View and manage your billing{selectedEntityId ? ` for ${getEntityFilterText()}` : ""}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedEntityId && (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedEntityId(null);
                              refetchInvoices();
                            }}
                            className="border-purple-200 hover:border-purple-300 hover:bg-purple-50"
                          >
                            Show All Invoices
                          </Button>
                        </motion.div>
                      )}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => refetchInvoices()}
                          className="border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        >
                          Refresh
                        </Button>
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isInvoicesLoading ? (
                      <div className="flex justify-center py-8">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
                        />
                      </div>
                    ) : invoicesError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load invoices. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : clientInvoices.length === 0 ? (
                      <motion.div 
                        className="text-center py-8 text-slate-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        {selectedEntityId ? "No invoices found for this entity" : "No invoices available"}
                      </motion.div>
                    ) : (
                      <motion.div 
                        className="space-y-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.1 }}
                      >
                        <div className="grid grid-cols-1 gap-4">
                          {clientInvoices.map((invoice: any, index: number) => (
                            <motion.div 
                              key={invoice.id} 
                              className="relative group"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              whileHover={{ y: -2 }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                              <div className="relative border rounded-xl p-4 bg-white/80 backdrop-blur-lg border-white/40 hover:shadow-lg transition-all duration-300">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl"></div>
                                <div className="flex items-start justify-between pt-2">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <motion.div
                                        whileHover={{ rotate: -10, scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400 }}
                                      >
                                        <Receipt className="h-4 w-4 text-purple-500" />
                                      </motion.div>
                                      <h3 className="font-medium text-slate-900">
                                        Invoice #{invoice.invoiceNumber || invoice.id}
                                      </h3>
                                      <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'} className="bg-white/50">
                                        {invoice.status || 'Draft'}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600 ml-7">
                                      <div className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Date: {formatDate(invoice.invoiceDate)}
                                      </div>
                                      <div className="flex items-center">
                                        <CircleDollarSign className="h-3 w-3 mr-1" />
                                        Amount: ${formatCurrencyAmount(invoice.totalAmount)}
                                      </div>
                                      {invoice.entityId && (
                                        <div className="flex items-center">
                                          <Building2 className="h-3 w-3 mr-1" />
                                          Entity: {(clientEntities as any[]).find((e: any) => e.id === invoice.entityId)?.name || 'Unknown'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="ml-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50"
                                      onClick={() => {
                                        setSelectedInvoiceId(invoice.id);
                                        setShowInvoiceDetails(true);
                                      }}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Details
                                    </Button>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
          
        </Tabs>
        
        {/* Task Details Modal */}
        <AnimatePresence>
          {showTaskDetails && (
            <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
              <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border border-white/30">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader>
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <DialogTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Task Details
                      </DialogTitle>
                    </div>
                    <DialogDescription>
                      Complete information about your task
                    </DialogDescription>
                  </DialogHeader>
                  {selectedTaskId && (
                    <div className="space-y-4 mt-4">
                      {(() => {
                        const task = clientTasks.find((t: any) => t.id === selectedTaskId);
                        if (!task) return <p>Task not found</p>;
                        
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Task Title</h4>
                                <p className="text-slate-600">{task.title || task.taskDetails || 'No title available'}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Status</h4>
                                <Badge variant="outline">{task.statusName || 'Unknown'}</Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-green-50/50 border border-green-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Due Date</h4>
                                <p className="text-slate-600">{formatDate(task.dueDate)}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Task Type</h4>
                                <p className="text-slate-600">{task.taskType || 'Regular Task'}</p>
                              </div>
                            </div>
                            
                            {task.entityId && (
                              <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Related Entity</h4>
                                <p className="text-slate-600">
                                  {(clientEntities as any[]).find((e: any) => e.id === task.entityId)?.name || 'Unknown Entity'}
                                </p>
                              </div>
                            )}
                            
                            {task.description && (
                              <div className="p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Description</h4>
                                <p className="text-slate-600">{task.description}</p>
                              </div>
                            )}
                            
                            <div className="pt-4 border-t border-slate-200">
                              <div className="flex items-start space-x-3 p-3 rounded-lg bg-gradient-to-br from-blue-50/50 to-purple-50/50 border border-blue-100">
                                <Star className="h-5 w-5 text-blue-500 mt-0.5" />
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-1">Next Steps</h4>
                                  <p className="text-slate-600">
                                    Please contact your account manager if you need assistance with this task or have any questions.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
        
        {/* Invoice Details Modal */}
        <AnimatePresence>
          {showInvoiceDetails && (
            <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
              <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border border-white/30">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader>
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                        <Receipt className="h-4 w-4 text-white" />
                      </div>
                      <DialogTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Invoice Details
                      </DialogTitle>
                    </div>
                    <DialogDescription>
                      Complete information about your invoice
                    </DialogDescription>
                  </DialogHeader>
                  {selectedInvoiceId && (
                    <div className="space-y-4 mt-4">
                      {(() => {
                        const invoice = clientInvoices.find((i: any) => i.id === selectedInvoiceId);
                        if (!invoice) return <p>Invoice not found</p>;
                        
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Invoice Number</h4>
                                <p className="text-slate-600">{invoice.invoiceNumber || `INV-${invoice.id}`}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Status</h4>
                                <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'}>
                                  {invoice.status || 'Draft'}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-green-50/50 border border-green-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Issue Date</h4>
                                <p className="text-slate-600">{formatDate(invoice.issueDate || invoice.invoiceDate)}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Due Date</h4>
                                <p className="text-slate-600">{formatDate(invoice.dueDate)}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Total Amount</h4>
                                <p className="text-lg font-semibold text-emerald-700">
                                  ${formatCurrencyAmount(invoice.totalAmount)} {invoice.currencyCode || 'USD'}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-red-50/50 border border-red-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Amount Due</h4>
                                <p className="text-lg font-semibold text-red-600">
                                  ${formatCurrencyAmount(invoice.amountDue || invoice.totalAmount)} {invoice.currencyCode || 'USD'}
                                </p>
                              </div>
                            </div>
                            
                            {invoice.entityId && (
                              <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Related Entity</h4>
                                <p className="text-slate-600">
                                  {(clientEntities as any[]).find((e: any) => e.id === invoice.entityId)?.name || 'Unknown Entity'}
                                </p>
                              </div>
                            )}
                            
                            {invoice.notes && (
                              <div className="p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                                <h4 className="font-semibold text-slate-900 mb-1">Notes</h4>
                                <p className="text-slate-600">{invoice.notes}</p>
                              </div>
                            )}
                            
                            <div className="pt-4 border-t border-slate-200">
                              <div className="flex items-start space-x-3 p-3 rounded-lg bg-gradient-to-br from-purple-50/50 to-pink-50/50 border border-purple-100">
                                <CircleDollarSign className="h-5 w-5 text-purple-500 mt-0.5" />
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-1">Payment Information</h4>
                                  <p className="text-slate-600">
                                    For payment inquiries or to request payment instructions, please contact your account manager.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </motion.main>
      
      {/* Footer */}
      {footerEnabled && (
        <motion.footer 
          className="relative bg-white/80 backdrop-blur-xl border-t border-white/20 mt-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <motion.div 
                className="text-sm text-slate-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                {footerCopyright || "© 2025 Client Portal. All rights reserved."}
              </motion.div>
              <motion.div 
                className="flex items-center space-x-4 mt-4 md:mt-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                {footerSupportEmail && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hover:bg-blue-50"
                      onClick={() => window.location.href = `mailto:${footerSupportEmail}`}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {footerSupportEmail}
                    </Button>
                  </motion.div>
                )}
                {footerSupportPhone && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hover:bg-blue-50"
                      onClick={() => window.location.href = `tel:${footerSupportPhone}`}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {footerSupportPhone}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </div>
            
            {/* Footer disclaimer and additional links */}
            {(footerDisclaimerText || footerAdditionalLinks) && (
              <div className="mt-4 pt-4 border-t border-slate-200/50">
                {footerDisclaimerText && (
                  <motion.p 
                    className="text-xs text-slate-400 text-center mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 }}
                  >
                    {footerDisclaimerText}
                  </motion.p>
                )}
                {footerAdditionalLinks && (
                  <motion.div 
                    className="text-xs text-slate-500 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                  >
                    {footerAdditionalLinks}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.footer>
      )}
    </div>
  );
}