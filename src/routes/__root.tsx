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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClientOnly>
          <CartProvider>
            <div className="flex min-h-screen flex-col bg-gray-50 text-slate-800 dark:bg-gray-900 dark:text-slate-200">
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
            <TanStackRouterDevtools />
          </CartProvider>
        </ClientOnly>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
