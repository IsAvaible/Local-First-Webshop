import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Header from "@/components/layout/Header/Header.tsx";
import Footer from "@/components/layout/Footer/Footer.tsx";
import { CartProvider } from "@/contexts/CartProvider.tsx";

const RootLayout = () => (
  <>
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-gray-50 text-slate-800 dark:bg-gray-900 dark:text-slate-200">
        <Header />
        <main className="flex-grow">
          <Outlet />
        </main>
        <Footer />
      </div>
      <TanStackRouterDevtools />
    </CartProvider>
  </>
);

export const Route = createRootRoute({ component: RootLayout });
