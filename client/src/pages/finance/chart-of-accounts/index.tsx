import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  ArrowUpDown, 
  FileText,
  Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChartOfAccountsImport } from '@/components/finance/chart-of-accounts-import';

export default function ChartOfAccountsPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Queries for the different levels of the Chart of Accounts
  const { data: mainGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
    refetchOnWindowFocus: false,
  });

  const { data: elementGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups'],
    refetchOnWindowFocus: false,
  });

  const { data: subElementGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
    refetchOnWindowFocus: false,
  });

  const { data: detailedGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
    refetchOnWindowFocus: false,
  });

  // Get the user info to determine the current tenant ID
  const { data: userData } = useQuery({
    queryKey: ['/api/v1/auth/me'],
    refetchOnWindowFocus: false,
  });
  
  const currentTenantId = userData?.user?.tenantId;
  
  // Fetch chart of accounts
  const { data: unfilteredAccounts = [], isLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    refetchOnWindowFocus: false,
  });
  
  // Apply client-side tenant filtering as a safety measure in case the server doesn't filter correctly
  const accounts = React.useMemo(() => {
    // If we don't have the tenant ID yet, don't filter
    if (!currentTenantId) return unfilteredAccounts;
    
    // Advanced filter with strict comparison to prevent type coercion issues
    const filteredAccounts = unfilteredAccounts.filter(account => 
      account && Number(account.tenantId) === Number(currentTenantId)
    );
    
    // Detailed logging for debugging tenant isolation issues
    if (filteredAccounts.length !== unfilteredAccounts.length) {
      const wrongTenantIds = [...new Set(
        unfilteredAccounts
          .filter(account => Number(account.tenantId) !== Number(currentTenantId))
          .map(account => account.tenantId)
      )];
      
      console.error(
        `CRITICAL TENANT ISOLATION ISSUE: Found accounts from ${wrongTenantIds.length} other tenants! ` +
        `Current tenant: ${currentTenantId}, found accounts from tenants: ${wrongTenantIds.join(', ')}`
      );
      
      console.warn(`Filtered out ${unfilteredAccounts.length - filteredAccounts.length} accounts from other tenants.`);
    }
    
    return filteredAccounts;
  }, [unfilteredAccounts, currentTenantId]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "The account has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      setDeleteConfirmOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete account",
      });
    },
  });

  // Filter accounts based on search term
  const filteredAccounts = Array.isArray(accounts) 
    ? accounts.filter((account: any) => {
        return account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.accountCode.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : [];

  // Handle sort functionality
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted accounts
  const getSortedAccounts = () => {
    if (!sortConfig) {
      return filteredAccounts;
    }

    return [...filteredAccounts].sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Confirm delete handler
  const handleDeleteConfirm = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete);
    }
  };

  // Helper to get detailed structure
  const getAccountHierarchy = (account: any) => {
    const mainGroup = mainGroups.find((g: any) => g.id === account.mainGroupId);
    const elementGroup = elementGroups.find((g: any) => g.id === account.elementGroupId);
    const subElementGroup = subElementGroups.find((g: any) => g.id === account.subElementGroupId);
    const detailedGroup = detailedGroups.find((g: any) => g.id === account.detailedGroupId);

    return {
      mainGroup: mainGroup?.name || '',
      elementGroup: elementGroup?.name || '',
      subElementGroup: subElementGroup?.name || '',
      detailedGroup: detailedGroup?.name || '',
    };
  };

  return (
    <AppLayout title="Chart of Accounts">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                Manage your chart of accounts for financial reporting
              </CardDescription>
            </div>
            <Button onClick={() => navigate('/finance/chart-of-accounts/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accounts">
            <TabsList className="mb-4">
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="structure">Structure</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts">
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search accounts..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px] cursor-pointer" onClick={() => requestSort('accountCode')}>
                          <div className="flex items-center">
                            Code
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('accountName')}>
                          <div className="flex items-center">
                            Account Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => requestSort('currentBalance')}>
                          <div className="flex items-center">
                            Balance
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSortedAccounts().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No accounts found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        getSortedAccounts().map((account: any) => {
                          const hierarchy = getAccountHierarchy(account);
                          return (
                            <TableRow key={account.id}>
                              <TableCell className="font-mono">{account.accountCode}</TableCell>
                              <TableCell>
                                <div className="font-medium">{account.accountName}</div>
                                <div className="text-xs text-muted-foreground">{account.description}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  account.accountType === 'asset' ? 'default' :
                                  account.accountType === 'liability' ? 'secondary' :
                                  account.accountType === 'equity' ? 'outline' :
                                  account.accountType === 'revenue' ? 'success' : 'destructive'
                                }>
                                  {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs">
                                  {hierarchy.detailedGroup}
                                </span>
                              </TableCell>
                              <TableCell>
                                {parseFloat(account.currentBalance).toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/finance/chart-of-accounts/edit/${account.id}`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setAccountToDelete(account.id);
                                      setDeleteConfirmOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="structure">
              <div className="grid grid-cols-1 gap-4">
                {/* Structure View - Hierarchical view of the chart of accounts */}
                {mainGroups.map((mainGroup: any) => (
                  <Card key={mainGroup.id} className="mb-4">
                    <CardHeader className="bg-muted py-2">
                      <CardTitle className="text-lg">{mainGroup.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {elementGroups
                        .filter((eg: any) => eg.mainGroupId === mainGroup.id)
                        .map((elementGroup: any) => (
                          <div key={elementGroup.id} className="mb-4">
                            <h3 className="font-semibold border-b pb-1 mb-2">{elementGroup.name}</h3>
                            {subElementGroups
                              .filter((seg: any) => seg.elementGroupId === elementGroup.id)
                              .map((subElementGroup: any) => (
                                <div key={subElementGroup.id} className="mb-3 ml-4">
                                  <h4 className="font-medium text-sm mb-1">{subElementGroup.name}</h4>
                                  <div className="ml-4">
                                    {detailedGroups
                                      .filter((dg: any) => dg.subElementGroupId === subElementGroup.id)
                                      .map((detailedGroup: any) => (
                                        <div key={detailedGroup.id} className="mb-2">
                                          <h5 className="text-sm font-medium text-muted-foreground">{detailedGroup.name}</h5>
                                          <div className="ml-4 mt-1">
                                            {Array.isArray(accounts) && accounts
                                              .filter((a: any) => a.detailedGroupId === detailedGroup.id)
                                              .map((account: any) => (
                                                <div key={account.id} className="text-sm py-1 flex justify-between">
                                                  <span className="flex items-center">
                                                    <span className="font-mono text-muted-foreground mr-2">{account.accountCode}</span>
                                                    {account.accountName}
                                                  </span>
                                                  <span>
                                                    {parseFloat(account.currentBalance).toLocaleString('en-US', {
                                                      style: 'currency',
                                                      currency: 'USD',
                                                    })}
                                                  </span>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              account and its data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {deleteMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}