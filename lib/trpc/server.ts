import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { validateApiKey } from "@/server/apiKeyAuth";

export type TrpcContext = {
  userId: string | null;
  user: typeof users.$inferSelect | null;
  apiKey?: { hubId: string; permissions: string[] };
};

export async function createTrpcContext(opts: { req: Request }): Promise<TrpcContext> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let user: typeof users.$inferSelect | null = null;
  let apiKey: { hubId: string; permissions: string[] } | undefined;

  if (authUser) {
    const result = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
    user = result[0] ?? null;
  } else {
    // Check for API key auth (n8n, external services)
    const authHeader = opts.req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const key = authHeader.substring(7);
      const validated = await validateApiKey(key);
      if (validated) apiKey = validated;
    }
  }

  return { userId: authUser?.id ?? null, user, apiKey };
}

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in." });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const requireApiKey = t.middleware(({ ctx, next }) => {
  if (!ctx.apiKey) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or missing API key." });
  return next({ ctx: { ...ctx, apiKey: ctx.apiKey } });
});

export const protectedProcedure = t.procedure.use(requireUser);
export const apiKeyProcedure = t.procedure.use(requireApiKey);
export const adminProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.user || ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);
