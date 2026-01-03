import {
  // Generic
  Bell,
  // Order
  ClipboardCheck,
  XCircle,
  PackageX,
  // Shipping
  Package,
  Truck,
  PackageCheck,
  Clock,
  Store,
  // Payment
  AlertOctagon,
  CheckCircle2,
  RotateCcw,
  FileText,
  // Product
  TrendingDown,
  PackagePlus,
  AlertTriangle,
  // Social
  Share2,
  UserPlus,
  // Marketing
  TicketPercent,
  Zap,
  ShoppingCart,
  Sparkles,
  // Account
  PartyPopper,
  KeyRound,
  ShieldCheck,
  type LucideProps,
  type LucideIcon
} from "lucide-react";
import type { NotificationType } from "@/db/schema.ts";

// Define the Mapping
const ICON_MAP: Record<NotificationType, LucideIcon> = {
  // Order Events
  order_confirmation: ClipboardCheck,
  order_cancelled: XCircle,
  order_item_unavailable: PackageX,

  // Shipping Events
  shipment_dispatched: Package,
  shipment_out_for_delivery: Truck,
  shipment_delivered: PackageCheck,
  shipment_delayed: Clock,
  pickup_ready: Store,

  // Payment Events
  payment_failed: AlertOctagon,
  payment_succeeded: CheckCircle2,
  refund_processed: RotateCcw,
  invoice_available: FileText,

  // Inventory/Product Events
  price_drop: TrendingDown,
  back_in_stock: PackagePlus,
  low_stock_alert: AlertTriangle,

  // Social/Collaboration Events
  cart_shared: Share2,
  cart_collaborator_add: UserPlus,

  // Marketing Events
  promo_code: TicketPercent,
  flash_sale_start: Zap,
  abandoned_cart_reminder: ShoppingCart,
  recommendation: Sparkles,

  // Account/Security Events
  welcome: PartyPopper,
  password_changed: KeyRound,
  new_device_login: ShieldCheck
};

interface NotificationIconProps extends LucideProps {
  type: NotificationType;
}

export const NotificationIcon = ({ type, ...props }: NotificationIconProps) => {
  const Icon = ICON_MAP[type] || Bell;

  return <Icon {...props} />;
};
