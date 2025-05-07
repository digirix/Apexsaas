import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Globe, 
  DollarSign, 
  MapPin, 
  Building2, 
  List, 
  Briefcase,
  UsersRound,
  Building,
  Receipt,
  FileText,
  GitBranch,
  CreditCard,
  BookOpen,
  BarChart2,
  Bot,
  Brain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupSection } from "@/types/setup";
import { Link } from "wouter";

interface SetupNavigationProps {
  activeSection: SetupSection;
  onSectionChange: (section: SetupSection) => void;
}

interface NavItem {
  id: SetupSection;
  label: string;
  icon: React.ReactNode;
}

export function SetupNavigation({ activeSection, onSectionChange }: SetupNavigationProps) {
  const setupItems: NavItem[] = [
    // Location Configuration
    {
      id: 'countries',
      label: 'Countries',
      icon: <Globe className="h-5 w-5" />
    },
    {
      id: 'currencies',
      label: 'Currencies',
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      id: 'states',
      label: 'States/Provinces',
      icon: <MapPin className="h-5 w-5" />
    },
    
    // Business Configuration
    {
      id: 'entity-types',
      label: 'Entity Types',
      icon: <Building2 className="h-5 w-5" />
    },
    {
      id: 'service-types',
      label: 'Service Types',
      icon: <Briefcase className="h-5 w-5" />
    },
    {
      id: 'tax-jurisdictions',
      label: 'VAT/Sales Tax Jurisdictions',
      icon: <Receipt className="h-5 w-5" />
    },
    {
      id: 'payment-gateways',
      label: 'Payment Gateways',
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      id: 'task-statuses',
      label: 'Task Statuses',
      icon: <List className="h-5 w-5" />
    },
    {
      id: 'task-categories',
      label: 'Task Categories',
      icon: <FileText className="h-5 w-5" />
    },
    {
      id: 'ai-configurations',
      label: 'AI Configurations',
      icon: <Brain className="h-5 w-5" />
    },
    
    // HR Configuration
    {
      id: 'designations',
      label: 'Designations',
      icon: <UsersRound className="h-5 w-5" />
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: <Building className="h-5 w-5" />
    }
  ];

  // Group items by category
  const locationItems = setupItems.slice(0, 3);
  const businessItems = setupItems.slice(3, 10);
  const hrItems = setupItems.slice(10, 12);

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">Setup Configuration</h2>
      <div className="space-y-4">
        {/* Location Configuration */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-2 px-2">Location Configuration</h3>
          <div className="space-y-1">
            {locationItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  activeSection === item.id ? "bg-blue-50 text-blue-700" : "text-slate-600"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                {React.cloneElement(item.icon as React.ReactElement, {
                  className: cn(
                    (item.icon as React.ReactElement).props.className,
                    "mr-2",
                    activeSection === item.id ? "text-blue-700" : "text-slate-500"
                  ),
                })}
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Business Configuration */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-2 px-2">Business Configuration</h3>
          <div className="space-y-1">
            {businessItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  activeSection === item.id ? "bg-blue-50 text-blue-700" : "text-slate-600"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                {React.cloneElement(item.icon as React.ReactElement, {
                  className: cn(
                    (item.icon as React.ReactElement).props.className,
                    "mr-2",
                    activeSection === item.id ? "text-blue-700" : "text-slate-500"
                  ),
                })}
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Finance Configuration */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-2 px-2">Finance Configuration</h3>
          <div className="space-y-1">
            <Link href="/setup/coa-configuration">
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-600"
              >
                <BarChart2 className="h-5 w-5 mr-2 text-slate-500" />
                Chart of Accounts
              </Button>
            </Link>
          </div>
        </div>
        
        {/* AI Configuration */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-2 px-2">AI Configuration</h3>
          <div className="space-y-1">
            <Link href="/setup/ai-customization">
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-600"
              >
                <Brain className="h-5 w-5 mr-2 text-slate-500" />
                AI Customization
              </Button>
            </Link>
          </div>
        </div>
        
        {/* HR Configuration */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-2 px-2">HR Configuration</h3>
          <div className="space-y-1">
            {hrItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  activeSection === item.id ? "bg-blue-50 text-blue-700" : "text-slate-600"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                {React.cloneElement(item.icon as React.ReactElement, {
                  className: cn(
                    (item.icon as React.ReactElement).props.className,
                    "mr-2",
                    activeSection === item.id ? "text-blue-700" : "text-slate-500"
                  ),
                })}
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
