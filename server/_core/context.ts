import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";
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
  opts: CreateExpressContextOptions | CreateWSSContextFnOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let apiKey: ApiKeyContext | undefined = undefined;
  const req = opts.req as any;

  try {
    user = await sdk.authenticateRequest(req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Check for API key in Authorization header
  if (!user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const key = authHeader.substring(7);
      const validated = await validateApiKey(key);
      if (validated) {
        apiKey = validated;
      }
    }
  }

  return {
    req: req as any,
    res: (opts as CreateExpressContextOptions).res || undefined,
    user,
    apiKey,
  };
}
