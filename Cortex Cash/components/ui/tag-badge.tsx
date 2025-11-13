"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  cor?: string;
  onRemove?: () => void;
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
}

const TagBadge = React.forwardRef<HTMLDivElement, TagBadgeProps>(
  ({ label, cor, onRemove, variant = "default", size = "md", className, ...props }, ref) => {
    // Converte cor hex para RGB para usar com opacity
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 45, g: 155, b: 155 }; // default teal
    };

    const rgb = cor ? hexToRgb(cor) : { r: 45, g: 155, b: 155 };

    const sizeClasses = {
      sm: "text-xs px-2 py-0.5",
      md: "text-sm px-2.5 py-1",
      lg: "text-base px-3 py-1.5",
    };

    const variantStyles =
      variant === "outline"
        ? {
            backgroundColor: "transparent",
            borderColor: cor || "#2d9b9b",
            borderWidth: "1px",
            color: cor || "#2d9b9b",
          }
        : {
            backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
            borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
            borderWidth: "1px",
            color: cor || "#2d9b9b",
          };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors",
          "border",
          sizeClasses[size],
          className
        )}
        style={variantStyles}
        {...props}
      >
        <span className="truncate">{label}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="hover:opacity-70 transition-opacity"
            aria-label={`Remover tag ${label}`}
          >
            <X className="h-3 w-3 text-foreground" />
          </button>
        )}
      </div>
    );
  }
);

TagBadge.displayName = "TagBadge";

export { TagBadge };
