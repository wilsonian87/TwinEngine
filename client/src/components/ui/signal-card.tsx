/**
 * OmniVor Signal Card Component
 *
 * Premium card variants for data display:
 * - default: Standard card with subtle border
 * - elevated: Featured content with gradient and glow
 * - glass: Transparent with backdrop blur (for overlays)
 * - accent: Highlighted with gold accent
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type SignalCardVariant = "default" | "elevated" | "glass" | "accent";

interface SignalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card style variant */
  variant?: SignalCardVariant;
  /** Enable glow effect on hover */
  glowOnHover?: boolean;
  /** Selected/active state */
  selected?: boolean;
  /** Enable lift animation on hover */
  liftOnHover?: boolean;
  /** Make entire card clickable */
  clickable?: boolean;
}

// ============================================================================
// BASE STYLES
// ============================================================================

const baseStyles = "relative rounded-2xl transition-all duration-200";

const variantStyles: Record<SignalCardVariant, string> = {
  default: cn(
    "bg-card border border-border/50",
    "hover:border-border"
  ),
  elevated: cn(
    "border border-purple-500/20",
    "shadow-lg shadow-purple-500/5"
  ),
  glass: cn(
    "backdrop-blur-xl",
    "border border-white/10"
  ),
  accent: cn(
    "bg-card border-l-4",
    "hover:shadow-lg"
  ),
};

// ============================================================================
// COMPONENT
// ============================================================================

const SignalCard = React.forwardRef<HTMLDivElement, SignalCardProps>(
  (
    {
      className,
      variant = "default",
      glowOnHover = false,
      selected = false,
      liftOnHover = false,
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          // Glow on hover
          glowOnHover && "hover:shadow-[0_0_30px_rgba(107,33,168,0.15)]",
          // Lift on hover
          liftOnHover && "hover:-translate-y-0.5",
          // Selected state
          selected && [
            "ring-2 ring-purple-500/50",
            variant === "default" && "border-purple-500/50 bg-purple-500/5",
          ],
          // Clickable
          clickable && "cursor-pointer",
          // Custom classes
          className
        )}
        style={{
          // Variant-specific backgrounds
          ...(variant === "elevated" && {
            background: "linear-gradient(135deg, rgba(107, 33, 168, 0.08) 0%, var(--card) 100%)",
          }),
          ...(variant === "glass" && {
            background: "rgba(10, 10, 11, 0.8)",
          }),
          ...(variant === "accent" && {
            borderLeftColor: "var(--catalyst-gold, #d97706)",
          }),
        }}
        data-selected={selected}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SignalCard.displayName = "SignalCard";

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SignalCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 pb-0", className)}
    {...props}
  />
));
SignalCardHeader.displayName = "SignalCardHeader";

const SignalCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
SignalCardTitle.displayName = "SignalCardTitle";

const SignalCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SignalCardDescription.displayName = "SignalCardDescription";

const SignalCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-4", className)} {...props} />
));
SignalCardContent.displayName = "SignalCardContent";

const SignalCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-5 pt-0 border-t border-border/50 mt-4",
      className
    )}
    {...props}
  />
));
SignalCardFooter.displayName = "SignalCardFooter";

// ============================================================================
// SPECIALIZED VARIANTS
// ============================================================================

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  delta?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  sublabel?: string;
}

/**
 * Metric display card with animated number
 */
const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, delta, sublabel, className, ...props }, ref) => (
    <SignalCard
      ref={ref}
      variant="default"
      className={cn("p-5", className)}
      {...props}
    >
      <div className="space-y-2">
        {/* Label */}
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-gray, #52525b)" }}
        >
          {label}
        </p>

        {/* Value */}
        <p
          className="text-3xl font-extrabold tabular-nums"
          style={{ color: "var(--catalyst-gold, #d97706)" }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>

        {/* Delta indicator */}
        {delta && (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-xs font-medium",
                delta.direction === "up" && "text-green-500",
                delta.direction === "down" && "text-red-500",
                delta.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {delta.direction === "up" && "↑"}
              {delta.direction === "down" && "↓"}
              {delta.direction === "neutral" && "→"}
              {" "}
              {delta.value > 0 ? "+" : ""}
              {delta.value}%
            </span>
            {sublabel && (
              <span className="text-xs text-muted-foreground">{sublabel}</span>
            )}
          </div>
        )}

        {/* Sublabel without delta */}
        {!delta && sublabel && (
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </SignalCard>
  )
);
MetricCard.displayName = "MetricCard";

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SignalCard,
  SignalCardHeader,
  SignalCardTitle,
  SignalCardDescription,
  SignalCardContent,
  SignalCardFooter,
  MetricCard,
};
