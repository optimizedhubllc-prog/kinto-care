import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { patientHubs, hubMembers, users, tasks } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Task Management API", () => {
  let db: any;
  let hubId: string;
  let adminUserId: number;
  let memberUserId: number;
  let caregiverUserId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test users with unique openIds (timestamp + random)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    const adminResult = await db
      .insert(users)
      .values({ openId: `admin-test-${timestamp}-${random}`, name: "Admin User", role: "user" });
    const memberResult = await db
      .insert(users)
      .values({ openId: `member-test-${timestamp}-${random}`, name: "Member User", role: "user" });
    const caregiverResult = await db
      .insert(users)
      .values({ openId: `caregiver-test-${timestamp}-${random}`, name: "Caregiver User", role: "user" });

    adminUserId = adminResult[0].insertId;
    memberUserId = memberResult[0].insertId;
    caregiverUserId = caregiverResult[0].insertId;

    // Create test hub
    const hubResult = await db
      .insert(patientHubs)
      .values({ patientName: "Test Patient", createdBy: adminUserId });

    // Get the actual hubId from the inserted row (get the last inserted ID)
    const allHubs = await db.select().from(patientHubs).where(eq(patientHubs.createdBy, adminUserId));
    hubId = allHubs[allHubs.length - 1].id;

    // Add members to hub
    await db.insert(hubMembers).values({
      hubId,
      userId: adminUserId,
      role: "family_admin",
    } as any);
    await db.insert(hubMembers).values({
      hubId,
      userId: memberUserId,
      role: "family_viewer",
    } as any);
    await db.insert(hubMembers).values({
      hubId,
      userId: caregiverUserId,
      role: "caregiver",
    } as any);
  });

  afterAll(async () => {
    if (!db) return;
    // Cleanup in correct order (respect foreign keys)
    try {
      // Delete tasks first
      await db.delete(tasks).where(eq(tasks.hubId, hubId));
      // Delete hub members
      await db.delete(hubMembers).where(eq(hubMembers.hubId, hubId));
      // Delete hub
      await db.delete(patientHubs).where(eq(patientHubs.id, hubId));
      // Delete users (should be safe now that hub is deleted)
      await db.delete(users).where(eq(users.id, adminUserId));
      await db.delete(users).where(eq(users.id, memberUserId));
      await db.delete(users).where(eq(users.id, caregiverUserId));
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });

  describe("tasks.create", () => {
    it("family_admin can create a task", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.create({
        hubId,
        title: "Test Task",
        description: "Test Description",
        priority: "high",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Test Task");
      expect(result.status).toBe("pending");
      expect(result.priority).toBe("high");
    });

    it("family_member can create a task", async () => {
      const caller = appRouter.createCaller({
        user: { id: memberUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.create({
        hubId,
        title: "Member Task",
        priority: "medium",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Member Task");
    });

    it("caregiver cannot create a task", async () => {
      const caller = appRouter.createCaller({
        user: { id: caregiverUserId },
        req: {},
        res: {},
      });

      try {
        await caller.tasks.create({
          hubId,
          title: "Caregiver Task",
          priority: "low",
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("tasks.update", () => {
    let taskId: string;

    beforeAll(async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      const task = await caller.tasks.create({
        hubId,
        title: "Update Test Task",
        priority: "medium",
        assignedTo: memberUserId,
      });
      taskId = task.id;
    });

    it("family_admin can update any task status", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.update({
        taskId,
        status: "in_progress",
      });

      expect(result.status).toBe("in_progress");
    });

    it("assigned user can update their task status", async () => {
      const caller = appRouter.createCaller({
        user: { id: memberUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.update({
        taskId,
        status: "completed",
      });

      expect(result.status).toBe("completed");
    });

    it("non-assigned user cannot update task", async () => {
      const caller = appRouter.createCaller({
        user: { id: caregiverUserId },
        req: {},
        res: {},
      });

      try {
        await caller.tasks.update({
          taskId,
          status: "pending",
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("validates status transitions", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      // Current status is "completed", cannot go to "in_progress"
      try {
        await caller.tasks.update({
          taskId,
          status: "in_progress",
        });
        expect.fail("Should have thrown BAD_REQUEST error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("tasks.assign", () => {
    let taskId: string;

    beforeAll(async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      const task = await caller.tasks.create({
        hubId,
        title: "Assign Test Task",
        priority: "low",
      });
      taskId = task.id;
    });

    it("family_admin can assign task", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.assign({
        taskId,
        assignedTo: caregiverUserId,
      });

      expect(result.assignedTo).toBe(caregiverUserId);
    });

    it("family_member cannot assign task", async () => {
      const caller = appRouter.createCaller({
        user: { id: memberUserId },
        req: {},
        res: {},
      });

      try {
        await caller.tasks.assign({
          taskId,
          assignedTo: memberUserId,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("cannot assign to non-member", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      try {
        await caller.tasks.assign({
          taskId,
          assignedTo: 99999, // Non-existent user
        });
        expect.fail("Should have thrown BAD_REQUEST error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("tasks.list", () => {
    beforeAll(async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      // Create multiple tasks
      await caller.tasks.create({
        hubId,
        title: "Task 1",
        priority: "high",
        assignedTo: memberUserId,
      });

      await caller.tasks.create({
        hubId,
        title: "Task 2",
        priority: "medium",
        assignedTo: caregiverUserId,
      });

      await caller.tasks.create({
        hubId,
        title: "Task 3",
        priority: "low",
      });
    });

    it("family_admin sees all tasks", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.list({
        hubId,
      });

      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it("family_member sees only assigned tasks", async () => {
      const caller = appRouter.createCaller({
        user: { id: memberUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.list({
        hubId,
      });

      // Should only see tasks assigned to them
      result.tasks.forEach((task: any) => {
        expect(task.assignedTo).toBe(memberUserId);
      });
    });

    it("caregiver sees only assigned tasks", async () => {
      const caller = appRouter.createCaller({
        user: { id: caregiverUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.list({
        hubId,
      });

      // Should only see tasks assigned to them
      result.tasks.forEach((task: any) => {
        expect(task.assignedTo).toBe(caregiverUserId);
      });
    });

    it("filters by status", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId },
        req: {},
        res: {},
      });

      const result = await caller.tasks.list({
        hubId,
        status: "pending",
      });

      result.tasks.forEach((task: any) => {
        expect(task.status).toBe("pending");
      });
    });
  });

  describe("RBAC - Unauthorized Access", () => {
    it("user without hub access cannot create task", async () => {
      // Create a new user not in the hub with unique openId
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      
      const newUserResult = await db
        .insert(users)
        .values({ openId: `outsider-test-${timestamp}-${random}`, name: "Outsider", role: "user" });
      const newUserId = newUserResult[0].insertId;

      const caller = appRouter.createCaller({
        user: { id: newUserId },
        req: {},
        res: {},
      });

      try {
        await caller.tasks.create({
          hubId,
          title: "Unauthorized Task",
          priority: "high",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toMatch(/FORBIDDEN|NOT_FOUND/);
      }

      // Cleanup
      await db.delete(users).where(eq(users.id, newUserId));
    });
  });
});
