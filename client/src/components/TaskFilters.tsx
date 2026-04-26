import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from "react";

export interface TaskFiltersProps {
  status?: "pending" | "in_progress" | "completed" | "all";
  priority?: "low" | "medium" | "high" | "all";
  assignedTo?: number | "unassigned" | "all";
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
  onAssignedToChange?: (assignedTo: string) => void;
  showUnassignedFilter?: boolean;
  users?: Array<{ id: number; name: string }>;
}

/**
 * TaskFilters Component
 * Provides filtering controls for tasks by status, priority, and assignment.
 * Mobile-first design with responsive layout.
 *
 * Features:
 * - Status filter: pending, in_progress, completed, all
 * - Priority filter: low, medium, high, all
 * - Assigned to filter: specific user, unassigned, all
 * - Role-aware: family_admin sees unassigned filter
 */
export function TaskFilters({
  status = "all",
  priority = "all",
  assignedTo = "all",
  onStatusChange,
  onPriorityChange,
  onAssignedToChange,
  showUnassignedFilter = false,
  users = [],
}: TaskFiltersProps) {
  return (
    <div className="space-y-3 p-4 bg-white border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">Filters</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Status</label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 text-xs bg-gray-50 border-gray-200">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Priority</label>
          <Select value={priority} onValueChange={onPriorityChange}>
            <SelectTrigger className="h-8 text-xs bg-gray-50 border-gray-200">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assigned To Filter */}
        {(showUnassignedFilter || users.length > 0) && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Assigned To</label>
            <Select value={assignedTo?.toString() || "all"} onValueChange={onAssignedToChange}>
              <SelectTrigger className="h-8 text-xs bg-gray-50 border-gray-200">
                <SelectValue placeholder="All assignments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignments</SelectItem>
                {showUnassignedFilter && <SelectItem value="unassigned">Unassigned</SelectItem>}
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
