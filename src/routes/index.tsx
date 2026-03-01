import { createFileRoute, Link } from "@tanstack/react-router";
import {
  WifiOff,
  Users,
  FolderTree,
  Zap,
  ArrowRight,
  PackageOpenIcon,
  ShoppingBag
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export const Route = createFileRoute("/")({
  ssr: true,
  component: Homepage
});

function Homepage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* --- Hero Section --- */}
      <section className="relative overflow-hidden pt-24 pb-16 md:pt-32">
        <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
          <div className="mb-6 flex items-center justify-center gap-3">
            <PackageOpenIcon className="text-primary h-10 w-10 sm:h-12 sm:w-12" />
            <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-6xl">
              Partslist
            </h1>
          </div>

          <p className="text-foreground/80 text-2xl font-semibold tracking-tight">
            Shop anywhere. Sync everywhere.
          </p>

          <p className="text-muted-foreground mt-6 text-lg leading-8">
            The local-first webshop built for the real world. Organize your
            cart, shop together with your team, and sync instantly when you
            reconnect.
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link to="/search">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg">
                Start Browsing <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- Feature Grid (Bento Style) --- */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
            {/* Feature 1: Offline (Span 2) */}
            <Card className="flex flex-col lg:col-span-2">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
                  <WifiOff className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Built for the real world</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-7">
                  Whether you are in a basement workshop or a remote site, the
                  shop works fully offline. Browse inventory, manage cart
                  settings, and queue orders. Connection status is clearly
                  visible, so you always know where you stand.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2: Speed */}
            <Card className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Powered by ElectricSQL</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-7">
                  Inventory is cached directly to your device. No loading
                  spinners, no latency. Just instant, snappy data access.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3: Collaboration */}
            <Card className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500 shadow-sm">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Multiplayer Shopping</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-7">
                  Utilizing Yjs, multiple users can access the same cart.
                  Suggest items, add comments, and build the perfect order
                  together in real-time.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 4: Organization (Span 2) */}
            <Card className="flex flex-col lg:col-span-2">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500 shadow-sm">
                  <FolderTree className="h-6 w-6 text-white" />
                </div>
                <CardTitle>More than just a Cart</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-7">
                  This isn't a simple list. Organize products into folders, tag
                  them for specific projects, and add detailed descriptions
                  before you ever hit checkout.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* --- Footer CTA --- */}
      <section className="border-t bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to stock up?
            </h2>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-8">
              Start browsing our inventory today with the power of local-first
              technology.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link to="/search">
                <Button size="lg" className="h-12 px-8 text-base">
                  <ShoppingBag className="h-4 w-4" /> Go to Shop
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
