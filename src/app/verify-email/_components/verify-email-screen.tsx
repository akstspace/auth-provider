"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { getAuthFlowParams, resolveCallbackUrl, withAuthFlow } from "@/lib/auth-flow"

export function VerifyEmailScreen() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")
    const [manualEmail, setManualEmail] = useState("")
    const [checking, setChecking] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session } = authClient.useSession()

    const flow = getAuthFlowParams(searchParams)
    const callbackTarget = resolveCallbackUrl(flow)

    const emailFromParam = searchParams.get("email")
    const userEmail = session?.user?.email || emailFromParam || ""
    const isLoggedIn = Boolean(session?.user)

    useEffect(() => {
        if (session?.user?.emailVerified) {
            router.replace(callbackTarget)
        }
    }, [callbackTarget, router, session?.user?.emailVerified])

    const handleResend = async () => {
        if (!isLoggedIn) return

        const emailToUse = userEmail || manualEmail
        if (!emailToUse) {
            setError("Please enter your email address.")
            return
        }
        setLoading(true)
        setError("")
        setMessage("")
        try {
            const { error: sendError } = await authClient.sendVerificationEmail({
                email: emailToUse,
                callbackURL: callbackTarget,
            })
            if (sendError) {
                setError(getAuthErrorMessage(sendError, "Failed to resend verification email."))
            } else {
                setMessage("Verification email has been resent.")
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "An unexpected error occurred."))
        } finally {
            setLoading(false)
        }
    }

    const handleCheckStatus = async () => {
        setChecking(true)
        setError("")
        setMessage("")
        try {
            const { data, error: sessionError } = await authClient.getSession()
            if (sessionError) {
                setError(getAuthErrorMessage(sessionError, "Could not check verification status."))
                return
            }

            if (!data?.user) {
                router.push(
                    withAuthFlow("/login", {
                        callbackUrl: callbackTarget,
                        oauthQuery: flow.oauthQuery,
                    }),
                )
                return
            }

            if (data.user.emailVerified) {
                router.push(callbackTarget)
            } else {
                setError("Email not verified yet. Please check your inbox and click the verification link.")
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "Could not check verification status."))
        } finally {
            setChecking(false)
        }
    }

    return (
        <AuthScreenShell>
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex items-center justify-center size-12 rounded-md bg-[var(--icon-soft)]">
                            <Mail className="size-6 text-foreground" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-balance">Check your email</h1>
                    <p className="text-sm text-muted-foreground mt-2 text-pretty">
                        We need to verify your email address to secure your account. Please check your inbox.
                    </p>
                </div>

                {error && (
                    <div role="alert" className="mb-4 rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-3 py-2 text-center text-sm text-destructive">
                        {error}
                    </div>
                )}
                {message && (
                    <div role="status" className="mb-4 rounded-lg border border-[color:var(--success)]/25 bg-[var(--success-soft)] px-3 py-2 text-center text-sm text-[color:var(--success)]">
                        {message}
                    </div>
                )}

                <div className="space-y-4">
                    <Button onClick={handleCheckStatus} className="w-full" disabled={checking}>
                        {checking ? "Checking..." : "I've verified my email"}
                    </Button>

                    {!userEmail && isLoggedIn && (
                        <Input
                            type="email"
                            placeholder="Enter your email address"
                            value={manualEmail}
                            onChange={(e) => setManualEmail(e.target.value)}
                        />
                    )}

                    {isLoggedIn ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleResend}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? "Sending..." : "Resend verification email"}
                            </Button>

                            <button
                                type="button"
                                onClick={async () => {
                                    await authClient.signOut()
                                    const verifyEmailPath = `/verify-email${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
                                    router.push(
                                        withAuthFlow("/login", {
                                            callbackUrl: verifyEmailPath,
                                            oauthQuery: flow.oauthQuery,
                                        }),
                                    )
                                }}
                                className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-[#c94b1f]"
                            >
                                Sign out and use a different account
                            </button>
                        </>
                    ) : (
                        <p className="text-center text-xs text-muted-foreground">
                            Sign in to resend the verification email.
                        </p>
                    )}
                </div>
        </AuthScreenShell>
    )
}
