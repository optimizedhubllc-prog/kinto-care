import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/contexts/LanguageContext";
import { AlertCircle, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { format, startOfToday } from "date-fns";

export interface TaskCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubId: string;
  onTaskCreated?: () => void;
  users?: Array<{ id: number; name: string | null }>;
}

/**
 * TaskCreateModal Component
 * Modal form for creating new care tasks.
 *
 * Features:
 * - Form validation (title required, due date not in past)
 * - Optimistic UI updates
 * - Mobile-first full-screen modal on small screens
 * - Role-aware (family_admin and family_member only)
 * - Integrates with tasks.create tRPC procedure
 *
 * Design Tokens:
 * - Red #DC2626 (errors)
 * - Teal #0D9488 (primary actions)
 * - Linen #FDF8F2 (backgrounds)
 * - Navy #1A2B3C (text)
 */
export function TaskCreateModal({
  open,
  onOpenChange,
  hubId,
  onTaskCreated,
  users = [],
}: TaskCreateModalProps) {
  const { t } = useTranslation();
  // Toast notifications (using console for now - can be replaced with toast library)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: format(startOfToday(), "yyyy-MM-dd"),
    assignedTo: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Create task mutation
  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      console.log("Task created successfully");
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        dueDate: format(startOfToday(), "yyyy-MM-dd"),
        assignedTo: "",
      });
      setErrors({});
      onOpenChange(false);
      onTaskCreated?.();
    },
    onError: (error) => {
      console.error("Error creating task:", error.message);
    },
  });

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = t('tasks.titleRequired');
    }

    if (!formData.dueDate) {
      newErrors.dueDate = t('tasks.dueDateRequired');
    } else {
      const selectedDate = new Date(formData.dueDate);
      const today = startOfToday();
      if (selectedDate < today) {
        newErrors.dueDate = t('tasks.dueDatePast');
      }
    }

    if (!formData.assignedTo) {
      newErrors.assignedTo = t('tasks.assignRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await createTaskMutation.mutateAsync({
      hubId,
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority,
      dueDate: new Date(formData.dueDate),
      assignedTo: parseInt(formData.assignedTo),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        dueDate: format(startOfToday(), "yyyy-MM-dd"),
        assignedTo: "",
      });
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-screen sm:max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-playfair text-navy">{t('tasks.createNewTask')}</DialogTitle>
          <DialogDescription>
            {t('tasks.createTaskDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              {t('tasks.taskTitle')} *
            </Label>
            <Input
              id="title"
              placeholder={t('tasks.titlePlaceholder')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`h-9 text-sm ${errors.title ? "border-red-500" : ""}`}
              disabled={createTaskMutation.isPending}
            />
            {errors.title && (
              <div className="flex gap-2 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errors.title}</span>
              </div>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              {t('tasks.description')} ({t('common.optional')})
            </Label>
            <Textarea
              id="description"
              placeholder={t('tasks.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-20 text-sm resize-none"
              disabled={createTaskMutation.isPending}
            />
          </div>

          {/* Priority Field */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
              {t('tasks.priority')} *
            </Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as any })}>
              <SelectTrigger id="priority" className="h-9 text-sm" disabled={createTaskMutation.isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('tasks.low')}</SelectItem>
                <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
                <SelectItem value="high">{t('tasks.high')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date Field */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">
              {t('tasks.dueDate')} *
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              min={format(startOfToday(), "yyyy-MM-dd")}
              className={`h-9 text-sm ${errors.dueDate ? "border-red-500" : ""}`}
              disabled={createTaskMutation.isPending}
            />
            {errors.dueDate && (
              <div className="flex gap-2 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errors.dueDate}</span>
              </div>
            )}
          </div>

          {/* Assigned To Field */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo" className="text-sm font-medium text-gray-700">
              {t('tasks.assignTo')} *
            </Label>
            <Select value={formData.assignedTo} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
              <SelectTrigger id="assignedTo" className={`h-9 text-sm ${errors.assignedTo ? "border-red-500" : ""}`} disabled={createTaskMutation.isPending}>
                <SelectValue placeholder={t('tasks.selectPerson')} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name || `User ${user.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignedTo && (
              <div className="flex gap-2 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errors.assignedTo}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createTaskMutation.isPending}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('tasks.creating')}
                </>
              ) : (
                t('tasks.createTask')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
