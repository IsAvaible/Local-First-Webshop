import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/checkout/utils";
import { ORDER_STATUS_MAP, PROGRESS_STEPS } from "@/lib/orders/config";
import { formatDistanceToNow } from "date-fns";
import Big from "big.js";
import type { Order, User } from "@/db/schema";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface ProfileDashboardProps {
  user: User | undefined;
  orders: Order[] | undefined;
}

export function ProfileDashboard({ user, orders }: ProfileDashboardProps) {
  // --- Helper Calculations ---
  const totalSpent =
    orders?.reduce((acc, order) => {
      const config = ORDER_STATUS_MAP[order.status];

      if (config?.isPaid && order.grand_total) {
        return acc.add(new Big(order.grand_total));
      }
      return acc;
    }, new Big(0)) ?? new Big(0);

  const activeOrders =
    orders?.filter((o) => ORDER_STATUS_MAP[o.status]?.isActive) ?? [];

  const activeOrder = activeOrders.length > 0 ? activeOrders[0] : null;

  const getOrderStep = (status: Order["status"]) => {
    return ORDER_STATUS_MAP[status]?.step ?? 0;
  };

  return (
    <div className="space-y-6">
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
            <CardTitle className="text-2xl">{activeOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Account Age</CardDescription>
            <CardTitle className="text-2xl">
              {user?.created_at
                ? formatDistanceToNow(new Date(user.created_at))
                : "unknown"}
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
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
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
    </div>
  );
}
