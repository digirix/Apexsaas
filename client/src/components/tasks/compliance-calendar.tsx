import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Task, TaskStatus } from '@shared/schema';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, Clock4, CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskStatusWorkflow } from './task-status-workflow';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button as ShadButton } from '@/components/ui/button';

export function ComplianceCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [view, setView] = useState<'month' | 'list'>('month');
  
  // Calculate the first and last day of the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Generate an array of all days in the current month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Fetch all tasks
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['/api/v1/tasks'],
  });
  
  // Fetch task statuses to determine which tasks are completed
  const { data: taskStatuses = [] } = useQuery<TaskStatus[]>({
    queryKey: ['/api/v1/setup/task-statuses'],
  });
  
  // Filter compliance-related tasks (tasks with complianceFrequency set)
  const complianceTasks = tasks.filter(task => 
    !task.isAdmin && task.complianceFrequency
  );
  
  // Get the selected task when a task ID is set
  const selectedTask = selectedTaskId ? complianceTasks.find(task => task.id === selectedTaskId) : null;
  
  // Get the status for a task
  const getTaskStatus = (task: Task) => {
    const status = taskStatuses.find(s => s.id === task.statusId);
    return status;
  };
  
  // Format a date to show the day of month
  const formatDay = (date: Date) => {
    return format(date, 'd');
  };
  
  // Navigate to the previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // Navigate to the next month
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Navigate to today's month
  const goToToday = () => {
    setCurrentMonth(new Date());
  };
  
  // Check if a task is due on a specific day
  const isTaskDueOnDay = (task: Task, day: Date) => {
    if (!task.dueDate) return false;
    return isSameDay(new Date(task.dueDate), day);
  };
  
  // Get tasks due on a specific day
  const getTasksForDay = (day: Date) => {
    return complianceTasks.filter(task => isTaskDueOnDay(task, day));
  };
  
  // Calculate all tasks due in the current month
  const tasksInMonth = complianceTasks.filter(task => {
    const dueDate = new Date(task.dueDate);
    return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
  });
  
  // Handle clicking on a day
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };
  
  // Handle clicking on a task to view details
  const handleViewTaskDetails = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailsOpen(true);
  };
  
  // Sort tasks by due date
  const sortedTasks = [...tasksInMonth].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Compliance Calendar</h2>
          <p className="text-sm text-slate-500">
            Track compliance tasks and deadlines across all clients
          </p>
        </div>
        
        <div className="flex gap-4">
          <Tabs value={view} onValueChange={(value) => setView(value as 'month' | 'list')}>
            <TabsList>
              <TabsTrigger value="month">
                <Calendar className="h-4 w-4 mr-2" />
                Month View
              </TabsTrigger>
              <TabsTrigger value="list">
                <Clock4 className="h-4 w-4 mr-2" />
                List View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Calendar header with navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
              <CardDescription>
                {tasksInMonth.length} compliance tasks due this month
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>Today</Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {view === 'month' ? (
            <>
              {/* Calendar weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-xs font-semibold text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Generate empty cells for days before the start of month */}
                {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                  <div key={`empty-start-${index}`} className="h-24 p-1 bg-slate-50 rounded-md" />
                ))}
                
                {/* Days of the month */}
                {daysInMonth.map((day) => {
                  const tasksForDay = getTasksForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  
                  return (
                    <div
                      key={day.toString()}
                      className={`h-24 p-1 rounded-md border border-slate-200 relative overflow-hidden ${
                        isToday ? 'bg-blue-50' : 'bg-white'
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => handleDayClick(day)}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''} p-1`}>
                        {formatDay(day)}
                      </div>
                      
                      <div className="space-y-1 mt-1 overflow-y-auto max-h-[72px]">
                        {tasksForDay.map((task) => {
                          const status = getTaskStatus(task);
                          
                          let statusColor = "bg-slate-100 text-slate-800";
                          if (status?.rank === 3) {
                            statusColor = "bg-green-100 text-green-800";
                          } else if (new Date(task.dueDate) < new Date()) {
                            statusColor = "bg-red-100 text-red-800";
                          } else if (status?.rank === 1) {
                            statusColor = "bg-blue-100 text-blue-800";
                          } else if (status?.rank && Math.floor(status.rank) === 2) {
                            statusColor = "bg-yellow-100 text-yellow-800";
                          }
                          
                          return (
                            <div
                              key={task.id}
                              className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer ${statusColor}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTaskDetails(task.id);
                              }}
                            >
                              {task.taskDetails?.substring(0, 30) || `Task #${task.id}`}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {/* Generate empty cells for days after the end of month */}
                {Array.from({ length: 6 - monthEnd.getDay() }).map((_, index) => (
                  <div key={`empty-end-${index}`} className="h-24 p-1 bg-slate-50 rounded-md" />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Compliance tasks list */}
                <Card className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Upcoming Compliance Tasks</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      {sortedTasks.length === 0 ? (
                        <div className="py-8 text-center text-slate-500">
                          <Info className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                          <p>No compliance tasks due this month</p>
                        </div>
                      ) : (
                        <div className="space-y-0 divide-y">
                          {sortedTasks.map((task) => {
                            const status = getTaskStatus(task);
                            const isDue = new Date(task.dueDate) < new Date() && status?.rank !== 3;
                            
                            return (
                              <div
                                key={task.id}
                                className="p-3 hover:bg-slate-50 cursor-pointer"
                                onClick={() => handleViewTaskDetails(task.id)}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <div className="text-sm font-medium">
                                    {task.taskDetails || `Task #${task.id}`}
                                  </div>
                                  <div>
                                    {task.statusId && (
                                      <TaskStatusWorkflow
                                        taskId={task.id}
                                        currentStatusId={task.statusId}
                                        variant="icon"
                                        size="sm"
                                      />
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                  {isDue && (
                                    <Badge variant="destructive" className="ml-2 text-[10px]">
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Frequency: {task.complianceFrequency}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Compliance statistics */}
                <Card className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Compliance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-md p-3">
                          <div className="text-xs text-blue-500 font-medium mb-1">Total Tasks</div>
                          <div className="text-2xl font-bold">{complianceTasks.length}</div>
                        </div>
                        <div className="bg-yellow-50 rounded-md p-3">
                          <div className="text-xs text-yellow-500 font-medium mb-1">Due This Month</div>
                          <div className="text-2xl font-bold">{tasksInMonth.length}</div>
                        </div>
                        <div className="bg-red-50 rounded-md p-3">
                          <div className="text-xs text-red-500 font-medium mb-1">Overdue</div>
                          <div className="text-2xl font-bold">
                            {complianceTasks.filter(t => 
                              new Date(t.dueDate) < new Date() && 
                              getTaskStatus(t)?.rank !== 3
                            ).length}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-md p-3">
                          <div className="text-xs text-green-500 font-medium mb-1">Completed</div>
                          <div className="text-2xl font-bold">
                            {complianceTasks.filter(t => getTaskStatus(t)?.rank === 3).length}
                          </div>
                        </div>
                      </div>
                      
                      {/* Compliance types */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Compliance Types</h4>
                        <div className="space-y-2">
                          {Array.from(new Set(complianceTasks.map(t => t.complianceFrequency))).filter(Boolean).map((frequency) => {
                            const count = complianceTasks.filter(t => t.complianceFrequency === frequency).length;
                            return (
                              <div key={frequency} className="flex justify-between items-center text-sm">
                                <div>{frequency}</div>
                                <Badge variant="outline">{count}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Task details sheet */}
      <Sheet open={isTaskDetailsOpen} onOpenChange={setIsTaskDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Compliance Task Details</SheetTitle>
            <SheetDescription>
              View and manage compliance task information
            </SheetDescription>
          </SheetHeader>
          
          {selectedTask ? (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedTask.taskDetails}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedTask.statusId && (
                    <TaskStatusWorkflow 
                      taskId={selectedTask.id} 
                      currentStatusId={selectedTask.statusId} 
                      variant="icon"
                    />
                  )}
                  <Badge variant="outline">{selectedTask.taskType}</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 mt-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Due Date</p>
                    <p>{format(new Date(selectedTask.dueDate), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Frequency</p>
                    <p>{selectedTask.complianceFrequency}</p>
                  </div>
                  {selectedTask.complianceStartDate && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Start Date</p>
                      <p>{format(new Date(selectedTask.complianceStartDate), 'PPP')}</p>
                    </div>
                  )}
                  {selectedTask.complianceEndDate && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">End Date</p>
                      <p>{format(new Date(selectedTask.complianceEndDate), 'PPP')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-500">Recurring</p>
                    <p>{selectedTask.isRecurring ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Task Status</p>
                  <div className="mt-2">
                    {selectedTask.statusId && (
                      <TaskStatusWorkflow 
                        taskId={selectedTask.id} 
                        currentStatusId={selectedTask.statusId} 
                      />
                    )}
                  </div>
                </div>
                
                <SheetClose asChild>
                  <ShadButton variant="outline">Close</ShadButton>
                </SheetClose>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <p>Select a task to view details</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}