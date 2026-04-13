"use client"

import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { ChevronDown, UserPlus } from "lucide-react"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"
import { TurnstileWidget } from "@/components/auth/turnstile-widget"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { getAuthFlowParams, resolveCallbackUrl, withAuthFlow } from "@/lib/auth-flow"
import { buildAuthErrorUrl, getBannedMessage, isBannedError } from "@/lib/banned-user"
import { captchaEnabled, captchaHeader } from "@/lib/captcha"
import { expandMotion } from "@/lib/motion"

export function SignUpScreen() {
  const [emailLoading, setEmailLoading] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, isPending } = authClient.useSession()

  const flow = getAuthFlowParams(searchParams)
  const callbackTarget = resolveCallbackUrl(flow)
  const postVerificationCallback = flow.oauthQuery
    ? callbackTarget
    : flow.callbackUrl ?? "/email-verified"

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace(callbackTarget)
    }
  }, [callbackTarget, isPending, router, session?.user])

  const handleGoogleSignIn = async () => {
    setError("")
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackTarget,
      })
      if (result.error) {
        if (isBannedError(result.error)) {
          router.replace(
            buildAuthErrorUrl({
              error: "banned",
              errorDescription: getBannedMessage(result.error),
            }),
          )
          return
        }
        setError(getAuthErrorMessage(result.error, "Google sign up failed."))
      }
    } catch (err) {
      if (isBannedError(err)) {
        router.replace(
          buildAuthErrorUrl({
            error: "banned",
            errorDescription: getBannedMessage(err),
          }),
        )
        return
      }
      setError(getAuthErrorMessage(err, "An unexpected error occurred."))
    }
  }

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setError("")

    if (captchaEnabled && !captchaToken) {
      setError("Please complete the captcha challenge.")
      setEmailLoading(false)
      return
    }

    try {
      const { error: signUpError } = await authClient.signUp.email(
        {
          email,
          password,
          name: `${firstName} ${lastName}`.trim(),
          callbackURL: postVerificationCallback,
          fetchOptions: {
            headers: captchaHeader(captchaToken),
          },
        },
        {
          onSuccess() {
            const verifyEmailPath = withAuthFlow(
              `/verify-email?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(postVerificationCallback)}`,
              {},
            )
            router.push(verifyEmailPath)
          },
        },
      )
      if (signUpError) {
        setError(getAuthErrorMessage(signUpError, "Failed to create account."))
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, "An unexpected error occurred."))
    } finally {
      setEmailLoading(false)
    }
  }

  if (!isPending && session?.user) {
    return null
  }

  return (
    <AuthScreenShell>
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center size-9 rounded-md bg-[var(--icon-soft)]">
              <UserPlus className="size-4 text-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-balance">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Get started by signing in with Google
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-3 py-2 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          className="w-full gap-2"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            aria-expanded={showPasswordForm}
            aria-controls="signupPasswordFormPanel"
            className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-[#c94b1f]"
          >
            <span>Or create account with email and password</span>
            <ChevronDown className={`size-3 transition-transform ${showPasswordForm ? "rotate-180" : ""}`} />
          </button>

          {showPasswordForm && (
            <motion.form
              id="signupPasswordFormPanel"
              {...expandMotion}
              className="mt-4 space-y-3 overflow-hidden"
              onSubmit={handleEmailSignUp}
            >
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="signup-first-name"
                  type="text"
                  placeholder="First name"
                  aria-label="First name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={emailLoading}
                />
                <Input
                  id="signup-last-name"
                  type="text"
                  placeholder="Last name"
                  aria-label="Last name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={emailLoading}
                />
              </div>
              <Input
                id="signup-email"
                type="email"
                placeholder="Email address"
                aria-label="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailLoading}
              />
              <Input
                id="signup-password"
                type="password"
                placeholder="Password (min 8 chars)"
                aria-label="Password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={emailLoading}
              />
              <TurnstileWidget onTokenChange={setCaptchaToken} />
              <Button
                type="submit"
                variant="secondary"
                className="w-full text-sm mt-2"
                disabled={emailLoading || (captchaEnabled && !captchaToken)}
              >
                {emailLoading ? "Creating account..." : "Sign up with Password"}
              </Button>
            </motion.form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={withAuthFlow("/login", {
              callbackUrl: flow.callbackUrl,
              oauthQuery: flow.oauthQuery,
            })}
            className="font-medium text-foreground underline-offset-2 hover:text-[#c94b1f] hover:underline"
          >
            Sign in
          </Link>
        </p>
    </AuthScreenShell>
  )
}
