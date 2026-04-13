"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Copy, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
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
import {
    AdminPageHeader,
    AdminSectionCard,
    AdminSectionContent,
    AdminSectionHeader,
} from "@/components/admin/admin-shell"
import { BUILTIN_SELF_SERVICE_SCOPE_KEYS } from "@/lib/oauth-scope-constants"

interface ScopeDefinition {
    key: string
    label: string
    description: string
    isSystem: boolean
    allowSelfService: boolean
    isActive: boolean
}

const SUBJECT_TYPE_OPTIONS = ["public", "pairwise"] as const

export function AdminCreateOAuthClientScreen() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [redirectUris, setRedirectUris] = useState("")
    const [isPublic, setIsPublic] = useState(false)
    const [skipConsent, setSkipConsent] = useState(false)
    const [enableEndSession, setEnableEndSession] = useState(false)
    const [requirePkce, setRequirePkce] = useState(true)
    const [subjectType, setSubjectType] = useState<(typeof SUBJECT_TYPE_OPTIONS)[number]>("public")
    const [clientSecretExpiresAt, setClientSecretExpiresAt] = useState("0")
    const [metadataText, setMetadataText] = useState("")
    const [selectedScopes, setSelectedScopes] = useState<Set<string>>(
        new Set(BUILTIN_SELF_SERVICE_SCOPE_KEYS),
    )
    const [availableScopes, setAvailableScopes] = useState<ScopeDefinition[]>([])
    const [scopesLoading, setScopesLoading] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Secret reveal dialog
    const [showSecret, setShowSecret] = useState(false)
    const [createdClientId, setCreatedClientId] = useState("")
    const [createdSecret, setCreatedSecret] = useState("")
    const [copiedField, setCopiedField] = useState<"id" | "secret" | null>(null)

    useEffect(() => {
        const loadScopes = async () => {
            setScopesLoading(true)
            try {
                const response = await fetch("/api/admin/oauth-scopes", {
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

                const scopes = (Array.isArray(result.scopes) ? result.scopes : []).filter(
                    (scope) => scope.isActive,
                )
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

        let metadata: Record<string, unknown> | undefined
        if (metadataText.trim()) {
            try {
                metadata = JSON.parse(metadataText) as Record<string, unknown>
            } catch {
                setError("Metadata must be valid JSON.")
                setLoading(false)
                return
            }
        }

        try {
            const response = await fetch("/api/admin/oauth-clients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_name: name.trim(),
                    redirect_uris: uris,
                    scope: Array.from(selectedScopes).join(" "),
                    ...(isPublic ? { token_endpoint_auth_method: "none" as const } : {}),
                    skip_consent: skipConsent,
                    enable_end_session: enableEndSession,
                    require_pkce: requirePkce,
                    subject_type: subjectType,
                    client_secret_expires_at: clientSecretExpiresAt.trim(),
                    ...(metadata ? { metadata } : {}),
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
                // Public client — no secret to show
                router.push(`/admin/oauth-clients/${newClientId}`)
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
            <AdminPageHeader
                title="Create OAuth client"
                description="Register an application to authenticate against this OAuth 2.1 server."
            />

            {error ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="xl:max-w-5xl border-t pt-8">
                <div className="mb-8">
                    <h2 className="text-lg font-medium text-foreground">New OAuth client</h2>
                    <p className="text-sm leading-6 text-muted-foreground text-pretty mt-1">
                        Configure the client type, redirect URIs, and permissions. Confidential clients
                        receive a one-time secret after creation.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start border-b pb-8">
                        <div className="space-y-1">
                            <label htmlFor="client-name" className="text-sm font-medium">Basic details</label>
                            <p className="text-sm text-muted-foreground">The display name of the application and its allowed callback URIs.</p>
                        </div>
                        <div className="w-full max-w-lg space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="client-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Name</label>
                                <Input
                                    id="client-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="My Application"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="redirect-uris" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Redirect URIs</label>
                                <Textarea
                                    id="redirect-uris"
                                    value={redirectUris}
                                    onChange={(event) => setRedirectUris(event.target.value)}
                                    placeholder={"https://app.example.com/callback\nhttps://app.example.com/auth/callback"}
                                    rows={3}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">One URI per line.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start border-b pb-8">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Security & Trust</p>
                            <p className="text-sm text-muted-foreground text-pretty">Define how this client behaves and whether it operates securely on a backend server or a public client.</p>
                        </div>
                        <div className="w-full max-w-lg space-y-3">
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
                            <label className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={skipConsent}
                                    onChange={(event) => setSkipConsent(event.target.checked)}
                                    className="mt-0.5 size-4"
                                />
                                <div>
                                    <span className="font-medium">Skip consent</span>
                                    <p className="text-xs text-muted-foreground text-pretty">
                                        Trusted first-party app — users skip the consent screen.
                                    </p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={requirePkce}
                                    onChange={(event) => setRequirePkce(event.target.checked)}
                                    className="mt-0.5 size-4"
                                />
                                <div>
                                    <span className="font-medium">Require PKCE</span>
                                    <p className="text-xs text-muted-foreground text-pretty">
                                        Keep this enabled for modern OAuth clients unless you have a specific compatibility requirement.
                                    </p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={enableEndSession}
                                    onChange={(event) => setEnableEndSession(event.target.checked)}
                                    className="mt-0.5 size-4"
                                />
                                <div>
                                    <span className="font-medium">Enable end session</span>
                                    <p className="text-xs text-muted-foreground text-pretty">
                                        Allow this client to log users out remotely via their ID token.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start border-b pb-8">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Scopes</p>
                            <p className="text-sm text-muted-foreground">Select the permissions this application is allowed to request.</p>
                        </div>
                        <div className="w-full max-w-lg space-y-3">
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
                                Active custom scopes appear here immediately after saving, but the OAuth provider will only issue them after restart or redeploy.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start border-b pb-8">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Advanced Configuration</p>
                            <p className="text-sm text-muted-foreground">Subject types, expiries, and private metadata.</p>
                        </div>
                        <div className="w-full max-w-lg space-y-6">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor="subject-type" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject type</label>
                                    <select
                                        id="subject-type"
                                        value={subjectType}
                                        onChange={(event) => setSubjectType(event.target.value as (typeof SUBJECT_TYPE_OPTIONS)[number])}
                                        className="flex h-10 w-full rounded-md border bg-muted px-3 py-2 text-sm"
                                    >
                                        {SUBJECT_TYPE_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-muted-foreground">
                                        `pairwise` requires a configured pairwise subject secret on the server.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="client-secret-expiry" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client secret expiry</label>
                                    <Input
                                        id="client-secret-expiry"
                                        value={clientSecretExpiresAt}
                                        onChange={(event) => setClientSecretExpiresAt(event.target.value)}
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        `0` means no expiry. You can also provide a supported custom value.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="client-metadata" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Private metadata JSON</label>
                                <Textarea
                                    id="client-metadata"
                                    value={metadataText}
                                    onChange={(event) => setMetadataText(event.target.value)}
                                    placeholder={'{"internalOwner":"platform","tier":"trusted"}'}
                                    rows={4}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Optional server-managed metadata stored with the OAuth client.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            size="sm"
                            disabled={loading || scopesLoading || selectedScopes.size === 0}
                        >
                            <KeyRound className="size-4" />
                            <span className="ml-2">{loading ? "Creating…" : "Create client"}</span>
                        </Button>
                    </div>
                </form>
            </div>

            {/* One-time secret reveal dialog */}
            <Dialog open={showSecret} onOpenChange={() => { /* prevent close via overlay */ }}>
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
                            <p className="text-xs font-medium text-muted-foreground">Client Secret</p>
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
                            onClick={() => router.push(`/admin/oauth-clients/${createdClientId}`)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
