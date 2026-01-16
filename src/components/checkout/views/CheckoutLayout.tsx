import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WIZARD_STEPS } from "@/lib/checkout/config";
import type { WizardStepId } from "@/lib/checkout/types";
import { ChevronLeftIcon } from "lucide-react";
import OrderSummary from "../shared/OrderSummary";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface CheckoutLayoutProps {
  currentStepId: WizardStepId;
  wizardProgress: number;
  onBack: () => void;
  totals: {
    subtotal: string;
    warrantyCost: string;
    shippingCost: string;
    tax: string;
    discount: string;
    total: string;
  };
  itemCount: number;
  paymentError?: string | null;
  children: ReactNode;
}

export function CheckoutLayout({
  currentStepId,
  wizardProgress,
  onBack,
  totals,
  itemCount,
  paymentError,
  children
}: CheckoutLayoutProps) {
  const currentStepIndex = WIZARD_STEPS.indexOf(currentStepId);

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 dark:bg-slate-950">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Wizard Header */}
        <div className="mb-8 space-y-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="pl-0 hover:bg-transparent"
          >
            <ChevronLeftIcon className="mr-2 h-4 w-4" /> Back
          </Button>

          <h1 className="text-3xl font-bold">Checkout</h1>

          <div className="space-y-2">
            <div className="text-muted-foreground flex justify-between text-sm font-medium">
              {WIZARD_STEPS.map((stepId, idx) => {
                const label = `${idx + 1}. ${stepId.charAt(0).toUpperCase() + stepId.slice(1)}`;
                const isActive = currentStepId === stepId;

                // Only navigate to steps you have already passed or are currently on.
                const isNavigable = idx <= currentStepIndex;

                if (!isNavigable) {
                  return (
                    <span
                      key={stepId}
                      className="cursor-not-allowed opacity-50 select-none"
                      aria-disabled="true"
                      aria-current={isActive && "step"}
                    >
                      {label}
                    </span>
                  );
                }

                return (
                  <Link
                    key={stepId}
                    to={"/checkout"}
                    search={{ step: stepId }}
                    className={
                      isActive ? "text-primary font-bold" : "hover:underline"
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <Progress value={wizardProgress} className="h-2" />
          </div>
        </div>

        {/* Wizard Body */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">{children}</div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 h-full pb-20">
              <OrderSummary
                totals={totals}
                itemCount={itemCount}
                paymentError={paymentError ?? null}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
