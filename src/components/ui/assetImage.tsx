import React, { useState, useEffect } from "react";
import { Blurhash } from "react-blurhash";
import { ImageOff } from "lucide-react";
import type { Asset } from "@/db/schema.ts";

// 2. Define Props
interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  asset?: Asset | null;
  containerClassName?: string;
}

export function AssetImage({
  asset,
  alt,
  className,
  containerClassName = "",
  ...props
}: AssetImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);

  const [showBlurhash, setShowBlurhash] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  // Effect 1: Handle Missing Asset Delay
  useEffect(() => {
    if (!asset) {
      // If no asset, wait 500ms before showing the fallback
      const timer = setTimeout(() => {
        setShowFallback(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowFallback(false);
    }
  }, [asset]);

  // Effect 2: Handle Existing Image Loading Delay & Transition Timing
  useEffect(() => {
    if (asset) {
      // Reset all states when asset changes
      setImageLoaded(false);
      setEnableTransition(false);
      setShowBlurhash(false);

      // Timer A: Wait 500ms before showing the Blurhash
      // (Prevents flashing if image loads instantly)
      const blurHashTimer = setTimeout(() => {
        setShowBlurhash(true);
      }, 500);

      // Timer B: Wait 1000ms before enabling CSS transitions
      const transitionTimer = setTimeout(() => {
        setEnableTransition(true);
      }, 1000);

      return () => {
        clearTimeout(blurHashTimer);
        clearTimeout(transitionTimer);
      };
    }
  }, [asset]);

  const durationClass = enableTransition ? "duration-500" : "duration-0";

  // 1. Handle Missing Asset (Fallback) with Fade-In
  if (!asset) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 transition-opacity duration-500 ${
          showFallback ? "opacity-100" : "opacity-0"
        } ${containerClassName}`}
        aria-label="No asset available"
      >
        <ImageOff className="h-6 w-6 opacity-50" />
      </div>
    );
  }

  // 2. Handle Existing Asset
  return (
    <div
      className={`relative overflow-hidden bg-gray-100 ${containerClassName}`}
    >
      {/* BlurHash Placeholder */}
      {asset.blur_hash && (
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-200 ease-in-out ${
            // Hide if image is loaded OR if the 500ms blurhash timer hasn't fired yet
            imageLoaded || !showBlurhash ? "opacity-0" : "opacity-100"
          }`}
        >
          <Blurhash
            hash={asset.blur_hash}
            width="100%"
            height="100%"
            resolutionX={32}
            resolutionY={32}
            punch={1}
          />
        </div>
      )}

      {/* Actual Image */}
      <img
        src={asset.url}
        alt={alt ?? asset.alt}
        onLoad={() => setImageLoaded(true)}
        className={`relative z-1 block h-full w-full object-cover transition-opacity ease-in-out ${durationClass} ${
          imageLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
        {...props}
      />
    </div>
  );
}
