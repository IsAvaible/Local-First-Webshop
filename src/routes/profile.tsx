import {
  User,
  Package,
  CreditCard,
  Heart,
  Settings,
  LogOut,
  Loader2
} from "lucide-react";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { eq, not, useLiveQuery } from "@tanstack/react-db";
import {
  ordersCollection,
  userSettingsCollection,
  usersCollection
} from "@/lib/collections";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import { ProfileOrders } from "@/components/profile/ProfileOrders";
import { ProfileWishlist } from "@/components/profile/ProfileWishlist";
import { ProfilePaymentMethods } from "@/components/profile/ProfilePaymentMethods";
import { ProfileSettings } from "@/components/profile/ProfileSettings";

// --- Search Params Schema ---
const profileUrlSchema = z.object({
  tab: z
    .enum(["dashboard", "orders", "wishlist", "payment", "settings"])
    .optional()
    .default("dashboard")
    .catch("dashboard")
});

type Tab = z.infer<typeof profileUrlSchema>["tab"];

const urlDefaultValues = {
  tab: "dashboard" as Tab
};

// --- Route Definition with Preloading ---
export const Route = createFileRoute("/profile")({
  validateSearch: zodValidator(profileUrlSchema),
  search: {
    middlewares: [stripSearchParams(urlDefaultValues)]
  },
  loader: async () => {
    await Promise.all([
      ordersCollection.preload(),
      userSettingsCollection.preload(),
      usersCollection.preload()
    ]);
  },
  component: EcommerceProfile
});

export function EcommerceProfile() {
  // --- URL State Management ---
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleTabChange = async (newTab: string) => {
    await navigate({
      search: (prev) => ({ ...prev, tab: newTab as Tab }),
      replace: true
    });
  };

  // --- Data Fetching ---

  // 1. Fetch User (Separate Call)
  const { data: user, isLoading: isLoadingUser } = useLiveQuery((q) =>
    q.from({ usersCollection }).findOne()
  );

  // 2. Fetch User Settings (Separate Call)
  const { data: userSettings, isLoading: isLoadingSettings } = useLiveQuery(
    (q) => q.from({ userSettingsCollection }).findOne()
  );

  // 3. Fetch Orders
  const { data: orders, isLoading: isLoadingOrders } = useLiveQuery((q) =>
    q
      .from({ o: ordersCollection })
      .where(({ o }) => not(eq(o.status, "pending")))
      .orderBy(({ o }) => o.created_at, "desc")
  );

  // Combined Loading State
  const isLoadingProfile = isLoadingUser || isLoadingSettings;

  // --- Derived State ---
  const displayName =
    userSettings?.first_name && userSettings?.last_name
      ? `${userSettings.first_name} ${userSettings.last_name}`
      : user?.email;

  if (isLoadingProfile || isLoadingOrders) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        orientation="vertical"
        className="flex flex-col gap-8 md:flex-row"
      >
        {/* Sidebar Navigation */}
        <aside className="w-full flex-shrink-0 md:w-64">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 text-lg">
                  <AvatarImage
                    src={user?.image ?? undefined}
                    alt={displayName ?? "User"}
                  />
                  <AvatarFallback>
                    {displayName?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <h2 className="truncate text-lg leading-tight font-bold">
                    {displayName}
                  </h2>
                  <p className="text-muted-foreground truncate text-xs">
                    {user?.email}
                  </p>
                </div>
              </div>

              <TabsList className="flex h-auto w-full flex-col items-stretch space-y-1 bg-transparent p-0">
                {[
                  { id: "dashboard", label: "Dashboard", icon: User },
                  { id: "orders", label: "My Orders", icon: Package },
                  { id: "wishlist", label: "Wishlist", icon: Heart },
                  { id: "payment", label: "Payment Methods", icon: CreditCard },
                  { id: "settings", label: "Settings", icon: Settings }
                ].map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="justify-start gap-3 px-3 py-2.5 text-sm font-medium hover:cursor-pointer data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <Separator className="my-4" />

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Dashboard View */}
          <TabsContent value="dashboard" className="mt-0">
            <ProfileDashboard user={user} orders={orders} />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-0">
            <ProfileOrders orders={orders} />
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="mt-0">
            <ProfileWishlist />
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment" className="mt-0">
            <ProfilePaymentMethods displayName={displayName} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0">
            {userSettings && <ProfileSettings userSettings={userSettings} />}
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
