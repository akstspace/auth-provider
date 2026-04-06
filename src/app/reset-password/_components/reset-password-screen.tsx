"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LockKeyhole, XCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { pageEnterMotion } from "@/lib/motion"

export function ResetPasswordScreen() {
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()
    const searchParams = useSearchParams()

    const token = searchParams.get("token")
    const tokenError = searchParams.get("error")

    // If the link was invalid/expired, Better Auth redirects with ?error=INVALID_TOKEN
    if (tokenError || !token) {
        return (
            <div className="min-h-dvh bg-background flex items-center justify-center p-4 text-foreground">
                <motion.div
                    {...pageEnterMotion}
                    className="w-full max-w-sm"
                >
                    <div className="mb-8 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="flex items-center justify-center size-10 rounded-full bg-destructive/10">
                                <XCircle className="size-5 text-destructive" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Invalid reset link</h1>
                        <p className="text-sm text-muted-foreground mt-2 text-pretty">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                    </div>
                    <Link href="/forgot-password" className={cn(buttonVariants(), "w-full")}>
                        Request new link
                    </Link>
                </motion.div>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const { error } = await authClient.resetPassword({
                newPassword: password,
                token,
            })

            if (error) {
                setError(getAuthErrorMessage(error, "Failed to reset password."))
            } else {
                router.push("/login?message=password_reset")
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "An unexpected error occurred."))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-dvh bg-background flex items-center justify-center p-4 text-foreground">
            <motion.div
                {...pageEnterMotion}
                className="w-full max-w-sm"
            >
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex items-center justify-center size-10 rounded-full bg-muted">
                            <LockKeyhole className="size-5" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
                    <p className="text-sm text-muted-foreground mt-2 text-pretty">
                        Enter your new password below to secure your account.
                    </p>
                </div>

                {error && <div className="text-sm text-destructive text-center mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            type="password"
                            placeholder="New password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Resetting..." : "Reset password"}
                    </Button>
                </form>
            </motion.div>
        </div>
    )
}
