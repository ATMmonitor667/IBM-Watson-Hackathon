import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Storyverse: 32px tall, inset surface, 13px chrome type, no shadow.
          "flex h-8 w-full rounded-md border border-input bg-sv-inset px-2.5 py-1 text-ui transition-colors file:border-0 file:bg-transparent file:text-ui file:font-medium file:text-foreground placeholder:text-sv-faint disabled:cursor-not-allowed disabled:opacity-50",
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
