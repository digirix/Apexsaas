import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { useAuth } from './use-auth';
import { useTenant } from './use-tenant';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ isConnected: false });

export function useWebSocket() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user || !currentTenant) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate with tenant ID
      ws.send(JSON.stringify({
        type: 'auth',
        tenantId: currentTenant.id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        switch (message.type) {
          case 'notification_created':
            // Invalidate notification queries to refresh counts and lists
            queryClient.invalidateQueries({ queryKey: ['/api/v1/me/notifications'] });
            queryClient.invalidateQueries({ queryKey: ['/api/v1/me/notifications/unread-count'] });
            break;
            
          case 'data_refresh':
            // Invalidate relevant data queries based on module
            if (message.module === 'tasks') {
              queryClient.invalidateQueries({ queryKey: ['/api/v1/tasks'] });
              if (message.entity) {
                queryClient.invalidateQueries({ queryKey: ['/api/v1/tasks', message.entity] });
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, tenant]);

  return { isConnected };
}