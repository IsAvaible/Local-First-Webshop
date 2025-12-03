import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ShoppingCartIcon } from "lucide-react";
import { Cart } from "@/components/cart/Cart.tsx";
import { Button } from "../ui/button";

export function CartHeaderButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <ShoppingCartIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[unset]!">
        <Cart className={"w-80"} />
      </PopoverContent>
    </Popover>
  );
}
