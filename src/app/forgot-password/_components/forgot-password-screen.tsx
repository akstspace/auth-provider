"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"
import { TurnstileWidget } from "@/components/auth/turnstile-widget"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KeyRound } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { captchaEnabled, captchaHeader } from "@/lib/captcha"

interface ForgotPasswordScreenProps {
  emailPasswordAuthEnabled: boolean
}

export function ForgotPasswordScreen({ emailPasswordAuthEnabled }: ForgotPasswordScreenProps) {
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
      const { error: requestError } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
        fetchOptions: {
          headers: captchaHeader(captchaToken),
        },
      })

      if (requestError) {
        setError(getAuthErrorMessage(requestError, "Failed to send reset link."))
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
    <AuthScreenShell>
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex size-10 items-center justify-center rounded-md bg-[var(--icon-soft)]">
            <KeyRound className="size-5" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-balance">Forgot password?</h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Enter your email to receive a password reset link.
        </p>
      </div>

      {!emailPasswordAuthEnabled ? (
        <>
          <div className="mb-4 rounded-lg border border-[color:var(--warning)]/25 bg-[var(--warning-soft)] px-3 py-2 text-center text-sm text-[color:var(--warning)]">
            Password reset is currently disabled by an administrator.
          </div>
          <Link href="/login" className="text-center text-sm font-medium text-foreground hover:text-[#c94b1f] hover:underline">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          {error && <div className="mb-4 rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-3 py-2 text-center text-sm text-destructive">{error}</div>}
          {message && <div className="mb-4 rounded-lg border border-[color:var(--success)]/25 bg-[var(--success-soft)] px-3 py-2 text-center text-sm text-[color:var(--success)]">{message}</div>}

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
            <Link href="/login" className="font-medium text-foreground hover:text-[#c94b1f] hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthScreenShell>
  )
}
