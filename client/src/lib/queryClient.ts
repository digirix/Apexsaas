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
      throw new ApiError(res, `${res.status}: ${text}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error(`Failed to parse API error response:`, error);
      throw new ApiError(res, `${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest<T>(options: {
  url: string;
  method?: string;
  data?: unknown;
}): Promise<T> {
  const { url, method = 'GET', data } = options;
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
    const responseData = await res.json();
    return responseData as T;
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
