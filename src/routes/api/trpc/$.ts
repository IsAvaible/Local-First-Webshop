import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "@/lib/trpc";
import { projectsRouter } from "@/lib/trpc/projects";
import { todosRouter } from "@/lib/trpc/todos";
import { usersRouter } from "@/lib/trpc/users";
import { db } from "@/db/connection";
import { auth } from "@/lib/auth";
import { cartsRouter } from "@/lib/trpc/carts.ts";
import { cartItemsRouter } from "@/lib/trpc/cartItems";
import { cartCollaboratorsRouter } from "@/lib/trpc/cartCollaborators";
import { cartItemTagsRouter } from "@/lib/trpc/cartItemTags.ts";
import { cartFoldersRouter } from "@/lib/trpc/cartFolders.ts";
import { cartTagsRouter } from "@/lib/trpc/cartTags.ts";

export const appRouter = router({
  projects: projectsRouter,
  todos: todosRouter,
  users: usersRouter,
  carts: cartsRouter,
  cartItems: cartItemsRouter,
  cartCollaborators: cartCollaboratorsRouter,
  cartFolders: cartFoldersRouter,
  cartTags: cartTagsRouter,
  cartItemTags: cartItemTagsRouter
});

export type AppRouter = typeof appRouter;

const serve = ({ request }: { request: Request }) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async () => ({
      db,
      session: await auth.api.getSession({ headers: request.headers })
    })
  });
};

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: serve,
      POST: serve
    }
  }
});
