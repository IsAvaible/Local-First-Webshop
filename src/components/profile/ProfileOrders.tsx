import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import type { Order } from "@/db/schema";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface ProfileOrdersProps {
  orders: Order[] | undefined;
}

export function ProfileOrders({ orders }: ProfileOrdersProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Order History</h2>
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
                    <span className="font-bold">{order.order_number}</span>
                    <OrderStatusBadge status={order.status} />
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
    </div>
  );
}
