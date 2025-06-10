import { useSaasAuth } from './saas-auth-hook';
import SaasLoginPage from '@/pages/saas-admin/saas-login-page';

interface SaasProtectedRouteProps {
  children: React.ReactNode;
}

export default function SaasProtectedRoute({ children }: SaasProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useSaasAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SaasLoginPage />;
  }

  return <>{children}</>;
}