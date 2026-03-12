import React from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

interface OutOfStockOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isOutOfStock?: boolean;
  applyGrayscale?: boolean;
  overlayClassName?: string;
}

export function OutOfStockOverlay({
  isOutOfStock = false,
  applyGrayscale = true,
  children,
  className,
  overlayClassName,
  ...props
}: OutOfStockOverlayProps) {
  return (
    <div
      className={cn(
        "relative",
        className,
        isOutOfStock && applyGrayscale ? "grayscale" : ""
      )}
      {...props}
    >
      {children}

      {isOutOfStock && (
        <div
          className={cn(
            "absolute inset-0 z-1 flex h-full items-center justify-center rounded-t-xl bg-black/10",
            overlayClassName
          )}
        >
          <Badge className="white max-w-[80%] text-center text-wrap whitespace-normal">
            Out of Stock
          </Badge>
        </div>
      )}
    </div>
  );
}
