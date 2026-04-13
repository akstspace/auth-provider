import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-1 text-xs font-medium whitespace-nowrap transition-[color,box-shadow,border-color,background-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:opacity-90",
        secondary:
          "border-border bg-secondary text-secondary-foreground [a&]:hover:text-[#c94b1f]",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 [a&]:hover:opacity-90",
        outline:
          "border-border bg-muted text-foreground [a&]:hover:bg-accent [a&]:hover:text-[#c94b1f]",
        ghost: "bg-transparent [a&]:hover:bg-accent [a&]:hover:text-[#c94b1f]",
        link: "text-[#221a13] underline-offset-4 [a&]:hover:text-[#c94b1f] [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge }
