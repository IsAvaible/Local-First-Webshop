import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { useLiveQuery, eq, min, Query } from "@tanstack/react-db";
import { useState, useMemo, useCallback } from "react";
import {
  useCart,
  type EnrichedCartNode,
  type EnrichedCartItem
} from "@/contexts/useCartContext";
import {
  productsCollection,
  pricingTiersCollection,
  assetsCollection
} from "@/lib/collections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TruckIcon,
  StoreIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CreditCardIcon,
  MapPinIcon,
  PackageIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  BanknoteIcon,
  SmartphoneIcon,
  type LucideIcon
} from "lucide-react";
import ProductCard from "@/components/browse/ProductCard";
import type { Product, Asset } from "@/db/schema";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

// --- Configuration & Constants ---
const CONFIG = {
  TAX_RATE: 0.19,
  WARRANTY_RATE: 0.1,
  COUPONS: {
    SAVE20: 20
  } as Record<string, number>,
  SHIPPING_RATES: {
    standard: 5.99,
    express: 14.99,
    pickup: 0
  } as const
};

// 1. Define the exact linear flow of the application
const WIZARD_STEPS = ["address", "shipping", "payment", "review"] as const;
const FLOW_ORDER = ["overview", ...WIZARD_STEPS, "success"] as const;

type FlowStepId = (typeof FLOW_ORDER)[number];
type WizardStepId = (typeof WIZARD_STEPS)[number];
type ShippingMethod = keyof typeof CONFIG.SHIPPING_RATES;
type ProductSuggestion = Product & { asset?: Asset; min_price?: number };

// --- Search Param Validation ---
const urlDefaultValues = {
  step: "overview" as FlowStepId
};

const cartUrlSchema = z.object({
  step: z.enum(FLOW_ORDER).catch("overview")
});

// --- Loader & Route Definition ---
export const Route = createFileRoute("/checkout")({
  validateSearch: zodValidator(cartUrlSchema),
  search: {
    middlewares: [stripSearchParams(urlDefaultValues)]
  },
  loader: async () => {
    await Promise.all([
      productsCollection.preload(),
      pricingTiersCollection.preload(),
      assetsCollection.preload()
    ]);
  },
  component: CheckoutPage
});

// --- Custom Hook: Business Logic Separation ---
function useCheckoutLogic() {
  const { rootNodes } = useCart();
  const navigate = Route.useNavigate();
  const { step } = Route.useSearch();

  // Determine current position in the linear flow
  const currentFlowIndex = FLOW_ORDER.indexOf(step);
  const validatedStep = currentFlowIndex === -1 ? "overview" : step;
  const validatedIndex = currentFlowIndex === -1 ? 0 : currentFlowIndex;

  // Form State
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [warranties, setWarranties] = useState<Record<string, boolean>>({});
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  // Flatten Cart Items
  const cartItems = useMemo(() => {
    if (!rootNodes) return [];
    const flatten = (nodes: EnrichedCartNode[]): EnrichedCartItem[] => {
      let items: EnrichedCartItem[] = [];
      for (const node of nodes) {
        if (node.type === "item") items.push(node);
        else if (node.type === "folder")
          items = items.concat(flatten(node.children));
      }
      return items;
    };
    return flatten(rootNodes);
  }, [rootNodes]);

  // Calculate Totals
  const totals = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.price ?? "0") * item.quantity,
      0
    );

    const warrantyCost = Object.entries(warranties).reduce(
      (sum, [itemId, active]) => {
        if (!active) return sum;
        const item = cartItems.find((i) => i.id === itemId);
        const price = parseFloat(item?.price ?? "0");
        return sum + price * CONFIG.WARRANTY_RATE * (item?.quantity ?? 1);
      },
      0
    );

    const shippingCost = CONFIG.SHIPPING_RATES[shippingMethod];
    const tax = (subtotal + warrantyCost + shippingCost) * CONFIG.TAX_RATE;
    const discount = appliedCoupon ? CONFIG.COUPONS[appliedCoupon] || 0 : 0;
    const total = subtotal + warrantyCost + shippingCost + tax - discount;

    return { subtotal, warrantyCost, shippingCost, tax, discount, total };
  }, [cartItems, warranties, shippingMethod, appliedCoupon]);

  // Actions & Navigation
  const navigateToStep = useCallback(
    async (targetStep: FlowStepId) => {
      await navigate({ search: (prev) => ({ ...prev, step: targetStep }) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate]
  );

  const actions = {
    goToNext: useCallback(() => {
      const nextIndex = validatedIndex + 1;
      if (nextIndex < FLOW_ORDER.length) {
        void navigateToStep(FLOW_ORDER[nextIndex]);
      }
    }, [validatedIndex, navigateToStep]),

    goToBack: useCallback(() => {
      const prevIndex = validatedIndex - 1;
      if (prevIndex >= 0) {
        void navigateToStep(FLOW_ORDER[prevIndex]);
      }
    }, [validatedIndex, navigateToStep]),

    resetFlow: useCallback(() => {
      setAppliedCoupon(null);
      setWarranties({});
      void navigateToStep("overview");
    }, [navigateToStep]),

    setStep: navigateToStep,
    setShippingMethod,
    setPaymentMethod,
    setCouponInput,
    toggleWarranty: useCallback((itemId: string) => {
      setWarranties((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    }, []),
    applyCoupon: useCallback(() => {
      if (CONFIG.COUPONS[couponInput]) {
        setAppliedCoupon(couponInput);
      }
    }, [couponInput])
  };

  // Return consolidated state
  const isWizardStep = (WIZARD_STEPS as readonly string[]).includes(
    validatedStep
  );
  const wizardProgress = isWizardStep
    ? (((WIZARD_STEPS as readonly string[]).indexOf(validatedStep) + 1) /
        WIZARD_STEPS.length) *
      100
    : 0;

  return {
    state: {
      step: validatedStep,
      isOverview: validatedStep === "overview",
      isSuccess: validatedStep === "success",
      isWizard: isWizardStep,
      wizardProgress,
      cartItems,
      totals,
      formData: {
        shippingMethod,
        paymentMethod,
        warranties,
        couponInput,
        appliedCoupon
      }
    },
    actions
  };
}

// --- Main Component ---
function CheckoutPage() {
  const { state, actions } = useCheckoutLogic();

  // Data Loading for Recommendations
  const { data: suggestions, isLoading: isSuggestionsLoading } = useLiveQuery(
    () => {
      const minPriceSubquery = new Query()
        .from({ pt: pricingTiersCollection })
        .groupBy(({ pt }) => pt.product_id)
        .select(({ pt }) => ({
          product_id: pt.product_id,
          min_price: min(pt.price_per_unit)
        }));

      const firstAssetIdSubquery = new Query()
        .from({ a: assetsCollection })
        .groupBy(({ a }) => a.product_id)
        .select(({ a }) => ({
          product_id: a.product_id,
          first_asset_id: min(a.id)
        }));

      return new Query()
        .from({ p: productsCollection })
        .leftJoin({ price: minPriceSubquery }, ({ p, price }) =>
          eq(p.id, price.product_id)
        )
        .leftJoin({ fa_id: firstAssetIdSubquery }, ({ p, fa_id }) =>
          eq(p.id, fa_id.product_id)
        )
        .leftJoin({ asset: assetsCollection }, ({ asset, fa_id }) =>
          eq(asset.id, fa_id?.first_asset_id)
        )
        .limit(4)
        .orderBy(({ p }) => p.id)
        .select(({ p, price, asset }) => ({
          ...p,
          min_price: price?.min_price,
          asset: asset
        }));
    }
  );

  // View Routing - Clean and Flat
  if (state.isSuccess) {
    return <SuccessView onReset={actions.resetFlow} />;
  }

  if (state.isWizard) {
    return <CheckoutWizardView state={state} actions={actions} />;
  }

  return (
    <CartOverviewView
      state={state}
      actions={actions}
      suggestions={suggestions as ProductSuggestion[]}
      isSuggestionsLoading={isSuggestionsLoading}
    />
  );
}

// --- View Components ---

function CartOverviewView({
  state,
  actions,
  suggestions,
  isSuggestionsLoading
}: {
  state: ReturnType<typeof useCheckoutLogic>["state"];
  actions: ReturnType<typeof useCheckoutLogic>["actions"];
  suggestions?: ProductSuggestion[];
  isSuggestionsLoading: boolean;
}) {
  const { cartItems, totals, formData } = state;

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 dark:bg-slate-950">
      <div className="container mx-auto max-w-7xl px-4">
        <h1 className="mb-8 text-3xl font-bold">Shopping Cart</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <CartItemsList
              items={cartItems}
              warranties={formData.warranties}
              onToggleWarranty={actions.toggleWarranty}
            />

            <Card>
              <CardHeader>
                <CardTitle>Estimated Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <ShippingSelector
                  value={formData.shippingMethod}
                  onChange={actions.setShippingMethod}
                  variant="simple"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8 lg:col-span-1">
            <OrderSummary totals={totals} itemCount={cartItems.length} />
            <Button
              className="h-12 w-full text-lg"
              size="lg"
              onClick={actions.goToNext}
            >
              Proceed to Payment <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">You might also like</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {isSuggestionsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-lg bg-gray-100"
                  />
                ))
              : suggestions?.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    imageUrl={product.asset?.url}
                  />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutWizardView({
  state,
  actions
}: {
  state: ReturnType<typeof useCheckoutLogic>["state"];
  actions: ReturnType<typeof useCheckoutLogic>["actions"];
}) {
  // Use a map to render steps instead of if/else chains
  // We strictly cast state.step to WizardStepId because we know isWizard is true here
  const currentStepId = state.step as WizardStepId;

  const STEP_CONTENT: Record<WizardStepId, React.ReactNode> = {
    address: <AddressStep />,
    shipping: (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" /> Shipping Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShippingSelector
            value={state.formData.shippingMethod}
            onChange={actions.setShippingMethod}
            variant="detailed"
          />
        </CardContent>
      </Card>
    ),
    payment: (
      <PaymentStep
        method={state.formData.paymentMethod}
        setMethod={actions.setPaymentMethod}
        coupon={state.formData.couponInput}
        setCoupon={actions.setCouponInput}
        onApplyCoupon={actions.applyCoupon}
        isCouponApplied={!!state.formData.appliedCoupon}
      />
    ),
    review: (
      <ReviewStep
        cartItems={state.cartItems}
        shippingMethod={state.formData.shippingMethod}
        paymentMethod={state.formData.paymentMethod}
        warranties={state.formData.warranties}
      />
    )
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 dark:bg-slate-950">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Wizard Header */}
        <div className="mb-8 space-y-4">
          <Button
            variant="ghost"
            onClick={actions.goToBack}
            className="pl-0 hover:bg-transparent"
          >
            <ChevronLeftIcon className="mr-2 h-4 w-4" /> Back
          </Button>

          <h1 className="text-3xl font-bold">Checkout</h1>

          <div className="space-y-2">
            <div className="text-muted-foreground flex justify-between text-sm font-medium">
              {WIZARD_STEPS.map((stepId, idx) => (
                <span
                  key={stepId}
                  className={
                    currentStepId === stepId ? "text-primary font-bold" : ""
                  }
                >
                  {idx + 1}. {stepId.charAt(0).toUpperCase() + stepId.slice(1)}
                </span>
              ))}
            </div>
            <Progress value={state.wizardProgress} className="h-2" />
          </div>
        </div>

        {/* Wizard Body */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Dynamic Step Content */}
            {STEP_CONTENT[currentStepId]}

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={actions.goToBack}>
                Back
              </Button>
              <Button onClick={actions.goToNext} size="lg">
                {currentStepId === "review" ? "Pay & Confirm" : "Next Step"}
                {currentStepId !== "review" && (
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <OrderSummary
                totals={state.totals}
                itemCount={state.cartItems.length}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-Components (Unchanged Visuals) ---

function CartItemsList({
  items,
  warranties,
  onToggleWarranty
}: {
  items: EnrichedCartItem[];
  warranties: Record<string, boolean>;
  onToggleWarranty: (id: string) => void;
}) {
  if (items.length === 0)
    return (
      <div className="text-muted-foreground py-8 text-center">
        Your cart is empty.
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Cart</CardTitle>
        <CardDescription>{items.length} items</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-4 sm:flex-row">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border bg-gray-100">
              {item.asset ? (
                <img
                  src={item.asset.url}
                  alt={item.asset.alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <PackageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">
                    {item.product?.name ?? "Unknown Product"}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(
                      parseFloat(item.price ?? "0") * item.quantity
                    )}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-muted-foreground text-xs">
                      {formatCurrency(parseFloat(item.price ?? "0"))} each
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id={`warranty-${item.id}`}
                  checked={warranties[item.id]}
                  onCheckedChange={() => onToggleWarranty(item.id)}
                />
                <Label
                  htmlFor={`warranty-${item.id}`}
                  className="flex cursor-pointer items-center text-sm select-none"
                >
                  <ShieldCheckIcon className="mr-1 h-4 w-4 text-blue-500" /> Add
                  Extended Warranty (+10%)
                </Label>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

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

function AddressStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinIcon className="h-5 w-5" /> Shipping & Billing
        </CardTitle>
        <CardDescription>
          Select where you want your order delivered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="new-address" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saved">Saved Addresses</TabsTrigger>
            <TabsTrigger value="new-address">New Address</TabsTrigger>
          </TabsList>
          <TabsContent value="saved" className="mt-4 space-y-4">
            <div className="hover:border-primary border-primary bg-primary/5 cursor-pointer rounded-lg border p-4">
              <div className="font-medium">John Doe (Home)</div>
              <div className="text-muted-foreground text-sm">
                123 Main St, New York, NY 10001
              </div>
            </div>
          </TabsContent>
          <TabsContent value="new-address" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input placeholder="123 Main St" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PaymentStep({
  method,
  setMethod,
  coupon,
  setCoupon,
  onApplyCoupon,
  isCouponApplied
}: {
  method: string;
  setMethod: (method: string) => void;
  coupon: string;
  setCoupon: (coupon: string) => void;
  onApplyCoupon: () => void;
  isCouponApplied: boolean;
}) {
  const paymentOptions = [
    { id: "klarna", label: "Klarna", icon: BanknoteIcon },
    { id: "paypal", label: "PayPal", icon: CreditCardIcon },
    { id: "apple_pay", label: "Apple Pay", icon: SmartphoneIcon },
    { id: "card", label: "Credit Card", icon: CreditCardIcon }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" /> Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={method}
            onValueChange={setMethod}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {paymentOptions.map((p) => (
              <Label
                key={p.id}
                htmlFor={p.id}
                className="border-muted bg-popover hover:bg-accent hover:text-accent-foreground [&:has(:checked)]:border-primary flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4"
              >
                <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
                <p.icon className="mb-3 h-6 w-6" /> {p.label}
              </Label>
            ))}
          </RadioGroup>
          {method === "card" && (
            <div className="mt-6 space-y-4 border-t pt-6">
              <div className="space-y-2">
                <Label>Card Number</Label>
                <Input placeholder="0000 0000 0000 0000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Input placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label>CVC</Label>
                  <Input placeholder="123" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coupon Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter code (Try SAVE20)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              disabled={isCouponApplied}
            />
            <Button
              variant="outline"
              onClick={onApplyCoupon}
              disabled={!coupon || isCouponApplied}
            >
              {isCouponApplied ? "Applied" : "Apply"}
            </Button>
          </div>
          {isCouponApplied && (
            <p className="mt-2 text-sm text-green-600">
              Coupon applied successfully!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep({
  cartItems,
  shippingMethod,
  paymentMethod,
  warranties
}: {
  cartItems: EnrichedCartItem[];
  shippingMethod: ShippingMethod;
  paymentMethod: string;
  warranties: Record<string, boolean>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>
          Please review your order before confirming.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">
              Shipping To:
            </span>
            <p>
              John Doe
              <br />
              123 Main St
              <br />
              New York, NY 10001
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Details:</span>
            <p className="capitalize">Method: {shippingMethod}</p>
            <p className="capitalize">
              Payment: {paymentMethod.replace("_", " ")}
            </p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-semibold">Items</h4>
          {cartItems.map((item: EnrichedCartItem) => (
            <div key={item.id} className="flex gap-4">
              <div className="h-16 w-16 overflow-hidden rounded border bg-gray-100">
                {item.asset ? (
                  <img
                    src={item.asset.url}
                    alt={item.asset.alt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PackageIcon className="h-full w-full p-4 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-medium">{item.product?.name}</h5>
                <p className="text-muted-foreground text-xs">
                  Qty: {item.quantity}
                </p>
                {warranties[item.id] && (
                  <span className="mt-1 flex items-center text-xs text-blue-600">
                    <ShieldCheckIcon className="mr-1 h-3 w-3" /> + Extended
                    Warranty
                  </span>
                )}
              </div>
              <div className="text-sm font-medium">
                {formatCurrency(parseFloat(item.price ?? "0") * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderSummary({
  totals,
  itemCount
}: {
  totals: ReturnType<typeof useCheckoutLogic>["state"]["totals"];
  itemCount: number;
}) {
  const { subtotal, warrantyCost, shippingCost, tax, discount, total } = totals;

  return (
    <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <CardHeader>
        <CardTitle>Total Cost</CardTitle>
        <CardDescription>{itemCount} items</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SummaryRow label="Subtotal" value={subtotal} />
        {warrantyCost > 0 && (
          <SummaryRow label="Warranties" value={warrantyCost} />
        )}
        <SummaryRow
          label="Shipping"
          value={shippingCost}
          isFree={shippingCost === 0}
        />
        <SummaryRow label="Tax (19%)" value={tax} />
        {discount > 0 && (
          <SummaryRow
            label="Discount"
            value={-discount}
            className="font-medium text-green-600"
          />
        )}
        <Separator className="my-2" />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const SummaryRow = ({
  label,
  value,
  isFree,
  className
}: {
  label: string;
  value: number;
  isFree?: boolean;
  className?: string;
}) => (
  <div className={`flex justify-between text-sm ${className ?? ""}`}>
    <span className="text-muted-foreground">{label}</span>
    <span>{isFree ? "Free" : formatCurrency(value)}</span>
  </div>
);

function SuccessView({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 py-16 dark:bg-slate-950">
      <div className="container max-w-lg px-4 text-center">
        <Card>
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <ShieldCheckIcon className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
            <CardDescription>
              Order #ORD-{Math.floor(Math.random() * 100000)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Thank you for your purchase. We have sent a confirmation email to
              your inbox.
            </p>
            <Button onClick={onReset} className="mt-4 w-full">
              Return to Store
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Utilities ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(amount);
};
