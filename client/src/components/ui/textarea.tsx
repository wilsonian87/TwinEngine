import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-[var(--border-gray,#27272a)] bg-[var(--void-black,#0a0a0b)] px-3 py-2 text-base text-[var(--signal-white,#fafafa)] transition-all duration-200 ease-out",
        "placeholder:text-[var(--muted-gray,#52525b)]",
        "hover:border-[var(--muted-gray,#52525b)]",
        "focus-visible:outline-none focus-visible:border-[var(--consumption-purple,#6b21a8)] focus-visible:shadow-[0_0_0_2px_rgba(107,33,168,0.2)]",
        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
