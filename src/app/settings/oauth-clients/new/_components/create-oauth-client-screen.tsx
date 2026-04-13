"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Copy, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { BUILTIN_SELF_SERVICE_SCOPE_KEYS } from "@/lib/oauth-scope-constants"

interface ScopeDefinition {
    key: string
    label: string
    description: string
    allowSelfService: boolean
}

export function CreateOAuthClientScreen() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [redirectUris, setRedirectUris] = useState("")
    const [isPublic, setIsPublic] = useState(false)
    const [selectedScopes, setSelectedScopes] = useState<Set<string>>(
        new Set(BUILTIN_SELF_SERVICE_SCOPE_KEYS),
    )
    const [availableScopes, setAvailableScopes] = useState<ScopeDefinition[]>([])
    const [scopesLoading, setScopesLoading] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showSecret, setShowSecret] = useState(false)
    const [createdClientId, setCreatedClientId] = useState("")
    const [createdSecret, setCreatedSecret] = useState("")
    const [copiedField, setCopiedField] = useState<"id" | "secret" | null>(null)

    useEffect(() => {
        const loadScopes = async () => {
            setScopesLoading(true)
            try {
                const response = await fetch("/api/oauth-scopes?mode=self-service", {
                    cache: "no-store",
                })
                const result = (await response.json()) as {
                    error?: string
                    scopes?: ScopeDefinition[]
                }

                if (!response.ok) {
                    setError(result.error ?? "Failed to load OAuth scopes.")
                    return
                }

                const scopes = Array.isArray(result.scopes) ? result.scopes : []
                setAvailableScopes(scopes)
                setSelectedScopes((prev) => {
                    const next = new Set(
                        Array.from(prev).filter((scope) => scopes.some((item) => item.key === scope)),
                    )
                    if (next.size === 0) {
                        scopes
                            .filter((scope) => BUILTIN_SELF_SERVICE_SCOPE_KEYS.includes(scope.key))
                            .forEach((scope) => next.add(scope.key))
                    }
                    return next
                })
            } catch {
                setError("Failed to load OAuth scopes.")
            } finally {
                setScopesLoading(false)
            }
        }

        void loadScopes()
    }, [])

    const toggleScope = (scope: string) => {
        setSelectedScopes((prev) => {
            const next = new Set(prev)
            if (next.has(scope)) next.delete(scope)
            else next.add(scope)
            return next
        })
    }

    const copyToClipboard = async (value: string, field: "id" | "secret") => {
        await navigator.clipboard.writeText(value)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError("")

        const uris = redirectUris
            .split("\n")
            .map((uri) => uri.trim())
            .filter(Boolean)

        if (uris.length === 0) {
            setError("At least one redirect URI is required.")
            setLoading(false)
            return
        }

        try {
            const response = await fetch("/api/oauth-clients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_name: name.trim(),
                    redirect_uris: uris,
                    scope: Array.from(selectedScopes).join(" "),
                    ...(isPublic ? { token_endpoint_auth_method: "none" as const } : {}),
                }),
            })

            const result = (await response.json()) as Record<string, unknown> & {
                error?: string
            }

            if (!response.ok) {
                setError(result.error ?? "Failed to create OAuth client.")
                return
            }

            const newClientId = (result.client_id as string) ?? (result.clientId as string) ?? ""
            const newSecret = (result.client_secret as string) ?? (result.clientSecret as string) ?? ""

            if (!newClientId) {
                setError("OAuth client was created, but no client ID was returned.")
                return
            }

            if (newSecret) {
                setCreatedClientId(newClientId)
                setCreatedSecret(newSecret)
                setShowSecret(true)
            } else {
                router.push(`/settings/oauth-clients/${newClientId}`)
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create OAuth client.",
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h1 className="text-xl font-bold text-balance sm:text-2xl">
                    Create OAuth client
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
                    Register a standard OAuth client for your account.
                </p>
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <Card className="xl:max-w-4xl">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">New OAuth client</CardTitle>
                    <CardDescription className="text-sm leading-6 text-pretty">
                        Configure the client type, redirect URIs, and scopes. Confidential clients
                        receive a one-time secret after creation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="client-name" className="text-sm font-medium">Client name</label>
                            <Input
                                id="client-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="My Application"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="redirect-uris" className="text-sm font-medium">Redirect URIs</label>
                            <Textarea
                                id="redirect-uris"
                                value={redirectUris}
                                onChange={(event) => setRedirectUris(event.target.value)}
                                placeholder={"https://app.example.com/callback\nhttps://app.example.com/auth/callback"}
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground">One URI per line.</p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-medium">Scopes</p>
                            <div className="grid gap-2">
                                {scopesLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading available scopes…</p>
                                ) : null}
                                {availableScopes.map((scope) => (
                                    <label
                                        key={scope.key}
                                        className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted px-3 py-3 text-sm transition-colors hover:bg-accent"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedScopes.has(scope.key)}
                                            onChange={() => toggleScope(scope.key)}
                                            className="mt-0.5 size-3.5"
                                        />
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{scope.label}</span>
                                                <code className="rounded-md border bg-background px-1.5 py-0.5 text-[11px]">
                                                    {scope.key}
                                                </code>
                                            </div>
                                            <p className="text-xs text-muted-foreground text-pretty">
                                                {scope.description}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground text-pretty">
                                Self-service clients can only use scopes marked safe by a platform admin. Refresh-token access remains reserved for privileged clients.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Client type</p>
                            <label className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(event) => setIsPublic(event.target.checked)}
                                    className="mt-0.5 size-4"
                                />
                                <div>
                                    <span className="font-medium">Public client</span>
                                    <p className="text-xs text-muted-foreground text-pretty">
                                        No client secret. For native mobile apps or browser-based apps (SPAs).
                                    </p>
                                </div>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            size="sm"
                            disabled={loading || scopesLoading || selectedScopes.size === 0}
                        >
                            <KeyRound className="size-4" />
                            <span className="ml-2">{loading ? "Creating…" : "Create client"}</span>
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={showSecret} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-4 text-[color:var(--warning)]" />
                            Client credentials created
                        </DialogTitle>
                        <DialogDescription className="text-pretty">
                            Copy the client secret now — it will not be shown again.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Client ID</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm font-mono truncate">
                                    {createdClientId}
                                </code>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void copyToClipboard(createdClientId, "id")}
                                    aria-label="Copy client ID"
                                >
                                    {copiedField === "id" ? (
                                        <Check className="size-3.5 text-[color:var(--success)]" />
                                    ) : (
                                        <Copy className="size-3.5" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Client secret</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm font-mono truncate">
                                    {createdSecret}
                                </code>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void copyToClipboard(createdSecret, "secret")}
                                    aria-label="Copy client secret"
                                >
                                    {copiedField === "secret" ? (
                                        <Check className="size-3.5 text-[color:var(--success)]" />
                                    ) : (
                                        <Copy className="size-3.5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            onClick={() => router.push(`/settings/oauth-clients/${createdClientId}`)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
