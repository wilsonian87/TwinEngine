/**
 * OmniVor Labs Wordmark Component
 *
 * Displays the brand wordmark in two variants:
 * - Split: "OMNIVOR" (black 900) + "LABS" (light 300, purple)
 * - Heavy: Both words in black 900, "LABS" is purple
 *
 * @see OMNIVOR_LABS___Brand_BibleVersion1_1.md for brand spec
 */

import { cn } from "@/lib/utils";

export type WordmarkVariant = "split" | "heavy";
export type WordmarkSize = "sm" | "md" | "lg" | "xl" | "2xl" | "display";

interface WordmarkProps {
  /** Wordmark style variant */
  variant?: WordmarkVariant;
  /** Size preset */
  size?: WordmarkSize;
  /** Additional CSS classes */
  className?: string;
  /** Show only "OMNIVOR" without "LABS" */
  logoOnly?: boolean;
}

// Size mappings for the wordmark
const sizeClasses: Record<WordmarkSize, { omnivor: string; labs: string; gap: string }> = {
  sm: {
    omnivor: "text-sm",
    labs: "text-sm",
    gap: "gap-1",
  },
  md: {
    omnivor: "text-lg",
    labs: "text-lg",
    gap: "gap-1.5",
  },
  lg: {
    omnivor: "text-2xl",
    labs: "text-2xl",
    gap: "gap-2",
  },
  xl: {
    omnivor: "text-3xl",
    labs: "text-3xl",
    gap: "gap-2",
  },
  "2xl": {
    omnivor: "text-4xl",
    labs: "text-4xl",
    gap: "gap-3",
  },
  display: {
    omnivor: "text-5xl md:text-6xl lg:text-7xl",
    labs: "text-5xl md:text-6xl lg:text-7xl",
    gap: "gap-3 md:gap-4",
  },
};

export function Wordmark({
  variant = "split",
  size = "md",
  className,
  logoOnly = false,
}: WordmarkProps) {
  const sizeConfig = sizeClasses[size];

  if (variant === "split") {
    return (
      <div
        className={cn(
          "flex items-baseline",
          sizeConfig.gap,
          className
        )}
        data-testid="wordmark"
      >
        {/* OMNIVOR - Black 900 weight */}
        <span
          className={cn(
            sizeConfig.omnivor,
            "font-black tracking-[0.1em] text-signal-white"
          )}
          style={{ color: "var(--signal-white, #fafafa)" }}
        >
          OMNIVOR
        </span>

        {/* LABS - Light 300 weight, purple */}
        {!logoOnly && (
          <span
            className={cn(
              sizeConfig.labs,
              "font-light tracking-[0.1em]"
            )}
            style={{ color: "var(--consumption-purple, #6b21a8)" }}
          >
            LABS
          </span>
        )}
      </div>
    );
  }

  // Heavy variant - both words bold
  return (
    <div
      className={cn(
        "flex items-baseline",
        sizeConfig.gap,
        className
      )}
      data-testid="wordmark"
    >
      {/* OMNIVOR - Black 900 weight */}
      <span
        className={cn(
          sizeConfig.omnivor,
          "font-black tracking-[0.18em] text-signal-white"
        )}
        style={{ color: "var(--signal-white, #fafafa)" }}
      >
        OMNIVOR
      </span>

      {/* LABS - Black 900 weight, purple */}
      {!logoOnly && (
        <span
          className={cn(
            sizeConfig.labs,
            "font-black tracking-[0.18em]"
          )}
          style={{ color: "var(--consumption-purple, #6b21a8)" }}
        >
          LABS
        </span>
      )}
    </div>
  );
}

/**
 * Compact wordmark for sidebar/header use
 */
export function WordmarkCompact({ className }: { className?: string }) {
  return (
    <Wordmark
      variant="split"
      size="sm"
      className={className}
    />
  );
}

/**
 * Display wordmark for splash pages
 */
export function WordmarkDisplay({ className }: { className?: string }) {
  return (
    <Wordmark
      variant="heavy"
      size="display"
      className={cn("justify-center", className)}
    />
  );
}

/**
 * Logo icon only (stylized "O" or product mark)
 * Placeholder for future SVG logo
 */
export function LogoIcon({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-lg",
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center rounded-lg font-black",
        "bg-gradient-to-br from-consumption-purple to-process-violet",
        "text-signal-white tracking-widest",
        className
      )}
      style={{
        background: "linear-gradient(135deg, var(--consumption-purple, #6b21a8) 0%, var(--process-violet, #a855f7) 100%)",
        color: "var(--signal-white, #fafafa)",
      }}
      data-testid="logo-icon"
    >
      O
    </div>
  );
}

export default Wordmark;
