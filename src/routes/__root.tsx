import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  ClientOnly
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import * as React from "react";
import appCss from "@/index.css?url";
import { seo } from "@/utils/seo.ts";
import { DefaultCatchBoundary } from "@/components/routing/DefaultCatchBoundary.tsx";
import { NotFound } from "@/components/routing/NotFound.tsx";
import Header from "@/components/layout/Header/Header.tsx";
import Footer from "@/components/layout/Footer/Footer.tsx";
import { CartProvider } from "@/contexts/CartProvider.tsx";
import { authClient } from "@/lib/auth-client.ts";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      ...seo({
        title:
          "TanStack Start | Type-Safe, Client-First, Full-Stack React Framework",
        description: `TanStack Start is a type-safe, client-first, full-stack React framework. `
      })
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      }
    ]
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    // Only run if not loading and no user exists
    if (!isPending && !session) {
      void authClient.signIn.anonymous();
    }
  }, [session, isPending]);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClientOnly>
          <div className="flex min-h-screen flex-col bg-gray-50 text-slate-800 dark:bg-gray-900 dark:text-slate-200">
            <CartProvider>
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </CartProvider>
          </div>
          <Toaster position={"bottom-center"} />
        </ClientOnly>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
