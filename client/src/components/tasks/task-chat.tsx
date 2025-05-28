import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Edit, Trash2, AtSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface TaskChatProps {
  taskId: number;
  users?: Array<{ id: number; displayName: string; username: string }>;
}

interface TaskMessage {
  id: number;
  taskId: number;
  userId: number;
  messageContent: string;
  createdAt: string;
  isEdited: boolean;
  user: {
    id: number;
    displayName: string;
  };
  mentions?: string[];
}

export function TaskChat({ taskId, users = [] }: TaskChatProps) {
  const [message, setMessage] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch messages for this task
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["/api/v1/tasks", taskId, "messages"],
    enabled: !!taskId,
  });

  const messages = messagesData?.messages || [];

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: (messageContent: string) =>
      apiRequest(`/api/v1/tasks/${taskId}/messages`, {
        method: "POST",
        body: { messageContent },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks", taskId, "messages"] });
      setMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been posted to the task.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Handle message submission
  const handleSendMessage = () => {
    if (!message.trim()) return;
    createMessageMutation.mutate(message);
  };

  // Handle @mention detection
  const handleInputChange = (value: string) => {
    setMessage(value);
    
    // Check for @ symbol to show mentions
    const atIndex = value.lastIndexOf("@");
    if (atIndex !== -1 && atIndex === value.length - 1) {
      setShowMentions(true);
      setMentionSearch("");
    } else if (atIndex !== -1 && atIndex < value.length - 1) {
      const searchTerm = value.substring(atIndex + 1);
      if (!searchTerm.includes(" ")) {
        setShowMentions(true);
        setMentionSearch(searchTerm);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Handle mention selection
  const handleMentionSelect = (username: string) => {
    const atIndex = message.lastIndexOf("@");
    const beforeMention = message.substring(0, atIndex);
    const afterCursor = message.substring(message.length);
    const newMessage = `${beforeMention}@${username} ${afterCursor}`;
    setMessage(newMessage);
    setShowMentions(false);
    messageInputRef.current?.focus();
  };

  // Filter users for mentions
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    user.displayName.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Render message with mentions highlighted
  const renderMessageContent = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a username (every odd index after split)
        return (
          <Badge key={index} variant="secondary" className="mx-1">
            @{part}
          </Badge>
        );
      }
      return part;
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-96">
      <div className="flex items-center gap-2 p-3 border-b">
        <h3 className="font-medium">Task Discussion</h3>
        <Badge variant="outline">{messages.length} messages</Badge>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="mb-2">No messages yet</div>
              <div className="text-sm">Start the conversation about this task</div>
            </div>
          ) : (
            messages.map((msg: TaskMessage) => (
              <div key={msg.id} className="flex gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="text-xs">
                    {msg.user.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{msg.user.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(msg.createdAt)}
                    </span>
                    {msg.isEdited && (
                      <Badge variant="outline" className="text-xs">edited</Badge>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed">
                    {renderMessageContent(msg.messageContent)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2 relative">
          <div className="flex-1 relative">
            <Input
              ref={messageInputRef}
              value={message}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message... Use @username to mention someone"
              className="pr-10"
            />
            
            {/* Mention dropdown */}
            {showMentions && filteredUsers.length > 0 && (
              <Card className="absolute bottom-full left-0 right-0 mb-2 z-50">
                <CardContent className="p-2">
                  <div className="text-xs text-muted-foreground mb-2">Mention someone:</div>
                  <div className="space-y-1">
                    {filteredUsers.slice(0, 5).map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleMentionSelect(user.username)}
                        className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted rounded-sm text-sm"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-xs text-muted-foreground">@{user.username}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <Button 
            size="sm" 
            onClick={handleSendMessage}
            disabled={!message.trim() || createMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          Press Enter to send, @ to mention team members
        </div>
      </div>
    </div>
  );
}