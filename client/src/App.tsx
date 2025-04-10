import { Switch, Route } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ClientsPage from "@/pages/clients-page";
import ClientDetailPage from "@/pages/client-detail-page";
import SetupPage from "@/pages/setup-page";
import TasksPage from "@/pages/tasks-page";
import UsersPage from "@/pages/users-page";
import { WorkflowPage } from "@/pages/workflow-page";
import { ComplianceCalendarPage } from "@/pages/compliance-calendar-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/clients" component={ClientsPage} />
      <ProtectedRoute path="/clients/:id" component={ClientDetailPage} />
      <ProtectedRoute path="/setup" component={SetupPage} />
      <ProtectedRoute path="/tasks" component={TasksPage} />
      <ProtectedRoute path="/compliance-calendar" component={ComplianceCalendarPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/workflow" component={WorkflowPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
