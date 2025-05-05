import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Settings,
  MessageSquare,
  Info,
  User,
  CornerRightUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatbotProps = {
  initialSystemPrompt?: string;
};

const initialSystemPromptDefault = `You are an AI assistant for an accounting firm management platform. 
Help users navigate the platform and answer their questions about accounting, tax, and finance topics.
Be concise, professional, and focus on providing accurate information. If you don't know something, say so rather than guessing.
The application includes modules for client management, task management, finance operations, and reporting.`;

export function AIChatbot({ initialSystemPrompt = initialSystemPromptDefault }: ChatbotProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: initialSystemPrompt },
    { role: "assistant", content: "Hello! I'm your accounting assistant. How can I help you today?" },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check if AI is configured
  const aiConfigQuery = useQuery({
    queryKey: ["/api/v1/setup/ai-configuration"],
    enabled: !!user && isOpen,
  });
  
  // Chat completion mutation
  const chatMutation = useMutation({
    mutationFn: async (newMessages: Message[]) => {
      const response = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to get AI response");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage = data.choices[0].message.content;
      setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI response",
        variant: "destructive",
      });
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: "I'm sorry, I encountered an error. Please make sure AI is properly configured in Setup → AI Configuration." 
        }
      ]);
    },
  });
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);
  
  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: "user" as const, content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    // Send to API (excluding the initial system prompt)
    const messagesToSend = [
      messages[0], // System prompt
      ...messages.slice(1), // All previous messages
      userMessage, // New message
    ];
    
    chatMutation.mutate(messagesToSend);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Determine if AI is configured properly
  const isAIConfigured = aiConfigQuery.data?.apiKeyConfigured && aiConfigQuery.data?.selectedModel;
  const isLoading = aiConfigQuery.isLoading || chatMutation.isPending;
  
  return (
    <>
      {/* Floating button to open chatbot */}
      <div className="fixed bottom-4 right-4 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="size-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 p-2"
          >
            <MessageSquare className="size-6 text-white" />
            <span className="sr-only">Open AI Assistant</span>
          </Button>
        )}
      </div>
      
      {/* Chatbot dialog */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 shadow-lg rounded-lg overflow-hidden bg-white border border-gray-200 flex flex-col">
          <Card className="w-full h-full border-0 rounded-none shadow-none">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-blue-600 text-white">
              <CardTitle className="text-base font-medium flex items-center">
                <Bot className="mr-2 h-5 w-5" />
                AI Assistant
              </CardTitle>
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-white hover:bg-blue-700"
                  onClick={() => setIsOpen(false)}
                >
                  <ChevronDown className="h-4 w-4" />
                  <span className="sr-only">Minimize</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-white hover:bg-blue-700"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 h-80 overflow-y-auto">
              {!isAIConfigured && !aiConfigQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                  <Settings className="h-10 w-10 text-slate-400 mb-2" />
                  <h3 className="font-medium">AI Not Configured</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Please set up AI integration in the Setup section.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    asChild
                  >
                    <a href="/setup">Configure AI</a>
                  </Button>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {messages.slice(1).map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        )}
                      >
                        <div className="flex items-center mb-1 text-xs opacity-70">
                          {message.role === "user" ? (
                            <>
                              <User className="mr-1 h-3 w-3" />
                              <span>You</span>
                            </>
                          ) : (
                            <>
                              <Bot className="mr-1 h-3 w-3" />
                              <span>AI Assistant</span>
                            </>
                          )}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  
                  {isLoading && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="border-t p-3">
              {isAIConfigured && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }} 
                  className="flex w-full items-center space-x-2"
                >
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your question..."
                    className="flex-1 min-h-10 h-10 max-h-32 resize-none"
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!input.trim() || isLoading}
                    className="h-10 w-10 shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              )}
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}