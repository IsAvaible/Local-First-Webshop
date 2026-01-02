import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "@/lib/trpc";
import { projectsRouter } from "@/lib/trpc/projects";
import { todosRouter } from "@/lib/trpc/todos";
import { usersRouter } from "@/lib/trpc/users";
import { db } from "@/db/connection";
import { auth } from "@/lib/auth";
import { cartsRouter } from "@/lib/trpc/carts.ts";
import { cartCollaboratorsRouter } from "@/lib/trpc/cartCollaborators";
import { addressesRouter } from "@/lib/trpc/addresses";
import { userSelectedCartRouter } from "@/lib/trpc/user-selected-cart";
import { ordersRouter } from "@/lib/trpc/orders";
import { userSettingsRouter } from "@/lib/trpc/user-settings.ts";
import { wishlistRouter } from "@/lib/trpc/wishlist";

export const appRouter = router({
  projects: projectsRouter,
  todos: todosRouter,
  users: usersRouter,
  carts: cartsRouter,
  cartCollaborators: cartCollaboratorsRouter,
  userSettings: userSettingsRouter,
  addresses: addressesRouter,
  userSelectedCart: userSelectedCartRouter,
  orders: ordersRouter,
  wishlist: wishlistRouter
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
