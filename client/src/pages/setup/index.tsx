import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart4, Settings2, FileText, CreditCard, FileStack, ReceiptText } from 'lucide-react';

export default function SetupPage() {
  const [location, setLocation] = useLocation();

  const setupModules = [
    {
      title: 'Chart of Accounts',
      description: 'Manage account hierarchy, edit or delete sub-element groups, detailed groups, and accounts',
      icon: <FileStack className="h-8 w-8" />,
      href: '/setup/chart-of-accounts',
      enabled: true,
    },
    {
      title: 'Company Settings',
      description: 'Update company information, branding, and preferences',
      icon: <Settings2 className="h-8 w-8" />,
      href: '/setup/company',
      enabled: false,
    },
    {
      title: 'Invoice Settings',
      description: 'Configure invoice templates, numbering, and payment terms',
      icon: <ReceiptText className="h-8 w-8" />,
      href: '/setup/invoice',
      enabled: false,
    },
    {
      title: 'Payment Methods',
      description: 'Manage payment gateways and processing methods',
      icon: <CreditCard className="h-8 w-8" />,
      href: '/setup/payments',
      enabled: false,
    },
    {
      title: 'Report Templates',
      description: 'Customize financial reports and statements',
      icon: <BarChart4 className="h-8 w-8" />,
      href: '/setup/reports',
      enabled: false,
    },
    {
      title: 'Tax Settings',
      description: 'Configure tax rates, jurisdiction rules, and compliance settings',
      icon: <FileText className="h-8 w-8" />,
      href: '/setup/tax',
      enabled: false,
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Setup</h1>
          <p className="text-muted-foreground">Configure and manage your system settings</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setLocation('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {setupModules.map((module, index) => (
          <Card 
            key={index} 
            className={`overflow-hidden ${!module.enabled ? 'opacity-60' : ''}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  {module.icon}
                </div>
                <CardTitle>{module.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mt-2 min-h-[50px]">
                {module.description}
              </CardDescription>
            </CardContent>
            <CardFooter>
              <Button 
                variant={module.enabled ? "default" : "outline"} 
                className="w-full" 
                onClick={() => module.enabled && setLocation(module.href)}
                disabled={!module.enabled}
              >
                {module.enabled ? "Configure" : "Coming Soon"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}