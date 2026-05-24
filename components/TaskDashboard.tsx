import { TaskCard } from "@/components/TaskCard";
import { TaskFilters } from "@/components/TaskFilters";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, CheckCircle2, Clock, Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "@/contexts/LanguageContext";

/**
 * TaskDashboard Component
 * Primary interface for viewing and managing care tasks.
 *
 * Features:
 * - Fetches tasks via tRPC procedures
 * - Real-time updates via EventBus subscriptions
 * - Mobile-first responsive design
 * - Filtering by status, priority, and assignment
 * - Inline status updates
 *
 * Design Tokens:
 * - Red #DC2626 (high priority, errors)
 * - Teal #0D9488 (primary actions)
 * - Linen #FDF8F2 (backgrounds)
 * - Navy #1A2B3C (text)
 *
 * Note: Uses hardcoded hub ID from seeded Jaquez family hub.
 * In production, this would be fetched from user's hub membership.
 */
export function TaskDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<"pending" | "in_progress" | "completed" | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<"low" | "medium" | "high" | "all">("all");
  const [assignedToFilter, setAssignedToFilter] = useState<number | "unassigned" | "all">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Use hardcoded hub ID from seeded Jaquez family hub
  const JAQUEZ_HUB_ID = "d7dd12a1-ed80-4429-96fd-cf5d7fc16c0e";

  // Fetch tasks based on status filter
  const { data: tasksData, isLoading, error } = trpc.tasks.list.useQuery(
    {
      hubId: JAQUEZ_HUB_ID,
      status: statusFilter !== "all" ? (statusFilter as "pending" | "in_progress" | "completed") : undefined,
    },
    {
      enabled: !!user?.id,
    }
  );

  // Extract tasks array from response
  const tasks = tasksData?.tasks || [];

  // Update task status mutation
  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      // Invalidate tasks list to refresh
      trpc.useUtils().tasks.list.invalidate();
    },
  });

  // Get all users for the assigned to filter and modal
  const { data: allUsers } = trpc.users.getByRoleWithApiKey.useQuery(
    {
      roleFilter: ["family_admin", "family_member", "caregiver"],
    },
    {
      enabled: user?.role === "admin",
    }
  );

  // Real-time sync: Subscribe to task events for live updates
  const { data: taskEventData, status: subscriptionStatus } = trpc.tasks.onTaskEvent.useSubscription(
    {
      hubId: JAQUEZ_HUB_ID,
    },
    {
      onData: (event: any) => {
        // Silently refresh task list when events arrive
        if (event.type !== "heartbeat") {
          console.log("Task event received:", event.type);
          trpc.useUtils().tasks.list.invalidate();
        }
      },
      onError: (error) => {
        console.error("Subscription error:", error);
      },
    }
  );

  // Fallback to manual refresh if subscription fails
  const handleManualRefresh = useCallback(() => {
    trpc.useUtils().tasks.list.invalidate();
    console.log("Manual refresh triggered");
  }, []);

  // Filter tasks by priority and assigned user
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task: any) => {
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      if (assignedToFilter !== "all") {
        if (assignedToFilter === "unassigned" && task.assignedTo !== null) {
          return false;
        }
        if (typeof assignedToFilter === "number" && task.assignedTo?.id !== assignedToFilter) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, priorityFilter, assignedToFilter]);

  // Group tasks by status for display
  const tasksByStatus = useMemo(() => {
    const grouped: { [key: string]: any[] } = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    filteredTasks.forEach((task: any) => {
      const status = task.status as keyof typeof grouped;
      if (status in grouped) {
        grouped[status].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  const handleStatusChange = async (taskId: string, newStatus: "pending" | "in_progress" | "completed") => {
    await updateTaskMutation.mutateAsync({
      taskId,
      status: newStatus,
    });
  };

  const canUpdateTask = (task: any) => {
    if (user?.role === "admin") return true;
    const assignedUserId = task.assignedTo?.id || task.assignedTo;
    if (user?.id && assignedUserId === user.id) return true;
    return false;
  };

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-screen bg-linen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold">{t('tasks.notAuthenticated')}</p>
          <p className="text-gray-600 text-sm">{t('tasks.pleaseLogin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-navy font-playfair">
                {t('tasks.title')}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {user?.role === "admin" && t('tasks.manageAllTasks')}
                {user?.role === "user" && t('tasks.viewAssignedTasks')}
              </p>
            </div>
            <div className="flex gap-2">
              {(user?.role === "admin" || user?.role === "user") && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('tasks.newTask')}</span>
                  <span className="sm:hidden">+</span>
                </Button>
              )}
              {subscriptionStatus === "error" && (
                <Button
                  onClick={handleManualRefresh}
                  variant="outline"
                  className="h-10 px-4 text-sm"
                  title="Connection lost - click to refresh"
                >
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <TaskFilters
        status={statusFilter}
        priority={priorityFilter}
        assignedTo={assignedToFilter}
        onStatusChange={(s) => setStatusFilter(s as any)}
        onPriorityChange={(p) => setPriorityFilter(p as any)}
        onAssignedToChange={(a) => setAssignedToFilter(a === "all" ? "all" : a === "unassigned" ? "unassigned" : parseInt(a))}
        showUnassignedFilter={user?.role === "admin"}
        users={(allUsers?.users || []).map((u: any) => ({ id: u.id, name: u.name || "Unknown" }))}
      />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error loading tasks</h3>
                <p className="text-red-700 text-sm">{error?.message}</p>
              </div>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold">No tasks found</p>
            <p className="text-gray-600 text-sm">
              {statusFilter === "completed" ? "Great job! No completed tasks yet." : "No tasks match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending Tasks */}
            {tasksByStatus.pending.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending ({tasksByStatus.pending.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasksByStatus.pending.map((task: any) => (
                    <TaskCard
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      priority={task.priority}
                      status={task.status}
                      assignedTo={task.assignedTo}
                      dueDate={task.dueDate}
                      canUpdate={canUpdateTask(task)}
                      onStatusChange={handleStatusChange}
                      isUpdating={updateTaskMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* In Progress Tasks */}
            {tasksByStatus.in_progress.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    In Progress ({tasksByStatus.in_progress.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasksByStatus.in_progress.map((task: any) => (
                    <TaskCard
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      priority={task.priority}
                      status={task.status}
                      assignedTo={task.assignedTo}
                      dueDate={task.dueDate}
                      canUpdate={canUpdateTask(task)}
                      onStatusChange={handleStatusChange}
                      isUpdating={updateTaskMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Tasks */}
            {tasksByStatus.completed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Completed ({tasksByStatus.completed.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasksByStatus.completed.map((task: any) => (
                    <TaskCard
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      priority={task.priority}
                      status={task.status}
                      assignedTo={task.assignedTo}
                      dueDate={task.dueDate}
                      canUpdate={canUpdateTask(task)}
                      onStatusChange={handleStatusChange}
                      isUpdating={updateTaskMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-600">
          <p>Kinto Care is a logistics and data coordination tool. No medical diagnosis provided.</p>
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskCreateModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        hubId={JAQUEZ_HUB_ID}
        onTaskCreated={() => {
          // Refresh task list after creation
          trpc.useUtils().tasks.list.invalidate();
        }}
        users={(allUsers?.users || []).map((u: any) => ({ id: u.id, name: u.name || "Unknown" }))}
      />
    </div>
  );
}
