import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[var(--border-gray,#27272a)] bg-[var(--void-black,#0a0a0b)] px-3 py-2 text-base text-[var(--signal-white,#fafafa)] transition-all duration-200 ease-out",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-[var(--muted-gray,#52525b)]",
          "focus-visible:outline-none focus-visible:border-[var(--consumption-purple,#6b21a8)] focus-visible:shadow-[0_0_0_2px_rgba(107,33,168,0.2)]",
          "hover:border-[var(--muted-gray,#52525b)]",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
