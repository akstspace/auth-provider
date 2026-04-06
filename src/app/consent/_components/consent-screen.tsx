"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { Check, Shield, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient } from "@/lib/auth-client"
import { pageEnterMotion } from "@/lib/motion"

interface ScopeDefinition {
    key: string
    label: string
    description: string
}

const getHostname = (value: string) => {
    try {
        return new URL(value).hostname
    } catch {
        return value
    }
}

export function ConsentScreen() {
    const searchParams = useSearchParams()
    const clientId = searchParams.get("client_id") ?? ""
    const scopeParam = searchParams.get("scope") ?? ""
    const scopes = scopeParam.split(" ").filter(Boolean)
    const scopeKeysParam = scopes.join(",")

    const [clientInfo, setClientInfo] = useState<{
        name?: string | null
        icon?: string | null
        uri?: string | null
    } | null>(null)
    const [scopeDefinitions, setScopeDefinitions] = useState<Record<string, ScopeDefinition>>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!clientId) {
            setError("Missing client information.")
            setLoading(false)
            return
        }

        const fetchClient = async () => {
            try {
                const [clientResult, scopeResponse] = await Promise.all([
                    authClient.oauth2.publicClient({
                        query: {
                            client_id: clientId,
                        },
                    }),
                    fetch(`/api/oauth-scopes?keys=${encodeURIComponent(scopeKeysParam)}`, {
                        cache: "no-store",
                    }),
                ])

                if (clientResult.error) {
                    setError("Unable to load application details.")
                } else if (clientResult.data) {
                    const d = clientResult.data as Record<string, unknown>
                    setClientInfo({
                        name: (d.name as string) ?? null,
                        icon: (d.icon as string) ?? null,
                        uri: (d.uri as string) ?? null,
                    })
                }

                if (scopeResponse.ok) {
                    const scopePayload = (await scopeResponse.json()) as {
                        scopes?: ScopeDefinition[]
                    }
                    const nextScopeDefinitions = Object.fromEntries(
                        (scopePayload.scopes ?? []).map((scope) => [scope.key, scope]),
                    )
                    setScopeDefinitions(nextScopeDefinitions)
                }
            } catch {
                setError("Unable to load application details.")
            } finally {
                setLoading(false)
            }
        }

        void fetchClient()
    }, [clientId, scopeKeysParam])

    const handleConsent = async (accept: boolean) => {
        setSubmitting(true)
        setError("")
        try {
            const result = await authClient.oauth2.consent({
                accept,
                ...(accept && scopeParam ? { scope: scopeParam } : {}),
            })
            if (result.error) {
                setError(accept ? "Failed to grant consent." : "Failed to deny consent.")
                setSubmitting(false)
            }
        } catch {
            setError("An unexpected error occurred.")
            setSubmitting(false)
        }
    }

    const appName = clientInfo?.name ?? "An application"

    return (
        <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
            <motion.div {...pageEnterMotion} className="w-full max-w-sm">
                <div className="mb-6">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                            <Shield className="size-4 text-foreground" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-balance">Authorize access</h1>
                    <p className="text-sm text-muted-foreground mt-1 text-pretty">
                        Review the permissions below before continuing.
                    </p>
                </div>

                {error ? (
                    <div
                        role="alert"
                        className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4"
                    >
                        {error}
                    </div>
                ) : null}

                <Card className="border-border/50 bg-card">
                    <CardHeader className="pb-3">
                        {loading ? (
                            <Skeleton className="h-5 w-40" />
                        ) : (
                            <CardTitle className="text-base font-medium text-balance">
                                {appName}
                                <span className="text-muted-foreground font-normal"> wants to access your account</span>
                            </CardTitle>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <Skeleton key={index} className="h-10 w-full" />
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Permissions requested
                                    </p>
                                    <div className="space-y-1.5">
                                        {scopes.map((scope) => {
                                            const info = scopeDefinitions[scope]
                                            return (
                                                <div
                                                    key={scope}
                                                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                                                >
                                                    <Check className="size-3.5 text-emerald-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {info?.label ?? scope}
                                                        </p>
                                                        {info?.description ? (
                                                            <p className="text-xs text-muted-foreground text-pretty">
                                                                {info.description}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {clientInfo?.uri ? (
                                    <div className="flex items-center gap-2 pt-1">
                                        <Badge variant="outline" className="text-[11px] font-normal border-border/60 bg-muted/70">
                                            {getHostname(clientInfo.uri)}
                                        </Badge>
                                    </div>
                                ) : null}
                            </>
                        )}

                        <div className="flex gap-2.5 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 gap-1.5"
                                disabled={submitting || loading}
                                onClick={() => void handleConsent(false)}
                            >
                                <X className="size-3.5" />
                                Deny
                            </Button>
                            <Button
                                type="button"
                                className="flex-1 gap-1.5"
                                disabled={submitting || loading}
                                onClick={() => void handleConsent(true)}
                            >
                                <Check className="size-3.5" />
                                {submitting ? "Authorizing…" : "Authorize"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <p className="mt-4 text-center text-[11px] text-muted-foreground text-pretty">
                    You can revoke access at any time from your account settings.
                </p>
            </motion.div>
        </div>
    )
}
