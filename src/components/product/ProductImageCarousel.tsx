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

interface Image {
  src: string;
  alt: string;
}

export default function ProductImageCarousel({ images }: { images: Image[] }) {
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
      <Card>
        <CardContent className="p-0">
          <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">No Image</p>
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
                key={image.src}
                className={
                  "w-full p-1 lg:basis-1/4 " +
                  (orientation == "vertical"
                    ? index != 0
                      ? "pt-4"
                      : ""
                    : "pl-4")
                }
                onClick={() => handleThumbnailClick(index)}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className={
                    "aspect-3/4 h-full w-full rounded-md object-cover transition-shadow lg:cursor-pointer " +
                    (orientation == "vertical"
                      ? selectedIndex === index
                        ? "ring-2 ring-offset-2"
                        : "hover:ring-1 hover:ring-gray-500 hover:ring-offset-2"
                      : "")
                  }
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
              <img
                src={images[selectedIndex].src}
                alt={images[selectedIndex].alt}
                className="h-full w-full object-cover"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
