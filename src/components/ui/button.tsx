import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Storyverse overrides: 13px chrome type, no shadows on inline content,
  // 120ms transitions. Focus comes from the global :focus-visible outline.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-ui font-medium transition-colors duration-120 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-sv-accent-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-sv-edge bg-transparent hover:bg-sv-raised hover:border-sv-edge-strong",
        secondary: "bg-secondary text-secondary-foreground hover:bg-sv-overlay",
        ghost: "text-sv-muted hover:bg-sv-raised hover:text-sv-text",
        link: "text-sv-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5 text-meta",
        lg: "h-9 px-6",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
