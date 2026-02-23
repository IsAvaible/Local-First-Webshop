import React, { useState, useEffect, useRef } from "react";
import { Blurhash } from "react-blurhash";
import { ImageOff } from "lucide-react";
import type { Asset } from "@/db/schema.ts";

interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  asset?: Asset | null;
  containerClassName?: string;
}

export function AssetImage({
  asset,
  alt,
  className = "",
  containerClassName = "",
  ...props
}: AssetImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);
  const [showBlurhash, setShowBlurhash] = useState(false);
  const [showFallback, setShowFallback] = useState(true);

  const imgRef = useRef<HTMLImageElement>(null);

  // Effect 1: Handle Missing Asset
  useEffect(() => {
    if (asset) {
      setShowFallback(false);
    }
  }, [asset]);

  // Effect 2: Handle Existing Image Loading & Transition Timing
  useEffect(() => {
    if (asset) {
      // Reset states
      setImageLoaded(false);
      setEnableTransition(false);
      setShowBlurhash(false);

      // If the image is already cached/loaded, set state immediately.
      if (imgRef.current?.complete) {
        setImageLoaded(true);
      }

      // Timer A: Wait 200ms before showing the Blurhash
      const blurHashTimer = setTimeout(() => {
        setShowBlurhash(true);
      }, 200);

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

  const durationClass = enableTransition ? "duration-300" : "duration-0";

  // 1. Handle Missing Asset (Fallback)
  if (!asset) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 ${containerClassName}`}
        aria-label="No asset available"
      >
        <ImageOff
          // Move the fade transition to the icon itself
          className={`h-6 w-6 ${durationClass} ${
            showFallback ? "opacity-50" : "opacity-0"
          }`}
        />
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
          className={`absolute inset-0 z-0 transition-opacity ${durationClass} ease-in-out ${
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
        ref={imgRef}
        key={asset.url}
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
