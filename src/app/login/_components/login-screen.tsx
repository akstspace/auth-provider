"use client"

import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { ChevronDown, Fingerprint } from "lucide-react"
import { TurnstileWidget } from "@/components/auth/turnstile-widget"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { LastUsedBadge } from "@/app/login/_components/last-used-badge"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { getAuthFlowParams, resolveCallbackUrl, withAuthFlow } from "@/lib/auth-flow"
import { buildAuthErrorUrl, getBannedMessage, isBannedError } from "@/lib/banned-user"
import { captchaEnabled, captchaHeader } from "@/lib/captcha"
import { expandMotion, pageEnterMotion } from "@/lib/motion"

export function LoginScreen() {
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [lastMethod, setLastMethod] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, isPending } = authClient.useSession()

  const flow = getAuthFlowParams(searchParams)
  const callbackTarget = resolveCallbackUrl(flow)
  const isAddAccountMode = searchParams.get("addAccount") === "1"
  const shouldBypassAutoRedirect = isAddAccountMode

  useEffect(() => {
    if (searchParams.get("error") === "banned") {
      router.replace(
        buildAuthErrorUrl({
          error: "banned",
          errorDescription: searchParams.get("error_description"),
          email: searchParams.get("email"),
        }),
      )
      return
    }

    const method = authClient.getLastUsedLoginMethod()
    if (method) {
      setLastMethod(method)
      if (method === "email") {
        setShowPasswordForm(true)
      }
    }

    const message = searchParams.get("message")
    if (message === "password_reset") {
      setSuccessMessage("Password reset successfully. Sign in with your new password.")
      setShowPasswordForm(true)
    }
  }, [router, searchParams])

  useEffect(() => {
    if (!isPending && session?.user && !shouldBypassAutoRedirect) {
      router.replace(callbackTarget)
    }
  }, [callbackTarget, isPending, router, session?.user, shouldBypassAutoRedirect])

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
        setError(getAuthErrorMessage(result.error, "Google sign in failed."))
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

  const handlePasskeySignIn = async () => {
    setPasskeyLoading(true)
    setError("")
    try {
      await authClient.signIn.passkey({
        fetchOptions: {
          onSuccess() {
            router.push(callbackTarget)
          },
          onError(context) {
            if (isBannedError(context.error)) {
              router.replace(
                buildAuthErrorUrl({
                  error: "banned",
                  errorDescription: getBannedMessage(context.error),
                }),
              )
              return
            }
            setError(getAuthErrorMessage(context.error, "Passkey authentication failed."))
          },
        },
      })
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") return
      if (isBannedError(err)) {
        router.replace(
          buildAuthErrorUrl({
            error: "banned",
            errorDescription: getBannedMessage(err),
          }),
        )
        return
      }
      setError(getAuthErrorMessage(err, "Passkey authentication failed. Try another method."))
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setError("")

    if (captchaEnabled && !captchaToken) {
      setError("Please complete the captcha challenge.")
      setEmailLoading(false)
      return
    }

    try {
      const { error: signInError } = await authClient.signIn.email(
        {
          email,
          password,
          callbackURL: callbackTarget,
          fetchOptions: {
            headers: captchaHeader(captchaToken),
          },
        },
        {
          onSuccess(context) {
            if (context.data.twoFactorRedirect) {
              router.push(
                withAuthFlow("/2fa", {
                  callbackUrl: callbackTarget,
                  oauthQuery: flow.oauthQuery,
                }),
              )
            } else {
              router.push(callbackTarget)
            }
          },
        },
      )
      if (signInError) {
        if (isBannedError(signInError)) {
          router.replace(
            buildAuthErrorUrl({
              error: "banned",
              email,
              errorDescription: getBannedMessage(signInError),
            }),
          )
          return
        }
        setError(getAuthErrorMessage(signInError, "Invalid email or password."))
      }
    } catch (err) {
      if (isBannedError(err)) {
        router.replace(
          buildAuthErrorUrl({
            error: "banned",
            email,
            errorDescription: getBannedMessage(err),
          }),
        )
        return
      }
      setError(getAuthErrorMessage(err, "An unexpected error occurred."))
    } finally {
      setEmailLoading(false)
    }
  }

  if (!isPending && session?.user && !shouldBypassAutoRedirect) {
    return null
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
      <motion.div
        {...pageEnterMotion}
        className="w-full max-w-sm"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-balance">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            {isAddAccountMode
              ? "Add another account for this browser and continue"
              : "Sign in to your account to continue"}
          </p>
        </div>

        {successMessage && (
          <div role="status" className="text-sm text-emerald-500 text-center py-2 px-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            {successMessage}
          </div>
        )}

        {error && (
          <div role="alert" className="text-sm text-red-500 dark:text-red-400 text-center py-1 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            className="w-full gap-2 border-border/50"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
            {lastMethod === "google" && <LastUsedBadge />}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePasskeySignIn}
            disabled={passkeyLoading || emailLoading}
            className="w-full gap-2 border-border/50"
          >
            <Fingerprint className="size-4" />
            {passkeyLoading ? "Authenticating…" : "Sign in with Passkey"}
            {lastMethod === "passkey" && <LastUsedBadge />}
          </Button>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            aria-expanded={showPasswordForm}
            aria-controls="loginPasswordFormPanel"
            className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Or use email and password</span>
            {lastMethod === "email" && <LastUsedBadge />}
            <ChevronDown className={`size-3 transition-transform ${showPasswordForm ? "rotate-180" : ""}`} />
          </button>

          {showPasswordForm && (
            <motion.form
              id="loginPasswordFormPanel"
              {...expandMotion}
              className="mt-4 space-y-3 overflow-hidden"
              onSubmit={handleEmailSignIn}
            >
              <Input
                id="login-email"
                type="email"
                placeholder="Email address"
                aria-label="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailLoading}
              />
              <Input
                id="login-password"
                type="password"
                placeholder="Password"
                aria-label="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={emailLoading}
              />
              <TurnstileWidget onTokenChange={setCaptchaToken} />
              <div className="flex items-center space-between mt-2">
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline ml-auto">
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="w-full text-sm"
                disabled={emailLoading || (captchaEnabled && !captchaToken)}
              >
                {emailLoading ? "Signing in..." : "Sign in with Password"}
              </Button>
            </motion.form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={withAuthFlow("/signup", {
              callbackUrl: flow.callbackUrl,
              oauthQuery: flow.oauthQuery,
            })}
            className="text-foreground font-medium hover:underline underline-offset-2"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
