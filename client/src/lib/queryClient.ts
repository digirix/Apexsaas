import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Custom error class to include additional response information
export class ApiError extends Error {
  status: number;
  statusText: string;
  
  constructor(res: Response, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = res.status;
    this.statusText = res.statusText;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = (await res.text()) || res.statusText;
      console.error(`API Error (${res.status})`, text);
      
      // Parse the error response to extract user-friendly messages
      let userMessage = text;
      try {
        const errorData = JSON.parse(text);
        if (errorData.message) {
          // Convert technical permission errors to user-friendly messages
          if (errorData.message.includes("Permission denied: Cannot")) {
            const action = errorData.message.match(/Cannot (\w+) in (\w+) module/);
            if (action) {
              const [, actionType, moduleName] = action;
              const moduleDisplay = {
                clients: "Client Management",
                users: "User Management", 
                tasks: "Task Management",
                finance: "Finance Module",
                setup: "System Setup"
              }[moduleName] || moduleName;
              
              const actionDisplay = {
                create: "add new records",
                read: "view information", 
                update: "edit records",
                delete: "remove records"
              }[actionType] || actionType;
              
              userMessage = `You don't have permission to ${actionDisplay} in ${moduleDisplay}. Please contact your administrator to request access.`;
            } else {
              userMessage = "You don't have permission to perform this action. Please contact your administrator.";
            }
          } else if (res.status === 403) {
            userMessage = "Access denied. You don't have permission to perform this action.";
          } else if (res.status === 401) {
            userMessage = "Please log in to access this feature.";
          } else {
            userMessage = errorData.message;
          }
        }
      } catch (parseError) {
        // If JSON parsing fails, use the raw text
        if (res.status === 403) {
          userMessage = "Access denied. You don't have permission to perform this action.";
        } else if (res.status === 401) {
          userMessage = "Please log in to access this feature.";
        }
      }
      
      throw new ApiError(res, userMessage);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error(`Failed to parse API error response:`, error);
      throw new ApiError(res, `${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data ? data : '');
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`API Response: ${res.status} from ${method} ${url}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request failed: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`QueryFn: Fetching ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });
      
      console.log(`QueryFn: ${url} returned status ${res.status}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`QueryFn: Returning null for 401 response from ${url}`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`QueryFn: ${url} data:`, data);
      return data;
    } catch (error) {
      console.error(`QueryFn: Error fetching ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
