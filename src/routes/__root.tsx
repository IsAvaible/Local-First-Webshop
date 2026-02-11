import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  ClientOnly
} from "@tanstack/react-router";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
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
        title: "Partslist - The Local-First Webshop",
        description: `Partslist is a next-generation e-commerce platform built on a local-first architecture. 
        Experience zero-latency browsing, full offline capabilities, and instant search. 
        With real-time shared carts and tiered pricing, Partslist delivers a seamless shopping experience that 
        works everywhere you do - even without an internet connection.`
      })
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      },

      // --- Favicons ---
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon/favicon-96x96.png",
        sizes: "96x96"
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon/favicon.svg" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/favicon/apple-touch-icon.png"
      },
      { rel: "manifest", href: "/site.webmanifest" }
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
        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
              defaultOpen: true
            }
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
