import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertTriangle, Brain, Plus } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TaskSuggestion {
  name: string;
  description: string;
  category: string;
  dueDate: string;
  estimatedHours: number;
  priority: "Low" | "Medium" | "High";
}

interface TaskSuggestionsProps {
  entityId: number;
  entityName: string;
  className?: string;
}

export function TaskSuggestions({ 
  entityId, 
  entityName,
  className = ""
}: TaskSuggestionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [allSelected, setAllSelected] = useState(false);
  const [detailedMode, setDetailedMode] = useState(true);

  // Generate task suggestions mutation
  const generateSuggestionsMutation = useMutation({
    mutationFn: (data: { entityId: number }) => 
      apiRequest("/api/v1/ai/task-suggestions", data, "POST"),
    onSuccess: (data) => {
      if (data.success && data.suggestions) {
        setTaskSuggestions(data.suggestions);
        // Reset selections
        setSelectedTasks([]);
        setAllSelected(false);
        
        toast({
          title: "Task suggestions generated",
          description: `Generated ${data.suggestions.length} task suggestions for ${entityName}.`,
        });
      } else {
        toast({
          title: "Failed to generate suggestions",
          description: data.error || "There was an error generating task suggestions.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate suggestions",
        description: error.message || "There was an error generating task suggestions.",
        variant: "destructive",
      });
    },
  });

  // Create tasks mutation
  const createTasksMutation = useMutation({
    mutationFn: (data: { entityId: number, suggestions: TaskSuggestion[] }) => 
      apiRequest("/api/v1/tasks/bulk-create", data, "POST"),
    onSuccess: (data) => {
      toast({
        title: "Tasks created",
        description: `Successfully created ${data.createdCount} tasks for ${entityName}.`,
      });
      
      // Remove created tasks from suggestions
      if (data.createdIds && data.createdIds.length > 0) {
        setSelectedTasks([]);
        queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create tasks",
        description: error.message || "There was an error creating the tasks.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateSuggestions = () => {
    generateSuggestionsMutation.mutate({ entityId });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(taskSuggestions.map((_, index) => index));
    }
    setAllSelected(!allSelected);
  };

  const handleSelectTask = (index: number) => {
    if (selectedTasks.includes(index)) {
      setSelectedTasks(selectedTasks.filter(i => i !== index));
      setAllSelected(false);
    } else {
      const newSelected = [...selectedTasks, index];
      setSelectedTasks(newSelected);
      setAllSelected(newSelected.length === taskSuggestions.length);
    }
  };

  const handleCreateTasks = () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task suggestion to create.",
        variant: "destructive",
      });
      return;
    }

    const selectedSuggestions = selectedTasks.map(index => taskSuggestions[index]);
    createTasksMutation.mutate({
      entityId,
      suggestions: selectedSuggestions
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medium":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <Brain className="h-5 w-5 mr-2 text-purple-500" />
          AI Task Suggestions
        </CardTitle>
        <CardDescription>
          Generate intelligent task suggestions for {entityName} based on entity type, jurisdictions, and services.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {(!taskSuggestions || taskSuggestions.length === 0) && !generateSuggestionsMutation.isPending && (
          <div className="py-8 text-center">
            <Brain className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 mb-6">
              No task suggestions generated yet. Click the button below to generate AI-powered task suggestions.
            </p>
            <Button 
              onClick={handleGenerateSuggestions}
              disabled={generateSuggestionsMutation.isPending}
            >
              {generateSuggestionsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Suggestions...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Task Suggestions
                </>
              )}
            </Button>
          </div>
        )}

        {generateSuggestionsMutation.isPending && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
            <p className="text-slate-600">
              Analyzing entity data and generating intelligent task suggestions...
            </p>
          </div>
        )}

        {taskSuggestions && taskSuggestions.length > 0 && !generateSuggestionsMutation.isPending && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="detailed-mode"
                  checked={detailedMode}
                  onCheckedChange={setDetailedMode}
                />
                <Label htmlFor="detailed-mode">Detailed view</Label>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSuggestions}
                disabled={generateSuggestionsMutation.isPending}
              >
                Regenerate
              </Button>
            </div>

            {detailedMode ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {taskSuggestions.map((suggestion, index) => (
                  <Card key={index} className={`border ${selectedTasks.includes(index) ? 'border-blue-400 bg-blue-50' : ''}`}>
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                      <div className="flex-1">
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(index)}
                            onChange={() => handleSelectTask(index)}
                            className="mt-1"
                          />
                          <div>
                            <CardTitle className="text-base">{suggestion.name}</CardTitle>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                                {suggestion.priority} Priority
                              </Badge>
                              <Badge variant="outline">
                                {suggestion.category}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                                {suggestion.estimatedHours}h Est.
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-slate-600">
                        {suggestion.description}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Due date: {suggestion.dueDate}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="border rounded-md max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Est. Hours</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskSuggestions.map((suggestion, index) => (
                      <TableRow 
                        key={index}
                        className={selectedTasks.includes(index) ? 'bg-blue-50' : ''}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(index)}
                            onChange={() => handleSelectTask(index)}
                          />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="font-medium">{suggestion.name}</div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{suggestion.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>{suggestion.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                            {suggestion.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{suggestion.estimatedHours}</TableCell>
                        <TableCell>{suggestion.dueDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {taskSuggestions && taskSuggestions.length > 0 && !generateSuggestionsMutation.isPending && (
        <CardFooter className="flex justify-between">
          <div className="text-sm text-slate-500">
            {selectedTasks.length} of {taskSuggestions.length} tasks selected
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                disabled={selectedTasks.length === 0 || createTasksMutation.isPending}
              >
                {createTasksMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Tasks...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Selected Tasks
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Selected Tasks</DialogTitle>
                <DialogDescription>
                  You are about to create {selectedTasks.length} tasks for {entityName}. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[300px] overflow-y-auto my-4 border rounded-md p-2">
                <ul className="space-y-2">
                  {selectedTasks.map(index => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>{taskSuggestions[index].name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => document.querySelector('[aria-label="Close"]')?.dispatchEvent(new MouseEvent('click'))}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTasks}
                  disabled={createTasksMutation.isPending}
                >
                  {createTasksMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Tasks"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      )}
    </Card>
  );
}