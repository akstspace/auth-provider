import { type ReactNode } from "react"
import { motion } from "motion/react"
import { pageEnterMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface AuthScreenShellProps {
  children: ReactNode
  className?: string
  widthClassName?: string
  cardClassName?: string
}

export function AuthScreenShell({
  children,
  className,
  widthClassName,
  cardClassName,
}: AuthScreenShellProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground",
        className,
      )}
    >
      <div aria-hidden="true" className="auth-screen-background pointer-events-none absolute inset-0" />
      <motion.section
        {...pageEnterMotion}
        className={cn("relative w-full max-w-md", widthClassName)}
      >
        <div
          className={cn(
            "relative rounded-lg border border-[color:var(--auth-card-border)] bg-card px-5 py-6 shadow-[var(--auth-card-shadow)] sm:px-6",
            cardClassName,
          )}
        >
          {children}
        </div>
      </motion.section>
    </div>
  )
}
