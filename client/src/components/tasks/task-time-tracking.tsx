import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Timer, Plus, Clock, Edit, Trash2, Play, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TaskTimeTrackingProps {
  taskId: number;
}

interface TimeEntry {
  id: number;
  taskId: number;
  userId: number;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number;
  description: string | null;
  isBillable: boolean;
  createdAt: string;
  user: {
    id: number;
    displayName: string;
  };
}

export function TaskTimeTracking({ taskId }: TaskTimeTrackingProps) {
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();

  // Form state for adding time entry
  const [timeForm, setTimeForm] = useState({
    hours: "",
    minutes: "",
    description: "",
    isBillable: true,
  });

  // Fetch time entries for this task
  const { data: timeData, isLoading } = useQuery({
    queryKey: ["/api/v1/tasks", taskId, "time-entries"],
    enabled: !!taskId,
  });

  const timeEntries = timeData?.timeEntries || [];
  const totalDuration = timeData?.totalDuration || 0;

  // Create time entry mutation
  const createTimeEntryMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/v1/tasks/${taskId}/time-entries`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks", taskId, "time-entries"] });
      setIsAddingTime(false);
      setTimeForm({ hours: "", minutes: "", description: "", isBillable: true });
      toast({
        title: "Time logged",
        description: "Your time entry has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log time",
        variant: "destructive",
      });
    },
  });

  // Timer functionality
  const startTimer = () => {
    setIsTimerRunning(true);
    setTimerStart(new Date());
    setElapsedTime(0);
    
    // Update elapsed time every second
    const interval = setInterval(() => {
      if (timerStart) {
        setElapsedTime(Math.floor((new Date().getTime() - timerStart.getTime()) / 1000));
      }
    }, 1000);

    // Store interval ID for cleanup
    (window as any).timerInterval = interval;
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if ((window as any).timerInterval) {
      clearInterval((window as any).timerInterval);
    }
    
    if (timerStart && elapsedTime > 0) {
      // Convert elapsed time to hours and minutes for the form
      const hours = Math.floor(elapsedTime / 3600);
      const minutes = Math.floor((elapsedTime % 3600) / 60);
      
      setTimeForm({
        hours: hours.toString(),
        minutes: minutes.toString(),
        description: "",
        isBillable: true,
      });
      setIsAddingTime(true);
    }
    
    setTimerStart(null);
    setElapsedTime(0);
  };

  // Handle manual time entry
  const handleAddTime = () => {
    const hours = parseInt(timeForm.hours) || 0;
    const minutes = parseInt(timeForm.minutes) || 0;
    const durationSeconds = (hours * 3600) + (minutes * 60);

    if (durationSeconds === 0) {
      toast({
        title: "Invalid time",
        description: "Please enter a valid duration",
        variant: "destructive",
      });
      return;
    }

    createTimeEntryMutation.mutate({
      durationSeconds,
      description: timeForm.description || null,
      isBillable: timeForm.isBillable,
    });
  };

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header with total time and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Time Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Total: {formatDuration(totalDuration)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Timer */}
          {isTimerRunning ? (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="animate-pulse">
                <Timer className="h-3 w-3 mr-1" />
                {formatDuration(elapsedTime)}
              </Badge>
              <Button size="sm" variant="outline" onClick={stopTimer}>
                <Square className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startTimer}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          
          {/* Add time button */}
          <Dialog open={isAddingTime} onOpenChange={setIsAddingTime}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Time Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hours">Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      min="0"
                      value={timeForm.hours}
                      onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minutes">Minutes</Label>
                    <Input
                      id="minutes"
                      type="number"
                      min="0"
                      max="59"
                      value={timeForm.minutes}
                      onChange={(e) => setTimeForm({ ...timeForm, minutes: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={timeForm.description}
                    onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                    placeholder="What did you work on?"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="billable"
                    checked={timeForm.isBillable}
                    onCheckedChange={(checked) => setTimeForm({ ...timeForm, isBillable: checked })}
                  />
                  <Label htmlFor="billable">Billable time</Label>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleAddTime} disabled={createTimeEntryMutation.isPending}>
                    Log Time
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingTime(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Time entries list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-4">
                Loading time entries...
              </div>
            ) : timeEntries.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div className="mb-2">No time logged yet</div>
                <div className="text-sm">Start tracking time on this task</div>
              </div>
            ) : (
              <div className="space-y-3">
                {timeEntries.map((entry: TimeEntry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="text-xs">
                        {entry.user.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{entry.user.displayName}</span>
                        <Badge variant={entry.isBillable ? "default" : "secondary"} className="text-xs">
                          {entry.isBillable ? "Billable" : "Non-billable"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{formatDuration(entry.durationSeconds)}</span>
                        <span>•</span>
                        <span>{formatTime(entry.createdAt)}</span>
                      </div>
                      
                      {entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}