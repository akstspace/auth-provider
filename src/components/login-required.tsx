"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { withAuthFlow } from "@/lib/auth-flow"
import { buildAuthErrorUrl } from "@/lib/banned-user"

function LoginRequiredInner({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const callbackUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`

    useEffect(() => {
        if (!isPending) {
            if (searchParams.get("error") === "banned") {
                router.replace(
                    buildAuthErrorUrl({
                        error: "banned",
                        errorDescription: searchParams.get("error_description"),
                        email: searchParams.get("email"),
                    }),
                )
            } else if (!session?.user) {
                router.replace(withAuthFlow("/login", { callbackUrl }))
            } else if (!session.user.emailVerified) {
                router.replace(
                    withAuthFlow(
                        `/verify-email?email=${encodeURIComponent(session.user.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
                        {},
                    ),
                )
            }
        }
    }, [callbackUrl, isPending, router, searchParams, session])

    if (
        isPending ||
        searchParams.get("error") === "banned" ||
        !session?.user ||
        !session?.user?.emailVerified
    ) {
        return null
    }

    return <>{children}</>
}

/**
 * Wraps a page so that unauthenticated users are redirected to /login.
 * Shows nothing while the session is loading; renders children once
 * an authenticated session is confirmed.
 */
export function LoginRequired({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <LoginRequiredInner>{children}</LoginRequiredInner>
        </Suspense>
    )
}
