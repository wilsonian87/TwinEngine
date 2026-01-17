import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary: Consumption Purple - Main actions
        default:
          "bg-[var(--consumption-purple,#6b21a8)] text-[var(--signal-white,#fafafa)] border-0 hover:bg-[#7c3aed] hover:shadow-[0_0_20px_rgba(107,33,168,0.3)]",
        // Accent: Catalyst Gold - High-priority CTAs
        accent:
          "bg-[var(--catalyst-gold,#d97706)] text-[var(--void-black,#0a0a0b)] border-0 font-semibold hover:bg-[#f59e0b] hover:shadow-[0_0_20px_rgba(217,119,6,0.3)]",
        // Destructive: Error states
        destructive:
          "bg-destructive text-destructive-foreground border-0 hover:bg-destructive/90",
        // Outline: Shows background, purple border
        outline:
          "border border-[var(--consumption-purple,#6b21a8)] text-[var(--consumption-purple,#6b21a8)] bg-transparent hover:bg-[rgba(107,33,168,0.1)] hover:border-[var(--process-violet,#a855f7)]",
        // Secondary: Subtle alternative actions
        secondary:
          "bg-[var(--border-gray,#27272a)] text-[var(--signal-white,#fafafa)] border border-[rgba(255,255,255,0.1)] hover:bg-[#3f3f46] hover:border-[rgba(255,255,255,0.2)]",
        // Ghost: Minimal presence, subtle actions
        ghost:
          "text-[var(--signal-white,#fafafa)] border border-transparent hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)]",
        // Link: Text-only style
        link:
          "text-[var(--process-violet,#a855f7)] underline-offset-4 hover:underline",
      },
      // Heights are set as "min" heights, because sometimes Ai will place large amount of content
      // inside buttons. With a min-height they will look appropriate with small amounts of content,
      // but will expand to fit large amounts of content.
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
