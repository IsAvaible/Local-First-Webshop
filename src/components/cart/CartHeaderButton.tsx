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
        <Button variant="ghost" size="icon" className="group">
          <ShoppingCartIcon className="size-6! transition-transform group-hover:scale-110" />
          <span className="sr-only">Toggle Cart Dialog</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[unset]!">
        <Cart className={"w-80"} />
      </PopoverContent>
    </Popover>
  );
}
