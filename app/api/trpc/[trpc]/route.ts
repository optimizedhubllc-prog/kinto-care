import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers";
import { createTrpcContext } from "@/lib/trpc/server";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTrpcContext({ req }),
    onError: ({ path, error }) => {
      if (process.env.NODE_ENV === "development") {
        console.error(`[tRPC Error] ${path}: ${error.message}`);
      }
    },
  });

export { handler as GET, handler as POST };
