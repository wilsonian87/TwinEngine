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
          "bg-primary text-primary-foreground border-0 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20",
        // Accent: Catalyst Gold - High-priority CTAs
        accent:
          "bg-accent text-accent-foreground border-0 font-semibold hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/20",
        // Destructive: Error states
        destructive:
          "bg-destructive text-destructive-foreground border-0 hover:bg-destructive/90",
        // Outline: Shows background, purple border
        outline:
          "border border-primary text-primary bg-transparent hover:bg-primary/10 hover:border-primary/80",
        // Secondary: Subtle alternative actions
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
        // Ghost: Minimal presence, subtle actions
        ghost:
          "text-foreground border border-transparent hover:bg-muted hover:text-foreground",
        // Link: Text-only style
        link:
          "text-primary underline-offset-4 hover:underline",
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
