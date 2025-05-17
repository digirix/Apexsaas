import { useState, useRef, useEffect } from 'react';
import { useChat, type ChatMessage } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Bot, User, Loader2, X, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageBubbleProps {
  message: ChatMessage;
}

// Message bubble component
const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  
  // Format timestamp if available
  const formattedTime = message.timestamp ? 
    format(new Date(message.timestamp), 'h:mm a') : '';

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex items-start gap-2 max-w-[80%]",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
        
        <div className={cn(
          "p-3 rounded-lg",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <div className="whitespace-pre-wrap">{message.content}</div>
          {formattedTime && (
            <div className={cn(
              "text-[10px] mt-1",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {formattedTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main chat widget component
export function ChatWidget() {
  const { messages, isLoading, sendMessage, resetChat, chatStatus } = useChat();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to the bottom of the messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Debug chat status and manage active state to prevent excessive API calls
  useEffect(() => {
    console.log('ChatWidget - Current chat status:', chatStatus);
    
    // Set chat active state in localStorage to reduce API calls
    // This tells the useChat hook whether to poll for status updates
    if (isOpen) {
      localStorage.setItem('chat_widget_active', 'true');
    } else {
      localStorage.setItem('chat_widget_active', 'false');
    }
  }, [chatStatus, isOpen]);
  
  // Handle sending message
  const handleSendMessage = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };
  
  // Handle key press (Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle chat dialog close
  const handleClose = () => {
    setIsOpen(false);
  };
  
  return (
    <>
      {/* Floating chat button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            size="icon" 
            className="fixed bottom-4 right-4 rounded-full h-14 w-14 shadow-lg z-50"
          >
            <MessageSquare size={24} />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-[400px] p-0 h-[500px] flex flex-col gap-0">
          <DialogHeader className="px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bot size={20} /> AI Assistant
              </DialogTitle>
              
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={resetChat} 
                        className="h-8 w-8"
                      >
                        <RefreshCcw size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>New Conversation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleClose} 
                        className="h-8 w-8"
                      >
                        <X size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Close</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!chatStatus.isAvailable ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-lg">AI Assistant Not Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground">
                    The AI Assistant is not available. Please configure an AI provider in the Setup module.
                  </p>
                </CardContent>
              </Card>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Bot size={40} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">How can I help you today?</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  Ask me anything about your clients, tasks, invoices, or how to use the application.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <MessageBubble key={index} message={message} />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          {chatStatus.isAvailable && (
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Type your message..." 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading || !chatStatus.isAvailable}
                  className="min-h-[60px] resize-none"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!input.trim() || isLoading || !chatStatus.isAvailable} 
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="m22 2-7 20-4-9-9-4Z"/>
                      <path d="M22 2 11 13"/>
                    </svg>
                  )}
                </Button>
              </div>
              {chatStatus.provider && chatStatus.model && (
                <div className="mt-2 text-[10px] text-muted-foreground text-right">
                  Using {chatStatus.provider} ({chatStatus.model})
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}