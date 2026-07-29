import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Storyverse: inset surface, 13px chrome type, no shadow.
        "flex min-h-15 w-full rounded-md border border-input bg-sv-inset px-2.5 py-2 text-ui placeholder:text-sv-faint disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
