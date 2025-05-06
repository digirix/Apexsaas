import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, AlertTriangle, Bot, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

interface AiChatProps {
  conversationId?: string;
  initialMessages?: Message[];
  title?: string;
  placeholder?: string;
  className?: string;
}

export function AiChat({
  conversationId: initialConversationId,
  initialMessages = [],
  title = "AI Assistant",
  placeholder = "Ask me anything about accounting, compliance, or financial reports...",
  className = "",
}: AiChatProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Fetch AI configuration
  const { data: aiConfig, isLoading: isLoadingConfig, isError: isConfigError } = useQuery({
    queryKey: ["/api/v1/ai/active-configuration"],
  });

  // Fetch conversation history if conversationId is provided
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/v1/ai/chat-history", conversationId],
    enabled: !!conversationId,
  });

  // Load history data
  useEffect(() => {
    if (historyData && historyData.messages && historyData.messages.length > 0) {
      setMessages(historyData.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.role === 'assistant' ? msg.response : msg.message,
        timestamp: new Date(msg.createdAt),
      })));
    }
  }, [historyData]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { message: string; conversationId?: string }) => 
      apiRequest("POST", "/api/v1/ai/chat", messageData),
    onSuccess: async (data) => {
      const responseData = await data.json();
      // Add the assistant's response to messages
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseData.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Set or update conversation ID
      if (responseData.conversationId && !conversationId) {
        setConversationId(responseData.conversationId);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to get response",
        description: error.message || "There was an error processing your message.",
        variant: "destructive",
      });
    },
  });

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Add user message to the chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send to API
    sendMessageMutation.mutate({
      message: input,
      conversationId,
    });
    
    // Clear input
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Check if AI is not configured
  if (!isLoadingConfig && isConfigError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>AI Not Configured</AlertTitle>
        <AlertDescription>
          The AI assistant is not configured. Please set up an AI provider in the AI settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-semibold">
          <Bot className="h-5 w-5 mr-2 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[400px] px-4" ref={scrollAreaRef}>
          <div className="space-y-4 pt-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Bot className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-slate-500">
                  How can I assist you today? Ask me anything about accounting, tax compliance, or financial reports.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div 
                    className={`flex max-w-[80%] ${
                      message.role === "assistant" 
                        ? "flex-row" 
                        : "flex-row-reverse"
                    }`}
                  >
                    <Avatar className={`h-8 w-8 ${message.role === "assistant" ? "mr-2" : "ml-2"}`}>
                      {message.role === "assistant" ? (
                        <>
                          <AvatarFallback>AI</AvatarFallback>
                          <AvatarImage src="/ai-avatar.png" />
                        </>
                      ) : (
                        <>
                          <AvatarFallback>
                            {user?.displayName?.charAt(0) || 'U'}
                          </AvatarFallback>
                          <AvatarImage src={`https://avatar.vercel.sh/${user?.id}.png`} />
                        </>
                      )}
                    </Avatar>
                    <div 
                      className={`rounded-lg px-4 py-2 ${
                        message.role === "assistant" 
                          ? "bg-slate-100 text-slate-700" 
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div 
                        className={`text-xs mt-1 ${
                          message.role === "assistant" 
                            ? "text-slate-400" 
                            : "text-blue-100"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%] flex-row">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback>AI</AvatarFallback>
                    <AvatarImage src="/ai-avatar.png" />
                  </Avatar>
                  <div className="rounded-lg px-4 py-3 bg-slate-100 text-slate-700">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-3">
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendMessageMutation.isPending || isLoadingConfig || !aiConfig}
            className="flex-grow"
          />
          <Button 
            size="icon" 
            type="submit" 
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || isLoadingConfig || !aiConfig || !input.trim()}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}