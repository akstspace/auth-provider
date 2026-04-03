"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldCheck } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { getAuthFlowParams, resolveCallbackUrl } from "@/lib/auth-flow"
import { pageEnterMotion } from "@/lib/motion"

export function TwoFactorScreen() {
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [mode, setMode] = useState<"totp" | "backup">("totp")
    const [trustDevice, setTrustDevice] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    const flow = getAuthFlowParams(searchParams)
    const callbackTarget = resolveCallbackUrl(flow)

    const handleVerifyTotp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const { error: requestError } = await authClient.twoFactor.verifyTotp({
                code,
                trustDevice,
            })

            if (requestError) {
                setError(getAuthErrorMessage(requestError, "Invalid code. Please try again."))
            } else {
                router.push(callbackTarget)
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "Verification failed. Please try again."))
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyBackup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const { error: requestError } = await authClient.twoFactor.verifyBackupCode({
                code,
                trustDevice,
            })

            if (requestError) {
                setError(getAuthErrorMessage(requestError, "Invalid backup code."))
            } else {
                router.push(callbackTarget)
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "Verification failed. Please try again."))
        } finally {
            setLoading(false)
        }
    }

    const switchMode = () => {
        setMode(mode === "totp" ? "backup" : "totp")
        setCode("")
        setError("")
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
                            <ShieldCheck className="size-5" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {mode === "totp" ? "Two-Factor Authentication" : "Backup Code"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2 text-pretty">
                        {mode === "totp"
                            ? "Enter the 6-digit code from your authenticator app."
                            : "Enter one of your backup codes to sign in."}
                    </p>
                </div>

                {error && <div className="text-sm text-destructive text-center mb-4">{error}</div>}

                <form onSubmit={mode === "totp" ? handleVerifyTotp : handleVerifyBackup} className="space-y-4">
                    <div>
                        <Input
                            type="text"
                            inputMode={mode === "totp" ? "numeric" : undefined}
                            pattern={mode === "totp" ? "[0-9]*" : undefined}
                            maxLength={mode === "totp" ? 6 : undefined}
                            placeholder={mode === "totp" ? "000000" : "Enter backup code"}
                            required
                            className={mode === "totp" ? "text-center tracking-widest text-lg" : "text-center tracking-widest"}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            autoComplete="one-time-code"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={trustDevice}
                            onChange={(e) => setTrustDevice(e.target.checked)}
                            className="size-4 rounded border-input accent-primary"
                        />
                        <span className="text-sm text-muted-foreground">
                            Trust this device for 30 days
                        </span>
                    </label>

                    <Button type="submit" className="w-full" disabled={loading || !code}>
                        {loading ? "Verifying..." : "Verify"}
                    </Button>
                </form>

                <button
                    type="button"
                    onClick={switchMode}
                    className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                    {mode === "totp" ? "Use a backup code instead" : "Use authenticator app instead"}
                </button>
            </motion.div>
        </div>
    )
}
