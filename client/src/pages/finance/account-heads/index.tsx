import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";

// Define types for the Account Head
type AccountHead = {
  id: number;
  tenantId: number;
  accountCode: string;
  accountName: string;
  detailedGroupId: number;
  subElementGroupId: number;
  elementGroupId: number;
  mainGroupId: number;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense";
  createdAt: string;
  detailedGroup: {
    id: number;
    name: string;
    customName: string | null;
    code: string;
  };
  subElementGroup: {
    id: number;
    name: string;
    customName: string | null;
    code: string;
  };
  elementGroup: {
    id: number;
    name: string;
    code: string;
  };
  mainGroup: {
    id: number;
    name: string;
    code: string;
  };
};

export default function AccountHeadsManagementPage() {
  const { 
    data: accountHeads = [], 
    isLoading
  } = useQuery<AccountHead[]>({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
  });

  // Format the account classification path
  const getAccountClassification = (account: AccountHead) => {
    const mainGroup = account.mainGroup?.name || "";
    const elementGroup = account.elementGroup?.name || "";
    const subElementGroup = account.subElementGroup?.customName || account.subElementGroup?.name || "";
    const detailedGroup = account.detailedGroup?.customName || account.detailedGroup?.name || "";
    
    return `${mainGroup} → ${elementGroup} → ${subElementGroup} → ${detailedGroup}`;
  };

  return (
    <AppLayout title="Account Heads Management">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Account Heads Management</h1>
        <Link href="/finance/chart-of-accounts/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Account Head
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Heads</CardTitle>
          <CardDescription>
            Manage your chart of accounts entries. These accounts are used for all financial transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading account heads...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Account Classification</TableHead>
                    <TableHead>Account Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountHeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No account heads found. Create your first account head.
                      </TableCell>
                    </TableRow>
                  ) : (
                    accountHeads.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.accountCode}</TableCell>
                        <TableCell className="font-medium">{account.accountName}</TableCell>
                        <TableCell>{getAccountClassification(account)}</TableCell>
                        <TableCell className="capitalize">{account.accountType}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}