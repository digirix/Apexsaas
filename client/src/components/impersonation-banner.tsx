import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ImpersonationInfo {
  isImpersonated: boolean;
  tenantName?: string;
  saasAdminName?: string;
}

export function ImpersonationBanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if currently being impersonated
  const { data: impersonationInfo } = useQuery<ImpersonationInfo>({
    queryKey: ['/api/v1/impersonation/status'],
    refetchInterval: 5000, // Check every 5 seconds
  });

  const endImpersonationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/end-impersonation', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to end impersonation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Impersonation Ended',
        description: 'You have been logged out. Please log in normally.',
      });
      // Force page reload to clear session
      window.location.href = '/login';
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to end impersonation',
        variant: 'destructive',
      });
    },
  });

  // Don't render banner if not being impersonated
  if (!impersonationInfo?.isImpersonated) {
    return null;
  }

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 bg-red-500 border-red-600 text-white rounded-none border-x-0 border-t-0">
      <AlertTriangle className="h-4 w-4 text-white" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            IMPERSONATION ACTIVE
          </span>
          <span className="text-red-100">
            - You are viewing {impersonationInfo.tenantName || 'this tenant'} as a SaaS Administrator. 
            All actions are being logged for security purposes.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => endImpersonationMutation.mutate()}
          disabled={endImpersonationMutation.isPending}
          className="bg-white text-red-600 border-white hover:bg-red-50 hover:text-red-700 ml-4"
        >
          <X className="h-3 w-3 mr-1" />
          End Impersonation
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Hook to detect impersonation status
export function useImpersonationStatus() {
  const { data: impersonationInfo } = useQuery<ImpersonationInfo>({
    queryKey: ['/api/v1/impersonation/status'],
    refetchInterval: 5000,
  });

  return {
    isImpersonated: impersonationInfo?.isImpersonated || false,
    tenantName: impersonationInfo?.tenantName,
    saasAdminName: impersonationInfo?.saasAdminName,
  };
}