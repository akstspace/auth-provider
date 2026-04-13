"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, Ban, RefreshCw } from "lucide-react"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"
import { Button } from "@/components/ui/button"

const DEFAULT_BANNED_MESSAGE =
    "Your account has been suspended. Contact a platform administrator if you think this is a mistake."

const KNOWN_ERROR_COPY: Record<
    string,
    {
        title: string
        description: string
        help: string[]
    }
> = {
    invalid_callback_request: {
        title: "Invalid sign-in callback",
        description: "The sign-in callback arrived without the information Better Auth expected.",
        help: [
            "Start the sign-in flow again from the login page.",
            "If this keeps happening, check your OAuth callback and proxy configuration.",
        ],
    },
    state_not_found: {
        title: "Sign-in session expired",
        description: "The verification state for this sign-in attempt could not be found.",
        help: [
            "Go back and start sign-in again.",
            "Avoid using an old callback URL from browser history.",
        ],
    },
    state_mismatch: {
        title: "Sign-in could not be verified",
        description: "The returned sign-in state did not match the original request.",
        help: [
            "Restart the sign-in flow from the login page.",
            "Try again in a fresh tab if the callback was opened from an old session.",
        ],
    },
    no_code: {
        title: "Sign-in was interrupted",
        description: "The provider callback completed without an authorization code.",
        help: [
            "Try the sign-in flow again.",
            "If this keeps happening, verify your provider callback URL and consent flow.",
        ],
    },
    no_callback_url: {
        title: "Missing return destination",
        description: "Better Auth could not find the callback destination for this sign-in request.",
        help: [
            "Start sign-in again from the app instead of reusing a callback URL.",
            "If this happens consistently, review your auth callback setup.",
        ],
    },
    oauth_provider_not_found: {
        title: "Sign-in provider not available",
        description: "The callback referenced an OAuth provider that is not configured correctly.",
        help: [
            "Return to sign in and choose a configured provider.",
            "If you are expecting this provider, review the Better Auth provider configuration.",
        ],
    },
    email_not_found: {
        title: "Provider did not share an email",
        description: "The OAuth provider did not return an email address, so the account could not be identified.",
        help: [
            "Use a provider account that shares an email address.",
            "If this is your provider setup, confirm the required email scope is enabled.",
        ],
    },
    "email_doesn't_match": {
        title: "Emails do not match",
        description: "The provider returned an email that does not match the account being linked.",
        help: [
            "Switch to the correct provider account and try again.",
            "If needed, confirm which email is already attached to your app account.",
        ],
    },
    unable_to_get_user_info: {
        title: "Could not read provider profile",
        description: "Better Auth could not fetch usable profile information from the provider.",
        help: [
            "Try the sign-in flow again in case the provider request was temporary.",
            "If this continues, review provider scopes and profile endpoints.",
        ],
    },
    unable_to_link_account: {
        title: "Could not link provider account",
        description: "The provider account could not be linked to the current user.",
        help: [
            "Try again from the linked-account flow.",
            "If this is expected to work, review trusted provider and database configuration.",
        ],
    },
    account_already_linked_to_different_user: {
        title: "Provider account already linked",
        description: "This provider account is already connected to a different user.",
        help: [
            "Sign in with the existing account that already owns this provider login.",
            "Use a different provider account if you intended to connect another user.",
        ],
    },
    signup_disabled: {
        title: "Sign-up is disabled",
        description: "New account creation is currently blocked for this sign-in path.",
        help: [
            "Return to sign in if you already have an account.",
            "Contact support if you believe you should have access.",
        ],
    },
    invite_only: {
        title: "Invitation required",
        description: "This email address is not currently allowed to create an account.",
        help: [
            "Return to sign in if you already have an account.",
            "Use an approved email address if you have one.",
        ],
    },
}

export function AuthErrorScreen() {
    const searchParams = useSearchParams()
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")
    const email = searchParams.get("email")
    const reason = searchParams.get("reason")
    const expiresAt = searchParams.get("expiresAt")
    const normalizedError = error?.trim().toLowerCase() ?? null
    const isBanned = normalizedError === "banned" || error === "BANNED_USER"

    const errorContent = (() => {
        if (isBanned) {
            return {
                title: "Account suspended",
                description: errorDescription || DEFAULT_BANNED_MESSAGE,
                help: [
                    "Contact a platform administrator if you need the suspension reviewed.",
                    "If an expiry was set, access will return automatically after that time.",
                ],
            }
        }

        const known = normalizedError ? KNOWN_ERROR_COPY[normalizedError] : null
        if (known) {
            return {
                title: known.title,
                description: errorDescription || known.description,
                help: known.help,
            }
        }

        return {
            title: "Authentication error",
            description: errorDescription || "Something went wrong during authentication. Please try again.",
            help: [
                "Return to sign in and try again.",
                "If the issue continues, check your auth configuration or provider setup.",
            ],
        }
    })()

    const displayExpiry = expiresAt ? new Date(expiresAt) : null
    const icon = isBanned ? <Ban className="size-5" /> : <AlertTriangle className="size-5" />
    const hasSummaryDetails = Boolean(email && !isBanned)

    return (
        <AuthScreenShell widthClassName="max-w-xl" cardClassName="px-6 py-8 sm:px-8">
                    <div className="mb-6 flex size-12 items-center justify-center rounded-md bg-[var(--icon-soft)] text-foreground">
                        {icon}
                    </div>
                    <h1 className="text-3xl font-semibold text-balance">{errorContent.title}</h1>
                    <p className="mt-3 text-sm text-muted-foreground text-pretty">{errorContent.description}</p>

                    {hasSummaryDetails ? (
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {email && !isBanned ? (
                                <div className="rounded-md border bg-secondary p-4">
                                    <p className="text-xs text-muted-foreground">Account</p>
                                    <p className="mt-2 text-sm font-medium">{email}</p>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {isBanned ? (
                        <div className="mt-3 space-y-3">
                            {email ? (
                                <div className="rounded-md border bg-secondary p-4">
                                    <p className="text-xs text-muted-foreground">Account</p>
                                    <p className="mt-2 text-sm font-medium">{email}</p>
                                </div>
                            ) : null}

                            {reason ? (
                                <div className="rounded-md border bg-secondary p-4">
                                    <p className="text-xs text-muted-foreground">Reason</p>
                                    <p className="mt-2 text-sm text-foreground">{reason}</p>
                                </div>
                            ) : null}

                            {displayExpiry && !Number.isNaN(displayExpiry.getTime()) ? (
                                <div className="rounded-md border bg-secondary p-4">
                                    <p className="text-xs text-muted-foreground">Suspension ends</p>
                                    <p className="mt-2 text-sm text-foreground">{displayExpiry.toLocaleString()}</p>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="mt-6 rounded-md border bg-secondary p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <RefreshCw className="size-4 text-muted-foreground" />
                            What to try
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {errorContent.help.map((item) => (
                                <li key={item} className="text-pretty">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button asChild variant="outline" className="w-full sm:flex-1">
                            <Link href="/login">Back to sign in</Link>
                        </Button>
                        <Button asChild className="w-full sm:flex-1">
                            <Link href="/">Go home</Link>
                        </Button>
                    </div>

                    {isBanned ? (
                        <div className="mt-3 rounded-md border bg-secondary px-4 py-3 text-sm text-muted-foreground text-pretty">
                            Contact your platform administrator if you need this suspension reviewed. If an expiry was set, access will return automatically after that time.
                        </div>
                    ) : null}
        </AuthScreenShell>
    )
}
