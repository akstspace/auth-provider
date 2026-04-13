"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LockKeyhole, XCircle } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { cn } from "@/lib/utils"

interface ResetPasswordScreenProps {
  emailPasswordAuthEnabled: boolean
}

export function ResetPasswordScreen({ emailPasswordAuthEnabled }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get("token")
  const tokenError = searchParams.get("error")

  if (!emailPasswordAuthEnabled) {
    return (
      <AuthScreenShell>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-balance">Password reset unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Reset password is currently disabled by an administrator.
          </p>
        </div>
        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          Back to sign in
        </Link>
      </AuthScreenShell>
    )
  }

  // If the link was invalid/expired, Better Auth redirects with ?error=INVALID_TOKEN
  if (tokenError || !token) {
    return (
      <AuthScreenShell>
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex size-10 items-center justify-center rounded-md bg-[var(--danger-soft)]">
              <XCircle className="size-5 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-balance">Invalid reset link</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>
        <Link href="/forgot-password" className={cn(buttonVariants(), "w-full")}>
          Request new link
        </Link>
      </AuthScreenShell>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      })

      if (resetError) {
        setError(getAuthErrorMessage(resetError, "Failed to reset password."))
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
    <AuthScreenShell>
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex size-10 items-center justify-center rounded-md bg-[var(--icon-soft)]">
            <LockKeyhole className="size-5" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-balance">Set new password</h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Enter your new password below to secure your account.
        </p>
      </div>

      {error && <div className="mb-4 rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-3 py-2 text-center text-sm text-destructive">{error}</div>}

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
    </AuthScreenShell>
  )
}
