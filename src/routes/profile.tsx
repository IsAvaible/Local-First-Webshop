import {
  User,
  Package,
  CreditCard,
  Heart,
  Settings,
  LogOut,
  Bell,
  Search,
  CheckCircle,
  Plus,
  Loader2
} from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { eq, not, useLiveQuery } from "@tanstack/react-db";
import {
  ordersCollection,
  userSettingsCollection,
  usersCollection
} from "@/lib/collections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import ProductCard from "@/components/browse/ProductCard.tsx";

// --- Form & Validation Imports ---
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSet,
  FieldLegend
} from "@/components/ui/field";
import type { Order } from "@/db/schema.ts";
import { ORDER_STATUS_MAP, PROGRESS_STEPS } from "@/lib/orders/config.ts";
import { toast } from "sonner";
import { CurrencySelect } from "@/components/ui/currency-select.tsx";
import { formatDistanceToNow } from "date-fns";
import Big from "big.js";
import { formatCurrency } from "@/lib/checkout/utils.ts";

// Mock Data for items not yet in DB schema
const WISHLIST_MOCK = [
  {
    id: 1,
    name: "Minimalist Leather Backpack",
    description: null,
    min_price: 14.0,
    company_id: 1,
    category_id: 1,
    base_product_id: null,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=150&q=80",
    created_at: new Date()
  }
];

const PAYMENT_METHODS_MOCK = [
  { id: 1, type: "Visa", last4: "4242", expiry: "12/24", isDefault: true }
];

// --- Zod Schema Definition ---
const userSettingsSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters"),
  last_name: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters"),
  phone_number: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^[\d+\-\s()]+$/.test(val),
      "Invalid phone number format"
    )
    .optional(),
  birthday: z.string().optional(),
  currency: z.string().min(1, "Please select a currency"),
  language: z.string().min(1, "Please select a language"),
  notify_order_updates: z.boolean(),
  notify_newsletter: z.boolean(),
  notify_price_changes: z.boolean()
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

// --- Route Definition with Preloading ---
export const Route = createFileRoute("/profile")({
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

  // --- Form Setup ---
  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    values: {
      first_name: userSettings?.first_name ?? "",
      last_name: userSettings?.last_name ?? "",
      phone_number: userSettings?.phone_number ?? "",
      birthday: userSettings?.birthday ?? "",
      currency: userSettings?.currency ?? "EUR",
      language: userSettings?.language ?? "en",
      notify_order_updates: userSettings?.notify_order_updates ?? true,
      notify_newsletter: userSettings?.notify_newsletter ?? false,
      notify_price_changes: userSettings?.notify_price_changes ?? false
    }
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, dirtyFields }
  } = form;

  // --- Actions ---

  const onSubmit = async (data: UserSettingsFormValues) => {
    if (!userSettings?.user_id) return;

    // 1. Get keys of dirty fields only
    const dirtyKeys = Object.keys(
      dirtyFields
    ) as (keyof UserSettingsFormValues)[];

    if (dirtyKeys.length === 0) return;

    // 2. Construct updates object
    const updates = Object.fromEntries(
      dirtyKeys.map((key) => [key, data[key]])
    );

    try {
      const tx = userSettingsCollection.update(
        userSettings.user_id,
        (settings) => {
          // 3. Merges updates directly into settings
          return Object.assign(settings, updates);
        }
      );
      await tx.isPersisted.promise;
    } catch (error) {
      const message = `Failed to update settings:${JSON.stringify(error)}`;
      console.error(message);
      toast(message);
    }
  };

  // --- Helper Calculations for Orders (Unchanged) ---
  const totalSpent =
    orders?.reduce((acc, order) => {
      const config = ORDER_STATUS_MAP[order.status];

      if (config?.isPaid && order.grand_total) {
        return acc.add(new Big(order.grand_total));
      }
      return acc;
    }, new Big(0)) || new Big(0);

  const activeOrders =
    orders?.filter((o) => ORDER_STATUS_MAP[o.status]?.isActive) || [];

  const activeOrder = activeOrders.length > 0 ? activeOrders[0] : null;

  const getOrderStep = (status: Order["status"]) => {
    switch (status) {
      case "pending":
      case "awaiting_payment":
        return 0;
      case "processing":
        return 1;
      case "shipped":
        return 2;
      case "delivered":
        return 3;
      default:
        return 0;
    }
  };

  const renderStatusBadge = (status: string) => {
    const config = ORDER_STATUS_MAP[status as Order["status"]];

    // Fallback for unknown statuses
    if (!config) return <Badge variant="outline">Unknown</Badge>;

    return (
      <Badge
        variant="outline"
        className={`${config.style} border text-xs font-medium uppercase`}
      >
        {config.label}
      </Badge>
    );
  };

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
        defaultValue="dashboard"
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
          <TabsContent value="dashboard" className="mt-0 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Spent</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(totalSpent.toFixed(2))}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Orders</CardDescription>
                  <CardTitle className="text-2xl">
                    {activeOrders.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Account Age</CardDescription>
                  <CardTitle className="text-2xl">
                    {user ? formatDistanceToNow(user.created_at) : "unknown"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Active Order Tracking Card */}
            {activeOrder && (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between pb-6">
                  <div>
                    <CardTitle className="text-lg">
                      Order {activeOrder.order_number}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Date placed:{" "}
                      <span className="text-foreground font-medium">
                        {new Date(activeOrder.created_at).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Button variant="link" className="h-auto p-0">
                    View Details
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-8">
                    <Progress
                      value={
                        ((ORDER_STATUS_MAP[activeOrder.status]?.step ?? 0) /
                          (PROGRESS_STEPS.length - 1)) *
                        100
                      }
                      className="h-2"
                    />

                    <div className="flex w-full justify-between">
                      {["Ordered", "Processing", "Shipped", "Delivered"].map(
                        (step, index) => {
                          const currentStep = getOrderStep(activeOrder.status);
                          const isCompleted = index <= currentStep;
                          const isCurrent = index === currentStep;
                          return (
                            <div
                              key={step}
                              className="flex flex-col items-center gap-2"
                            >
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                                  isCompleted
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted bg-background text-muted-foreground"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <div className="bg-muted h-2 w-2 rounded-full" />
                                )}
                              </div>
                              <span
                                className={`text-xs font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
                              >
                                {step}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Orders Table */}
            <Card className="gap-0 overflow-hidden py-0">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="font-semibold">Recent Orders</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.slice(0, 5).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{renderStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {order.grand_total} {order.currency_code}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!orders || orders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-0 space-y-6">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                Order History
              </h2>
            </div>

            <div className="space-y-4">
              {orders?.map((order) => (
                <Card key={order.id}>
                  <CardContent className="flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted rounded-lg p-3">
                        <Package className="text-muted-foreground h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">
                            {order.order_number}
                          </span>
                          {renderStatusBadge(order.status)}
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {new Date(order.created_at).toLocaleDateString()} •{" "}
                          {order.grand_total} {order.currency_code}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full gap-3 md:w-auto">
                      <Button variant="outline" className="flex-1">
                        View Receipt
                      </Button>
                      <Button className="flex-1">Order Details</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!orders || orders.length === 0) && (
                <div className="py-12 text-center">
                  <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="text-lg font-medium">No orders yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Start shopping to see your orders here.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="mt-0 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">My Wishlist</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {WISHLIST_MOCK.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  imageUrl={item.image}
                />
              ))}
              <Link
                to={"/search"}
                className="border-muted text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all"
              >
                <Search className="mb-2 h-8 w-8" />
                <p className="font-medium">Browse products</p>
              </Link>
            </div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment" className="mt-0 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Payment Methods
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {PAYMENT_METHODS_MOCK.map((card) => (
                <Card
                  key={card.id}
                  className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-white/10 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-indigo-500/20 blur-xl"></div>
                    <div className="relative z-10 flex h-32 flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs tracking-widest text-gray-300 uppercase">
                          {card.type}
                        </span>
                        {card.isDefault && (
                          <Badge
                            variant="secondary"
                            className="border-none bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-2xl tracking-widest">
                        **** **** **** {card.last4}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">
                            Card Holder
                          </div>
                          <div className="text-sm font-medium">
                            {displayName?.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase">
                            Expires
                          </div>
                          <div className="text-sm font-medium">
                            {card.expiry}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="border-muted text-muted-foreground hover:bg-muted/30 flex h-full min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all hover:border-indigo-300 hover:text-indigo-600">
                <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full group-hover:bg-indigo-50">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="font-medium">Add New Card</span>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab - REFACTORED */}
          <TabsContent value="settings" className="mt-0 max-w-2xl space-y-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div>
                <h2 className="mb-6 text-2xl font-bold tracking-tight">
                  Account Settings
                </h2>

                {/* Profile Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" /> Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldSet className="space-y-6">
                      <FieldLegend className="sr-only">
                        Personal Info
                      </FieldLegend>
                      <FieldGroup>
                        {/* Row 1: Names */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <Field data-invalid={!!errors.first_name}>
                            <FieldLabel htmlFor="first_name">
                              First Name
                            </FieldLabel>
                            <Input
                              id="first_name"
                              aria-invalid={!!errors.first_name}
                              {...register("first_name")}
                            />
                            <FieldError>
                              {errors.first_name?.message}
                            </FieldError>
                          </Field>

                          <Field data-invalid={!!errors.last_name}>
                            <FieldLabel htmlFor="last_name">
                              Last Name
                            </FieldLabel>
                            <Input
                              id="last_name"
                              aria-invalid={!!errors.last_name}
                              {...register("last_name")}
                            />
                            <FieldError>{errors.last_name?.message}</FieldError>
                          </Field>
                        </div>

                        {/* Row 2: Contact */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <Field data-invalid={!!errors.phone_number}>
                            <FieldLabel htmlFor="phone">
                              Phone Number
                            </FieldLabel>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              aria-invalid={!!errors.phone_number}
                              {...register("phone_number")}
                            />
                            <FieldError>
                              {errors.phone_number?.message}
                            </FieldError>
                          </Field>

                          <Field data-invalid={!!errors.birthday}>
                            <FieldLabel htmlFor="birthday">Birthday</FieldLabel>
                            <Input
                              id="birthday"
                              type="date"
                              aria-invalid={!!errors.birthday}
                              {...register("birthday")}
                            />
                            <FieldError>{errors.birthday?.message}</FieldError>
                          </Field>
                        </div>

                        <Separator />

                        {/* Row 3: Preferences (Using Controller for Select) */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <Field data-invalid={!!errors.currency}>
                            <FieldLabel htmlFor="currency">Currency</FieldLabel>
                            <Controller
                              name="currency"
                              control={control}
                              render={({ field }) => (
                                <CurrencySelect
                                  defaultValue={field.value}
                                  onValueChange={field.onChange}
                                  name="currency"
                                  placeholder="Select currency"
                                  currencies="custom"
                                  variant="default"
                                />
                              )}
                            />
                            <FieldError>{errors.currency?.message}</FieldError>
                          </Field>

                          <Field data-invalid={!!errors.language}>
                            <FieldLabel htmlFor="language">Language</FieldLabel>
                            <Controller
                              name="language"
                              control={control}
                              render={({ field }) => (
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  name={field.name}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select language" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="de">German</SelectItem>
                                    <SelectItem value="fr">French</SelectItem>
                                    <SelectItem value="es">Spanish</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <FieldError>{errors.language?.message}</FieldError>
                          </Field>
                        </div>
                      </FieldGroup>
                    </FieldSet>
                  </CardContent>
                </Card>
              </div>

              {/* Notifications */}
              <div className="mt-8">
                <Card className="pb-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Bell className="h-5 w-5" /> Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Notify Order Updates */}
                    <div className="flex items-center justify-between space-x-2">
                      <div className="space-y-0.5">
                        <FieldLabel className="text-base font-medium">
                          Order Updates
                        </FieldLabel>
                        <p className="text-muted-foreground text-sm">
                          Receive updates about your order status.
                        </p>
                      </div>
                      <Controller
                        name="notify_order_updates"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <Separator />

                    {/* Notify Newsletter */}
                    <div className="flex items-center justify-between space-x-2">
                      <div className="space-y-0.5">
                        <FieldLabel className="text-base font-medium">
                          Newsletter
                        </FieldLabel>
                        <p className="text-muted-foreground text-sm">
                          Receive emails about new products and sales.
                        </p>
                      </div>
                      <Controller
                        name="notify_newsletter"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <Separator />

                    {/* Notify Price Changes */}
                    <div className="flex items-center justify-between space-x-2">
                      <div className="space-y-0.5">
                        <FieldLabel className="text-base font-medium">
                          Price Changes
                        </FieldLabel>
                        <p className="text-muted-foreground text-sm">
                          Get notified when items in your wishlist change price.
                        </p>
                      </div>
                      <Controller
                        name="notify_price_changes"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end p-6">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </form>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
