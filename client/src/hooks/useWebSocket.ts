import { useEffect, useRef, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Get current user info for authentication
  const { data: user } = useQuery({
    queryKey: ['/api/v1/auth/me'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  }) as { data: { id: number; tenantId: number } | null };

  useEffect(() => {
    if (!user?.id || !user?.tenantId) {
      return; // Don't connect if user is not authenticated
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      try {
        ws.current = new WebSocket(wsUrl);
        
        ws.current.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          
          // Send authentication message
          if (ws.current && user?.id && user?.tenantId) {
            ws.current.send(JSON.stringify({
              type: 'auth',
              tenantId: user.tenantId,
              userId: user.id
            }));
          }
        };
        
        ws.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log("WebSocket message received:", message);
            
            if (message.type === 'notification') {
              console.log("Processing notification WebSocket message");
              // Force refresh of notification data with aggressive cache invalidation
              queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications'] });
              queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/unread-count'] });
              
              // Also refetch to ensure immediate update
              queryClient.refetchQueries({ queryKey: ['/api/v1/notifications'] });
              queryClient.refetchQueries({ queryKey: ['/api/v1/notifications/unread-count'] });
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
        
        ws.current.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
        
        ws.current.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        setTimeout(connectWebSocket, 3000);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user?.id, user?.tenantId]);

  return { isConnected };
}