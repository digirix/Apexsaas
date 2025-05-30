import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageCircle,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

interface ClientMessage {
  id: number;
  messageContent: string;
  subject: string;
  priority: string;
  isReadByAdmin: boolean;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  entityId?: number;
}

interface MessagingCenterProps {
  entityId?: number;
  entityName?: string;
}

const messageSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  messageContent: z.string().min(1, "Message content is required").max(2000, "Message too long"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  entityId: z.number().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

export function MessagingCenter({ entityId, entityName }: MessagingCenterProps) {
  const [showNewMessage, setShowNewMessage] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      subject: "",
      messageContent: "",
      priority: "normal",
      entityId: entityId,
    },
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<ClientMessage[]>({
    queryKey: ['/api/client-portal/messages'],
    queryFn: () => fetch('/api/client-portal/messages').then(res => res.json())
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      const response = await fetch('/api/client-portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-portal/messages'] });
      form.reset();
      setShowNewMessage(false);
      toast({
        title: "Message sent successfully",
        description: "Your message has been sent to the accounting firm.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MessageFormData) => {
    sendMessageMutation.mutate(data);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-slate-600">Loading messages...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Message Center</h2>
          <p className="text-slate-600">
            Communicate directly with your accounting firm
            {entityName && ` about ${entityName}`}
          </p>
        </div>
        <Button onClick={() => setShowNewMessage(true)} disabled={showNewMessage}>
          <MessageCircle className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* New Message Form */}
      {showNewMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Send New Message</CardTitle>
              <CardDescription>
                Send a message to your accounting firm team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter message subject" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="messageContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Type your message here..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowNewMessage(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Messages List */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Messages Yet</h3>
              <p className="text-slate-500 mb-4">
                Start a conversation with your accounting firm by sending your first message.
              </p>
              <Button onClick={() => setShowNewMessage(true)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Send First Message
              </Button>
            </CardContent>
          </Card>
        ) : (
          messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`${!message.isReadByAdmin ? 'border-blue-200 bg-blue-50/50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{message.subject}</CardTitle>
                        <Badge className={`text-xs ${getPriorityColor(message.priority)}`}>
                          {getPriorityIcon(message.priority)}
                          <span className="ml-1 capitalize">{message.priority}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Sent: {new Date(message.createdAt).toLocaleString()}</span>
                        </div>
                        {message.entityId && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>Entity-specific</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {message.isReadByAdmin ? (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Read
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">Your Message:</h4>
                    <p className="text-slate-600 whitespace-pre-wrap">{message.messageContent}</p>
                  </div>
                  
                  {message.adminResponse && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-700">Response from Accounting Firm:</h4>
                          {message.respondedAt && (
                            <span className="text-xs text-slate-500">
                              {new Date(message.respondedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-slate-700 whitespace-pre-wrap">{message.adminResponse}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}