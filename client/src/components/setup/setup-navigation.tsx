import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Globe, 
  DollarSign, 
  MapPin, 
  Building2, 
  List, 
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

type SetupSection = 'countries' | 'currencies' | 'states' | 'entity-types' | 'task-statuses' | 'service-types';

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
    {
      id: 'entity-types',
      label: 'Entity Types',
      icon: <Building2 className="h-5 w-5" />
    },
    {
      id: 'task-statuses',
      label: 'Task Statuses',
      icon: <List className="h-5 w-5" />
    },
    {
      id: 'service-types',
      label: 'Service Types',
      icon: <Briefcase className="h-5 w-5" />
    }
  ];

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">Setup Configuration</h2>
      <div className="space-y-2">
        {setupItems.map((item) => (
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
    </Card>
  );
}
