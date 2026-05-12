import type { ComponentPropsWithoutRef } from "react";
import Image, { type ImageProps } from "next/image";

import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--warm)]",
        className,
      )}
      {...props}
    />
  );
}

type AvatarImageProps = Omit<ImageProps, "alt" | "fill"> & {
  alt?: string;
};

export function AvatarImage({ className, alt = "", sizes = "56px", ...props }: AvatarImageProps) {
  return (
    <Image
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      className={cn("object-cover", className)}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center text-sm font-medium text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}
