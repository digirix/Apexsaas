import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, LoginData, RegisterData } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  permissions: any[] | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<any, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data,
    error,
    isLoading,
    refetch
  } = useQuery<any>({
    queryKey: ["/api/v1/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60, // 1 minute
    retry: false
  });

  const user = data?.user || null;

  // Fetch user permissions separately
  const {
    data: permissionsData,
    isLoading: isPermissionsLoading
  } = useQuery({
    queryKey: [`/api/v1/users/${user?.id}/permissions`],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const permissions = permissionsData || null;

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Login attempt with:", credentials.email);
      const res = await apiRequest("POST", "/api/v1/auth/login/firm", credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Login successful:", data);
      queryClient.setQueryData(["/api/v1/auth/me"], data);
      refetch(); // Force refresh the user data
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.displayName}`,
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      console.log("Registration attempt:", data.email);
      const res = await apiRequest("POST", "/api/v1/auth/signup", data);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Registration successful:", data);
      queryClient.setQueryData(["/api/v1/auth/me"], data);
      refetch(); // Force refresh the user data
      toast({
        title: "Registration successful",
        description: `Welcome to AccFirm, ${data.user.displayName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Logout attempt");
      await apiRequest("POST", "/api/v1/auth/logout");
    },
    onSuccess: () => {
      console.log("Logout successful");
      queryClient.setQueryData(["/api/v1/auth/me"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading: isLoading || isPermissionsLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
