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
  Plus
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

// UI Components
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
import { Label } from "@/components/ui/label";
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

// Mock Data
const USER = {
  name: "Alex Johnson",
  email: "alex.j@example.com",
  avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
  memberSince: "Nov 2021",
  totalSpent: "$2,450.00",
  activeOrders: 2
};

const ORDERS = [
  {
    id: "#ORD-7721",
    date: "Oct 24, 2023",
    total: "$120.00",
    status: "Delivered",
    items: 3
  },
  {
    id: "#ORD-7720",
    date: "Oct 10, 2023",
    total: "$85.50",
    status: "Delivered",
    items: 1
  },
  {
    id: "#ORD-7719",
    date: "Sep 28, 2023",
    total: "$320.00",
    status: "Returned",
    items: 2
  }
];

const ACTIVE_ORDER = {
  id: "#ORD-7722",
  status: "In Transit",
  estimatedDelivery: "Oct 28, 2023",
  step: 2, // 0: Processing, 1: Shipped, 2: In Transit, 3: Delivered
  items: ["Sony WH-1000XM5", "USB-C Cable"]
};

const WISHLIST = [
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
  },
  {
    id: 2,
    name: "Mechanical Keyboard",
    description: null,
    min_price: 220.0,
    company_id: 1,
    category_id: 2,
    base_product_id: null,
    image:
      "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=150&q=80",
    created_at: new Date()
  }
];

const PAYMENT_METHODS = [
  { id: 1, type: "Visa", last4: "4242", expiry: "12/24", isDefault: true },
  {
    id: 2,
    type: "Mastercard",
    last4: "8899",
    expiry: "08/25",
    isDefault: false
  }
];

export const Route = createFileRoute("/profile")({
  component: EcommerceProfile
});

export function EcommerceProfile() {
  // Helper to render status badges
  const renderStatusBadge = (
    status: "Delivered" | "Processing" | "In Transit" | "Returned"
  ) => {
    const customClasses = {
      Delivered:
        "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
      Processing: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
      "In Transit":
        "bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200",
      Returned: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
    };

    return (
      <Badge
        variant="outline"
        className={`${customClasses[status]} border font-medium`}
      >
        {status}
      </Badge>
    );
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* We use the Tabs component as the main layout wrapper.
        flex-col md:flex-row handles the sidebar layout.
      */}
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
                <Avatar className="h-16 w-16 border-2">
                  <AvatarImage src={USER.avatar} alt={USER.name} />
                  <AvatarFallback>AJ</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg leading-tight font-bold">
                    {USER.name}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Member since {USER.memberSince}
                  </p>
                </div>
              </div>

              <TabsList className="flex h-auto flex-col items-stretch space-y-1 bg-transparent p-0">
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
                    className="justify-start gap-3 px-3 py-2.5 text-sm font-medium data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
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
                  <CardTitle className="text-2xl">{USER.totalSpent}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Orders</CardDescription>
                  <CardTitle className="text-2xl">
                    {USER.activeOrders}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Reward Points</CardDescription>
                  <CardTitle className="text-2xl">1,240</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Active Order Tracking Card */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-6">
                <div>
                  <CardTitle className="text-lg">
                    Active Order {ACTIVE_ORDER.id}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Est. Delivery:{" "}
                    <span className="text-foreground font-medium">
                      {ACTIVE_ORDER.estimatedDelivery}
                    </span>
                  </CardDescription>
                </div>
                <Button variant="link" className="h-auto p-0">
                  View Details
                </Button>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-8">
                  {/* Shadcn Progress Component */}
                  <Progress
                    value={(ACTIVE_ORDER.step / 3) * 100}
                    className="h-2"
                  />

                  <div className="flex w-full justify-between">
                    {["Ordered", "Processing", "Shipped", "Delivered"].map(
                      (step, index) => {
                        const isCompleted = index <= ACTIVE_ORDER.step;
                        const isCurrent = index === ACTIVE_ORDER.step;
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

            {/* Recent Orders Table Snippet */}
            <Card className="overflow-hidden">
              <div className="bg-muted/50 flex items-center justify-between border-b px-6 py-4">
                <h3 className="font-semibold">Recent Orders</h3>
                <Button variant="link" className="h-auto p-0">
                  View All
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ORDERS.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.date}
                      </TableCell>
                      {/* @ts-expect-error temporary string assignment */}
                      <TableCell>{renderStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {order.total}
                      </TableCell>
                    </TableRow>
                  ))}
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
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {[ACTIVE_ORDER, ...ORDERS].map((order) => (
                <Card key={order.id}>
                  <CardContent className="flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted rounded-lg p-3">
                        <Package className="text-muted-foreground h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{order.id}</span>
                          {/* @ts-expect-error temporary string assignment */}
                          {renderStatusBadge(order.status)}
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {typeof order.items === "number"
                            ? order.items
                            : order.items.length}{" "}
                          {/* @ts-expect-error types are not the same, fine for the demo */}
                          items • {order.total ?? "Paid"}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full gap-3 md:w-auto">
                      <Button variant="outline" className="flex-1">
                        Invoice
                      </Button>
                      <Button className="flex-1">Track Order</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="mt-0 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">My Wishlist</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {WISHLIST.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  imageUrl={item.image}
                />
              ))}

              {/* Empty State / Add New */}
              <div className="border-muted text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all">
                <Search className="mb-2 h-8 w-8" />
                <p className="font-medium">Browse products</p>
              </div>
            </div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment" className="mt-0 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Payment Methods
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {PAYMENT_METHODS.map((card) => (
                <Card
                  key={card.id}
                  className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg"
                >
                  <CardContent className="p-6">
                    {/* Decorative Circles */}
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
                            {USER.name.toUpperCase()}
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

              {/* Add New Card Button */}
              <div className="border-muted text-muted-foreground hover:bg-muted/30 flex h-full min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all hover:border-indigo-300 hover:text-indigo-600">
                <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full group-hover:bg-indigo-50">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="font-medium">Add New Card</span>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0 max-w-2xl space-y-8">
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
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue={USER.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={USER.email}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>Save Changes</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5" /> Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      Order Updates
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Receive updates about your order status.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      Promotional Emails
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Receive emails about new products and sales.
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
