"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { TurnstileWidget } from "@/components/auth/turnstile-widget"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KeyRound } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { captchaEnabled, captchaHeader } from "@/lib/captcha"
import { pageEnterMotion } from "@/lib/motion"

export function ForgotPasswordScreen() {
    const [email, setEmail] = useState("")
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setMessage("")

        if (captchaEnabled && !captchaToken) {
            setError("Please complete the captcha challenge.")
            setLoading(false)
            return
        }

        try {
            const { error } = await authClient.requestPasswordReset({
                email,
                redirectTo: "/reset-password",
                fetchOptions: {
                    headers: captchaHeader(captchaToken),
                },
            })

            if (error) {
                setError(getAuthErrorMessage(error, "Failed to send reset link."))
            } else {
                setMessage("If an account with that email exists, we've sent a password reset link.")
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
                            <KeyRound className="size-5" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
                    <p className="text-sm text-muted-foreground mt-2 text-pretty">
                        Enter your email to receive a password reset link.
                    </p>
                </div>

                {error && <div className="text-sm text-destructive text-center mb-4">{error}</div>}
                {message && <div className="text-sm text-emerald-500 text-center mb-4">{message}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            type="email"
                            placeholder="Email address"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <TurnstileWidget onTokenChange={setCaptchaToken} />
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || (captchaEnabled && !captchaToken)}
                    >
                        {loading ? "Sending..." : "Send reset link"}
                    </Button>
                </form>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Remember your password?{" "}
                    <Link href="/login" className="text-foreground font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}
