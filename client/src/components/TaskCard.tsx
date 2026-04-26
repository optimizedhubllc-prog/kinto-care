import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCompletionConfirmDialog } from "@/components/TaskCompletionConfirmDialog";
import { format, formatDistance, isPast, parseISO } from "date-fns";
import React, { useState } from "react";

export interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  assignedTo?: {
    id: number;
    name: string;
    email: string;
  };
  dueDate?: string;
  canUpdate: boolean;
  onStatusChange?: (taskId: string, newStatus: "pending" | "in_progress" | "completed") => void;
  isUpdating?: boolean;
}

/**
 * TaskCard Component
 * Displays a single task with priority, status, assigned user, and due date.
 * Supports inline status updates for authorized users.
 *
 * Design Tokens:
 * - Priority colors: low (gray), medium (amber), high (#DC2626)
 * - Status badges: pending (blue), in_progress (amber), completed (green)
 * - Teal accent (#0D9488) for interactive elements
 */
export function TaskCard({
  id,
  title,
  description,
  priority,
  status,
  assignedTo,
  dueDate,
  canUpdate,
  onStatusChange,
  isUpdating = false,
}: TaskCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate relative due date
  const getDueDateDisplay = () => {
    if (!dueDate) return null;
    try {
      const date = parseISO(dueDate);
      const now = new Date();
      if (isPast(date) && status !== "completed") {
        const daysOverdue = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}`;
      }
      return `Due ${formatDistance(date, now, { addSuffix: true })}`;
    } catch {
      return format(parseISO(dueDate), "MMM d, yyyy");
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "pending":
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      case "pending":
        return "Pending";
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "completed" && status !== "completed") {
      // Show confirmation dialog for completion
      setIsCompletionDialogOpen(true);
      setIsOpen(false);
    } else if (newStatus !== status && onStatusChange) {
      // Direct status change for non-completion transitions
      onStatusChange(id, newStatus as "pending" | "in_progress" | "completed");
      setIsOpen(false);
    }
  };

  const handleConfirmCompletion = async (notes?: string) => {
    setIsSubmitting(true);
    try {
      if (onStatusChange) {
        await onStatusChange(id, "completed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow duration-200 border border-gray-200">
      <div className="space-y-3">
        {/* Title and Priority */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex-1 line-clamp-2">
            {title}
          </h3>
          <Badge variant="outline" className={`shrink-0 text-xs font-medium ${getPriorityColor()}`}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </Badge>
        </div>

        {/* Description */}
        {description && (
          <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
        )}

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          {/* Status Badge */}
          <Badge variant="outline" className={`${getStatusColor()} text-xs font-medium`}>
            {getStatusLabel()}
          </Badge>

          {/* Assigned To */}
          {assignedTo && (
            <span className="text-gray-600 px-2 py-1 bg-gray-50 rounded text-xs">
              {assignedTo.name}
            </span>
          )}

          {/* Due Date */}
          {dueDate && (
            <span className={`text-xs px-2 py-1 rounded ${
              isPast(parseISO(dueDate)) && status !== "completed"
                ? "bg-red-50 text-red-700"
                : "bg-gray-50 text-gray-600"
            }`}>
              {getDueDateDisplay()}
            </span>
          )}
        </div>

        {/* Status Update Control */}
        {canUpdate && (
          <div className="pt-2 border-t border-gray-100">
            <Select open={isOpen} onOpenChange={setIsOpen} value={status} onValueChange={handleStatusChange}>
              <SelectTrigger
                disabled={isUpdating}
                className="w-full h-8 text-xs sm:text-sm bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100"
              >
                <SelectValue placeholder="Update status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Task Completion Confirmation Dialog */}
      <TaskCompletionConfirmDialog
        open={isCompletionDialogOpen}
        onOpenChange={setIsCompletionDialogOpen}
        taskTitle={title}
        onConfirm={handleConfirmCompletion}
        isLoading={isSubmitting}
      />
    </Card>
  );
}
