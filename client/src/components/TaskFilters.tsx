import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from "react";
import { useTranslation } from "@/contexts/LanguageContext";

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
  const { t } = useTranslation();
  return (
    <div className="space-y-3 p-4 bg-white border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">{t('common.filters')}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">{t('tasks.status')}</label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 text-xs bg-gray-50 border-gray-200">
              <SelectValue placeholder={t('tasks.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('tasks.pending')}</SelectItem>
              <SelectItem value="in_progress">{t('tasks.inProgress')}</SelectItem>
              <SelectItem value="completed">{t('tasks.completed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">{t('tasks.priority')}</label>
          <Select value={priority} onValueChange={onPriorityChange}>
            <SelectTrigger className="h-8 text-xs bg-gray-50 border-gray-200">
              <SelectValue placeholder={t('tasks.allPriorities')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
              <SelectItem value="low">{t('tasks.low')}</SelectItem>
              <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
              <SelectItem value="high">{t('tasks.high')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assigned To Filter */}
        {(showUnassignedFilter || users.length > 0) && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">{t('tasks.assignedTo')}</label>
            <Select value={assignedTo?.toString() || "all"} onValueChange={onAssignedToChange}>
              <SelectTrigger className="h-8 text-xs bg-gray-50 border-gray-200">
                <SelectValue placeholder={t('tasks.allAssignments')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allAssignments')}</SelectItem>
                {showUnassignedFilter && <SelectItem value="unassigned">{t('tasks.unassigned')}</SelectItem>}
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
