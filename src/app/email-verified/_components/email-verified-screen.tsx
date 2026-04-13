"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle } from "lucide-react"
import { cardEnterMotion } from "@/lib/motion"

export function EmailVerifiedScreen() {
    const searchParams = useSearchParams()
    const error = searchParams.get("error")
    const isSuccess = !error

    return (
        <AuthScreenShell>
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <motion.div
                            {...cardEnterMotion}
                            transition={{ ...cardEnterMotion.transition, delay: 0.06 }}
                            className={`flex items-center justify-center size-12 rounded-md ${isSuccess ? "bg-[var(--success-soft)]" : "bg-[var(--danger-soft)]"
                                }`}
                        >
                            {isSuccess ? (
                                <CheckCircle2 className="size-6 text-[color:var(--success)]" />
                            ) : (
                                <XCircle className="size-6 text-destructive" />
                            )}
                        </motion.div>
                    </div>
                    <h1 className="text-2xl font-bold text-balance">
                        {isSuccess ? "Email verified" : "Verification failed"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2 text-pretty">
                        {isSuccess
                            ? "Your email has been verified successfully. You can now sign in to your account."
                            : "The verification link is invalid or has expired. Please request a new one."}
                    </p>
                </div>

                <div className="space-y-2.5">
                    {isSuccess ? (
                        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
                            Sign in
                        </Link>
                    ) : (
                        <>
                            <Link href="/signup" className={cn(buttonVariants(), "w-full")}>
                                Try again
                            </Link>
                            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                                Back to sign in
                            </Link>
                        </>
                    )}
                </div>
        </AuthScreenShell>
    )
}
