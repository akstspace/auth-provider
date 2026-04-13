import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md border text-[15px] font-semibold ring-offset-background transition-[color,background-color,border-color,opacity,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-[6px] border-primary bg-primary text-primary-foreground hover:text-[#d4920a] hover:opacity-70",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border-input bg-secondary text-foreground hover:bg-accent hover:text-[#c94b1f]",
        secondary:
          "border-border bg-[#e4dfd6] text-[#4a4039] hover:bg-[#f5f4f1] hover:text-[#c94b1f]",
        ghost: "border-transparent bg-background text-foreground hover:border-border hover:text-[#c94b1f]",
        link: "border-transparent px-0 text-[#221a13] underline-offset-4 hover:text-[#c94b1f] hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-sm",
        lg: "h-11 rounded-lg px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button"

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
