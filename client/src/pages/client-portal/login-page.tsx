import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { clientPortalLoginSchema, type ClientPortalLoginData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function ClientPortalLoginPage() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [tenantId, setTenantId] = useState<number>(0);

  // Initialize form with validation
  const form = useForm<ClientPortalLoginData>({
    resolver: zodResolver(clientPortalLoginSchema),
    defaultValues: {
      username: "",
      password: "",
      tenantId: 0,
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: ClientPortalLoginData) => {
      setError(null);
      const res = await apiRequest("POST", "/api/client-portal/login", credentials);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Login successful:", data);
      
      // Check if password reset is required
      if (data.passwordResetRequired) {
        navigate("/client-portal/reset-password");
      } else {
        navigate("/client-portal/dashboard");
      }
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      setError(error.message);
    },
  });

  function onSubmit(data: ClientPortalLoginData) {
    // Add tenant ID to form data
    loginMutation.mutate({
      ...data,
      tenantId
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Client Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {tenantName 
            ? `Sign in to your ${tenantName} account` 
            : "Sign in to your account"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Access your financial information and documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Show any login errors */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  {...form.register("username")}
                  disabled={loginMutation.isPending}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("password")}
                  disabled={loginMutation.isPending}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Forgot your password? Contact your accounting firm.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}