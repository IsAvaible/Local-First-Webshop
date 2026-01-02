import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_MAP } from "@/lib/orders/config";
import type { Order } from "@/db/schema";

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_MAP[status as Order["status"]];

  if (!config) return <Badge variant="outline">Unknown</Badge>;

  return (
    <Badge
      variant="outline"
      className={`${config.style} border text-xs font-medium uppercase`}
    >
      {config.label}
    </Badge>
  );
}
