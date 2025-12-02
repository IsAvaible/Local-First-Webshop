import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { CONFIG } from "@/lib/checkout/config";
import type { ShippingMethod } from "@/lib/checkout/types";
import { formatCurrency } from "@/lib/checkout/utils";
import type { LucideIcon } from "lucide-react";
import { StoreIcon, TruckIcon } from "lucide-react";

function ShippingSelector({
  value,
  onChange,
  variant
}: {
  value: ShippingMethod;
  onChange: (v: ShippingMethod) => void;
  variant: "simple" | "detailed";
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as ShippingMethod)}
      className={
        variant === "simple"
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
          : "grid gap-4"
      }
    >
      {variant === "simple" ? (
        <>
          <SimpleShippingOption
            id="standard"
            icon={TruckIcon}
            label="Shipping"
          />
          <SimpleShippingOption
            id="pickup"
            icon={StoreIcon}
            label="Store Pickup"
          />
        </>
      ) : (
        <>
          <DetailedShippingOption
            id="standard"
            title="Standard Delivery"
            desc="3-5 Business Days"
            price={CONFIG.SHIPPING_RATES.standard}
          />
          <DetailedShippingOption
            id="express"
            title="Express Delivery"
            desc="Next Day Delivery"
            price={CONFIG.SHIPPING_RATES.express}
          />
          <DetailedShippingOption
            id="pickup"
            title="Store Pickup"
            desc="Ready in 2 hours"
            price={CONFIG.SHIPPING_RATES.pickup}
          />
          {value === "pickup" && (
            <div className="mt-4">
              <Label>Select Store</Label>
              <Select>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a nearby store..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="berlin">Berlin Alexanderplatz</SelectItem>
                  <SelectItem value="munich">Munich Marienplatz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    </RadioGroup>
  );
}

const SimpleShippingOption = ({
  id,
  icon: Icon,
  label
}: {
  id: string;
  icon: LucideIcon;
  label: string;
}) => (
  <div>
    <RadioGroupItem value={id} id={`opt-${id}`} className="peer sr-only" />
    <Label
      htmlFor={`opt-${id}`}
      className="border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4"
    >
      <Icon className="mb-3 h-6 w-6" /> {label}
    </Label>
  </div>
);

const DetailedShippingOption = ({
  id,
  title,
  desc,
  price
}: {
  id: string;
  title: string;
  desc: string;
  price: number;
}) => (
  <Label className="[&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5 flex cursor-pointer items-center justify-between rounded-md border p-4">
    <div className="flex items-center gap-4">
      <RadioGroupItem value={id} id={id} />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-muted-foreground text-sm">{desc}</div>
      </div>
    </div>
    <div className="font-semibold">
      {price === 0 ? "Free" : formatCurrency(price)}
    </div>
  </Label>
);

export default ShippingSelector;
