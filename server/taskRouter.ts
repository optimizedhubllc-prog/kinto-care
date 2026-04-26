import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb, getUserRoleInHub } from "./db";
import { tasks, hubMembers } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import eventBus from "./_core/eventBus";
import crypto from "crypto";

/**
 * Task Management Router
 * 
 * Provides tRPC procedures for creating, updating, assigning, and listing tasks.
 * All procedures integrate with EventBus to fire webhook events for n8n integration.
 * 
 * Trust Pillar: Tasks contain ONLY logistics and coordination data.
 * No clinical, diagnostic, or medical information is stored.
 */

// ============================================================================
// Input Validation Schemas
// ============================================================================

const createTaskSchema = z.object({
  hubId: z.string().uuid("Invalid hub ID"),
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  dueDate: z.date().optional(),
  assignedTo: z.number().int().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

const updateTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
});

const assignTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  assignedTo: z.number().int("Invalid user ID"),
});

const listTasksSchema = z.object({
  hubId: z.string().uuid("Invalid hub ID"),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// tRPC Procedures
// ============================================================================

export const taskRouter = router({
  /**
   * tasks.create
   * 
   * Create a new task in a hub.
   * Fires webhook event: task.created
   * 
   * RBAC: family_admin, family_member
   */
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify user can create tasks in this hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (!role || !["family_admin", "family_viewer"].includes(role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only family admins and viewers can create tasks",
        });
      }

      // Create the task
      const taskId = crypto.randomUUID();
      await db.insert(tasks).values({
        id: taskId,
        hubId: input.hubId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        assignedTo: input.assignedTo || null,
        createdBy: ctx.user.id,
        priority: input.priority,
        status: "pending",
      });

      const taskRows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      const task = taskRows[0] || null;

      if (!task) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create task",
        });
      }

      // Fire webhook event
      eventBus.emit("task.created", {
        hub_id: input.hubId,
        event_type: "task.created",
        task_id: task.id,
        task_title: task.title,
        assigned_to: task.assignedTo,
        priority: task.priority,
        timestamp: new Date().toISOString(),
      });

      return task;
    }),

  /**
   * tasks.update
   * 
   * Update a task's status.
   * Fires webhook event: task.updated when status changes
   * 
   * RBAC: family_admin (any task), family_member/caregiver (assigned tasks only)
   */
  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get the task
      const taskRows = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      const task = taskRows[0] || null;

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Verify user can update this task
      const role = await getUserRoleInHub(ctx.user.id, task.hubId);

      // family_admin can update any task
      if (role !== "family_admin") {
        // Others can only update tasks assigned to them
        if (task.assignedTo !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update tasks assigned to you",
          });
        }
      }

      // Validate status transitions if provided
      if (input.status) {
        const validTransitions: Record<string, string[]> = {
          pending: ["in_progress", "completed"],
          in_progress: ["completed", "pending"],
          completed: ["pending"],
        };

        if (!validTransitions[task.status]?.includes(input.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot transition from ${task.status} to ${input.status}`,
          });
        }
      }

      // Update the task
      if (input.status) {
        await db
          .update(tasks)
          .set({ status: input.status })
          .where(eq(tasks.id, input.taskId));
      }

      const updatedRows = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      const updated = updatedRows[0] || null;

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update task",
        });
      }

      // Fire webhook event if status changed
      if (input.status && input.status !== task.status) {
        eventBus.emit("task.updated", {
          hub_id: task.hubId,
          event_type: "task.updated",
          task_id: task.id,
          task_title: task.title,
          old_status: task.status,
          new_status: input.status,
          timestamp: new Date().toISOString(),
        });
      }

      return updated;
    }),

  /**
   * tasks.assign
   * 
   * Assign a task to a user.
   * Fires webhook event: task.assigned
   * 
   * RBAC: family_admin only
   */
  assign: protectedProcedure
    .input(assignTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get the task
      const taskRows = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      const task = taskRows[0] || null;

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // Verify user can assign tasks (family_admin only)
      const role = await getUserRoleInHub(ctx.user.id, task.hubId);
      if (role !== "family_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only family admins can assign tasks",
        });
      }

      // Verify assignee is a member of the hub
      const assigneeRows = await db.select().from(hubMembers).where(and(
        eq(hubMembers.userId, input.assignedTo),
        eq(hubMembers.hubId, task.hubId)
      )).limit(1);
      const assignee = assigneeRows[0] || null;

      if (!assignee) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assignee is not a member of this hub",
        });
      }

      // Update the task
      await db
        .update(tasks)
        .set({ assignedTo: input.assignedTo })
        .where(eq(tasks.id, input.taskId));

      const updatedRows = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      const updated = updatedRows[0] || null;

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign task",
        });
      }

      // Fire webhook event
      eventBus.emit("task.assigned", {
        hub_id: task.hubId,
        event_type: "task.assigned",
        task_id: task.id,
        task_title: task.title,
        assigned_to: input.assignedTo,
        timestamp: new Date().toISOString(),
      });

      return updated;
    }),

  /**
   * tasks.list
   * 
   * List tasks in a hub with role-based filtering.
   * 
   * RBAC:
   * - family_admin: sees all tasks
   * - family_member/caregiver: sees only tasks assigned to them
   */
  list: protectedProcedure
    .input(listTasksSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify user has access to hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);

      // Build where clause based on role
      const whereConditions: any[] = [eq(tasks.hubId, input.hubId)];

      // Non-admin users only see tasks assigned to them
      if (role !== "family_admin") {
        whereConditions.push(eq(tasks.assignedTo, ctx.user.id));
      }

      // Filter by status if provided
      if (input.status) {
        whereConditions.push(eq(tasks.status, input.status));
      }

      // Query with pagination
      const taskList = await db.select().from(tasks).where(and(...whereConditions)).limit(input.limit).offset(input.offset);

      // Get total count for pagination
      const countResult = await db.select().from(tasks).where(and(...whereConditions));

      return {
        tasks: taskList,
        total: countResult.length,
        limit: input.limit,
        offset: input.offset,
      };
    }),
});
