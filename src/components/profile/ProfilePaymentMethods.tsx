import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const PAYMENT_METHODS_MOCK = [
  { id: 1, type: "Visa", last4: "4242", expiry: "12/24", isDefault: true }
];

interface ProfilePaymentMethodsProps {
  displayName: string | undefined | null;
}

export function ProfilePaymentMethods({
  displayName
}: ProfilePaymentMethodsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Payment Methods</h2>
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
                    <div className="text-sm font-medium">{card.expiry}</div>
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
    </div>
  );
}
