import { useState, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
  CarouselPrevious,
  CarouselNext
} from "@/components/ui/carousel";
import type { Asset } from "@/db/schema";
import { AssetImage } from "@/components/ui/assetImage.tsx";
import { ImageOff } from "lucide-react";
import { OutOfStockOverlay } from "@/components/browse/OutOfStockOverlay.tsx";

// A simple and reusable hook to check for a media query
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
};

export default function ProductImageCarousel({
  images,
  isOutOfStock
}: {
  images: Asset[];
  isOutOfStock?: boolean;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const orientation = isLargeScreen ? "vertical" : "horizontal";

  useEffect(() => {
    if (!api) {
      return;
    }

    setSelectedIndex(api.selectedScrollSnap());

    const handleSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);

    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  const handleThumbnailClick = (index: number) => {
    if (!api) {
      return;
    }
    setSelectedIndex(index);
    api.scrollTo(index);
  };

  if (!images || images.length === 0) {
    return (
      <Card className="p-0">
        <CardContent className="p-0">
          <div className="flex aspect-square flex-col items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <ImageOff className="h-6 w-6 opacity-50" />
            <p className="sr-only">No Image</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Thumbnail Carousel */}
      <div className="order-1 lg:col-span-1">
        <Carousel
          className={"h-full"}
          setApi={setApi}
          orientation={orientation}
          opts={{
            align: "start",
            dragFree: false
          }}
        >
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem
                key={image.id}
                className={`w-full p-1 lg:basis-1/4 ${
                  orientation == "vertical"
                    ? index != 0
                      ? "pt-4"
                      : ""
                    : "pl-4"
                }`}
                onClick={() => handleThumbnailClick(index)}
              >
                <AssetImage
                  asset={image}
                  containerClassName={`aspect-3/4 h-full w-full rounded-md object-cover transition-shadow lg:cursor-pointer ${
                    orientation == "vertical"
                      ? selectedIndex === index
                        ? "ring-2 ring-offset-2"
                        : "hover:ring-1 hover:ring-gray-500 hover:ring-offset-2"
                      : ""
                  }`}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {orientation === "horizontal" && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>
      </div>

      {/* Main Image Display */}
      <div className="order-2 hidden lg:col-span-4 lg:block">
        <Card className="overflow-hidden py-0">
          <CardContent className="flex aspect-3/4 items-center justify-center p-0">
            {images[selectedIndex] && (
              <OutOfStockOverlay
                isOutOfStock={isOutOfStock}
                applyGrayscale={false}
                className={"h-full"}
              >
                <AssetImage
                  asset={images[selectedIndex]}
                  containerClassName={"h-full w-full"}
                />
              </OutOfStockOverlay>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
