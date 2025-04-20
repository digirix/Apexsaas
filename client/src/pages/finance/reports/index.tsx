import React from 'react';
import { useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/app-layout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  BookOpen, 
  FileText, 
  LineChart, 
  PieChart
} from 'lucide-react';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

const ReportCard = ({ title, description, icon, href }: ReportCardProps) => {
  const [, navigate] = useLocation();
  
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          Generate detailed {title.toLowerCase()} with customizable date ranges and filtering options.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={() => navigate(href)}>
          View Report
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function FinancialReportsPage() {
  return (
    <AppLayout title="Financial Reports">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and analyze comprehensive financial reports for your business
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportCard
            title="General Ledger"
            description="Track all financial transactions by account"
            icon={<BookOpen className="h-5 w-5" />}
            href="/finance/reports/ledger"
          />
          
          <ReportCard
            title="Profit & Loss"
            description="View revenue, expenses, and profitability"
            icon={<BarChart3 className="h-5 w-5" />}
            href="/finance/reports/profit-loss"
          />
          
          <ReportCard
            title="Balance Sheet"
            description="Assets, liabilities, and equity overview"
            icon={<FileText className="h-5 w-5" />}
            href="/finance/reports/balance-sheet"
          />
          
          <ReportCard
            title="Cash Flow"
            description="Track changes in cash position over time"
            icon={<LineChart className="h-5 w-5" />}
            href="/finance/reports/cash-flow"
          />
          
          <ReportCard
            title="Expense Report"
            description="Detailed breakdown of all expenses"
            icon={<PieChart className="h-5 w-5" />}
            href="/finance/reports/expenses"
          />
          
          <ReportCard
            title="Tax Summary"
            description="Overview of tax liabilities and payments"
            icon={<FileText className="h-5 w-5" />}
            href="/finance/reports/tax-summary"
          />
        </div>
      </div>
    </AppLayout>
  );
}