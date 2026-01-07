import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ShieldCheckIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

function SuccessView() {
  const navigate = useNavigate();

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
            <Button
              onClick={() =>
                navigate({ to: "/profile", search: { tab: "orders" } })
              }
              className="mt-4 w-full"
            >
              Track Order
            </Button>
            <Button
              onClick={() => navigate({ to: "/search" })}
              variant="outline"
              className="w-full"
            >
              Return to Store
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SuccessView;
