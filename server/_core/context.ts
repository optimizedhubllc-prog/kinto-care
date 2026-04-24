import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { validateApiKey } from "../apiKeyAuth";

export type ApiKeyContext = {
  hubId: string;
  permissions: string[];
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  apiKey?: ApiKeyContext; // For external service access
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let apiKey: ApiKeyContext | undefined = undefined;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Check for API key in Authorization header
  if (!user) {
    const authHeader = opts.req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const key = authHeader.substring(7);
      const validated = await validateApiKey(key);
      if (validated) {
        apiKey = validated;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    apiKey,
  };
}
