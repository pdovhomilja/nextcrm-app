"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getProductName, VENSAI_BRAND } from "@/lib/brand/vensai";

type Props = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  subtitle?: "workspace" | "tagline" | "none";
};

const sizes = {
  sm: { box: "h-8 w-8", text: "text-sm" },
  md: { box: "h-10 w-10", text: "text-base" },
  lg: { box: "h-16 w-16", text: "text-xl" },
};

export function BrandLogo({
  size = "md",
  showWordmark = true,
  className,
  subtitle = "workspace",
}: Props) {
  const s = sizes[size];
  const product = getProductName();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-background ring-1 ring-border/70 shadow-sm",
          s.box
        )}
      >
        <Image
          src={VENSAI_BRAND.logoPath}
          alt={VENSAI_BRAND.companyName}
          fill
          className="object-cover"
          sizes={size === "lg" ? "64px" : size === "sm" ? "32px" : "40px"}
          priority
        />
      </div>
      {showWordmark && (
        <div className="min-w-0">
          {subtitle === "workspace" && (
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
          )}
          {subtitle === "tagline" && (
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {VENSAI_BRAND.companyName}
            </p>
          )}
          <p className={cn("font-semibold tracking-tight text-foreground", s.text)}>
            {subtitle === "tagline" ? VENSAI_BRAND.tagline : product}
          </p>
        </div>
      )}
    </div>
  );
}
