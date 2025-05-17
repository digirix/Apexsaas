import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatStatus {
  isAvailable: boolean;
  provider: string | null;
  model: string | null;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState<ChatStatus>({ 
    isAvailable: false, 
    provider: null, 
    model: null 
  });
  const [conversationId, setConversationId] = useState<string>(`chat-${Date.now()}`);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch chat availability status ONLY when user starts a chat
  useEffect(() => {
    // Only fetch chat status if user is logged in
    if (!user) {
      console.log('User not logged in, skipping chat status check');
      setChatStatus({ isAvailable: false, provider: null, model: null });
      return;
    }
    
    // We'll only do the initial API check - no polling interval
    // This greatly reduces unnecessary API calls
    const fetchChatStatus = async () => {
      try {
        console.log('Fetching chat status with authenticated user:', user.id);
        const response = await fetch('/api/v1/ai/chat/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Important for sending session cookies
        });
        
        if (!response.ok) {
          throw new Error(`Failed to check chat status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Chat status response:', data);
        
        // Force re-render by creating a new object even if the data is the same
        setChatStatus({
          isAvailable: data.isAvailable === true, // Ensure boolean conversion
          provider: data.provider || null,
          model: data.model || null
        });
      } catch (error) {
        console.error('Error checking chat availability:', error);
        setChatStatus({ isAvailable: false, provider: null, model: null });
      }
    };
    
    // Only fetch status once when the user logs in or when they send a message
    // This prevents constant API usage that exhausts rate limits
    if (messages.length === 0) {
      fetchChatStatus();
    }
    
    // No interval timer - we don't need to constantly poll
    // This fixes the API exhaustion issue
  }, [user, messages.length === 0]); // Only re-run when user changes or first message is sent

  // Send a message to the AI assistant
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Create payload for API
      const payload = {
        messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
        conversationId
      };
      
      // Call API with credentials to include session cookies
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update conversation ID if it was generated on the server
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      
      // Add assistant's response to the messages
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message to AI assistant:', error);
      
      toast({
        title: 'Chat Error',
        description: error.message || 'Failed to get a response from the AI assistant',
        variant: 'destructive'
      });
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again later.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, conversationId, toast]);

  // Reset the conversation
  const resetChat = useCallback(() => {
    setMessages([]);
    setConversationId(`chat-${Date.now()}`);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    chatStatus
  };
}