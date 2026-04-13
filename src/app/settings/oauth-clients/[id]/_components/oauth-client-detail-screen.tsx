"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import {
    Copy,
    Check,
    Trash2,
    RefreshCw,
    Globe,
    AlertTriangle,
    Settings2,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface OAuthClientDetail {
    clientId: string
    name?: string | null
    uri?: string | null
    public?: boolean | null
    disabled?: boolean | null
    skipConsent?: boolean | null
    enableEndSession?: boolean | null
    scopes?: string[] | null
    redirectUris?: string[] | null
    grantTypes?: string[] | null
    tokenEndpointAuthMethod?: string | null
    createdAt?: string | Date | null
    updatedAt?: string | Date | null
}

const normalizeOAuthClientDetail = (value: Record<string, unknown>): OAuthClientDetail => {
    const issuedAt = value.client_id_issued_at

    return {
        clientId: (value.clientId as string) ?? (value.client_id as string) ?? "",
        name: (value.name as string | null) ?? (value.client_name as string | null) ?? null,
        uri: (value.uri as string | null) ?? (value.client_uri as string | null) ?? null,
        public: (value.public as boolean | null) ?? null,
        disabled: (value.disabled as boolean | null) ?? null,
        skipConsent:
            (value.skipConsent as boolean | null) ?? (value.skip_consent as boolean | null) ?? null,
        enableEndSession:
            (value.enableEndSession as boolean | null) ??
            (value.enable_end_session as boolean | null) ??
            null,
        scopes:
            (value.scopes as string[] | null) ??
            (typeof value.scope === "string" ? (value.scope as string).split(" ").filter(Boolean) : null),
        redirectUris:
            (value.redirectUris as string[] | null) ??
            (value.redirect_uris as string[] | null) ??
            null,
        grantTypes:
            (value.grantTypes as string[] | null) ?? (value.grant_types as string[] | null) ?? null,
        tokenEndpointAuthMethod:
            (value.tokenEndpointAuthMethod as string | null) ??
            (value.token_endpoint_auth_method as string | null) ??
            null,
        createdAt:
            (value.createdAt as string | Date | null) ??
            (typeof issuedAt === "number" ? new Date(issuedAt * 1000) : null),
        updatedAt: (value.updatedAt as string | Date | null) ?? null,
    }
}

const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return "—"
    const d = typeof value === "string" ? new Date(value) : value
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export function OAuthClientDetailScreen({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: clientId } = use(params)
    const router = useRouter()

    const [client, setClient] = useState<OAuthClientDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [deleting, setDeleting] = useState(false)
    const [rotating, setRotating] = useState(false)
    const [showRotatedSecret, setShowRotatedSecret] = useState(false)
    const [rotatedSecret, setRotatedSecret] = useState("")
    const [copiedSecret, setCopiedSecret] = useState(false)
    
    const [showEditClient, setShowEditClient] = useState(false)
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState("")
    const [editRedirectUris, setEditRedirectUris] = useState("")

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const result = await authClient.oauth2.getClient({
                    query: { client_id: clientId },
                })
                if (result.error) {
                    setError("Failed to load client details.")
                } else if (result.data) {
                    setClient(normalizeOAuthClientDetail(result.data as Record<string, unknown>))
                }
            } catch {
                setError("Failed to load client details.")
            } finally {
                setLoading(false)
            }
        }
        void fetchClient()
    }, [clientId])

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const result = await authClient.oauth2.deleteClient({
                client_id: clientId,
            })
            if (result.error) {
                setError("Failed to delete client.")
                setDeleting(false)
            } else {
                router.push("/settings/oauth-clients")
            }
        } catch {
            setError("Failed to delete client.")
            setDeleting(false)
        }
    }

    const handleRotateSecret = async () => {
        setRotating(true)
        try {
            const result = await authClient.oauth2.client.rotateSecret({
                client_id: clientId,
            })
            if (result.error) {
                setError("Failed to rotate secret.")
            } else {
                const data = result.data as Record<string, unknown>
                const newSecret = (data?.client_secret as string) ?? (data?.clientSecret as string) ?? ""
                setRotatedSecret(newSecret)
                setShowRotatedSecret(true)
            }
        } catch {
            setError("Failed to rotate secret.")
        } finally {
            setRotating(false)
        }
    }

    const copySecret = async () => {
        await navigator.clipboard.writeText(rotatedSecret)
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 2000)
    }

    const openEdit = () => {
        setEditName(client?.name || "")
        setEditRedirectUris(client?.redirectUris?.join('\n') || "")
        setShowEditClient(true)
    }

    const handleEditClient = async (e: React.FormEvent) => {
        e.preventDefault()
        setEditing(true)
        setError("")
        const uris = editRedirectUris.split("\n").map(u => u.trim()).filter(Boolean)
        
        try {
            const result = await authClient.oauth2.updateClient({
                client_id: clientId,
                update: {
                    name: editName,
                    client_name: editName,
                    redirectUris: uris,
                    redirect_uris: uris,
                } as any
            })
            if (result.error) {
                setError(result.error.message || "Failed to update client")
            } else {
                setClient(normalizeOAuthClientDetail(result.data as Record<string, unknown>))
                setShowEditClient(false)
            }
        } catch {
            setError("Failed to update client")
        } finally {
            setEditing(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold text-balance sm:text-2xl">
                        OAuth client
                    </h1>
                    <p className="text-sm text-muted-foreground">Loading client details…</p>
                </div>
                <div className="space-y-4 rounded-lg border bg-card p-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    if (!client) {
        return (
            <div className="space-y-8">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold text-balance sm:text-2xl">
                        OAuth client
                    </h1>
                    <p className="text-sm text-muted-foreground">Client not found.</p>
                </div>
                {error ? (
                    <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h1 className="text-xl font-bold text-balance sm:text-2xl">
                    {client.name ?? "Unnamed client"}
                </h1>
                <p className="text-sm text-muted-foreground">Client ID: {client.clientId}</p>
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="rounded-lg border bg-card">
                <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium">Client details</h2>
                        <p className="text-sm text-muted-foreground text-pretty">
                            Manage a standard OAuth client owned by your account.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openEdit}
                            className="gap-2"
                        >
                            <Settings2 className="size-4" />
                            Edit Configuration
                        </Button>

                        {!client.public ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleRotateSecret()}
                                disabled={rotating}
                                className="gap-2"
                            >
                                <RefreshCw className={`size-4 ${rotating ? "animate-spin" : ""}`} />
                                {rotating ? "Rotating…" : "Rotate client secret"}
                            </Button>
                        ) : null}

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-destructive hover:text-destructive"
                                    disabled={deleting}
                                >
                                    <Trash2 className="size-4" />
                                    {deleting ? "Deleting…" : "Delete client"}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete OAuth client?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-pretty">
                                        This will permanently revoke all tokens issued to this client and remove
                                        it. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => void handleDelete()}
                                        className=""
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <div className="space-y-5 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Client ID</p>
                            <p className="text-sm font-mono truncate">{client.clientId}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Type</p>
                            <p className="text-sm">{client.public ? "Public" : "Confidential"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Status</p>
                            <p className="text-sm">{client.disabled ? "Disabled" : "Active"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Auth method</p>
                            <p className="text-sm">{client.tokenEndpointAuthMethod ?? "client_secret_post"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Created</p>
                            <p className="text-sm tabular-nums">{formatDate(client.createdAt)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Updated</p>
                            <p className="text-sm tabular-nums">{formatDate(client.updatedAt)}</p>
                        </div>
                    </div>

                    {client.uri ? (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Website</p>
                            <div className="flex items-center gap-1.5 text-sm">
                                <Globe className="size-3.5 text-muted-foreground" />
                                <a
                                    href={client.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                >
                                    {client.uri}
                                </a>
                            </div>
                        </div>
                    ) : null}

                    {client.scopes && client.scopes.length > 0 ? (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Scopes</p>
                            <div className="flex flex-wrap gap-1.5">
                                {client.scopes.map((scope) => (
                                    <Badge
                                        key={scope}
                                        variant="outline"
                                        className="border bg-muted font-mono text-[11px]"
                                    >
                                        {scope}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {client.redirectUris && client.redirectUris.length > 0 ? (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Redirect URIs</p>
                            <div className="space-y-1">
                                {client.redirectUris.map((uri) => (
                                    <p key={uri} className="text-sm font-mono truncate text-muted-foreground">
                                        {uri}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <Dialog open={showRotatedSecret} onOpenChange={setShowRotatedSecret}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-4 text-[color:var(--warning)]" />
                            New client secret
                        </DialogTitle>
                        <DialogDescription className="text-pretty">
                            The previous secret has been invalidated. Copy this new secret — it will not be shown again.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="pt-2">
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm font-mono truncate">
                                {rotatedSecret}
                            </code>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void copySecret()}
                                aria-label="Copy new client secret"
                            >
                                {copiedSecret ? (
                                    <Check className="size-3.5 text-[color:var(--success)]" />
                                ) : (
                                    <Copy className="size-3.5" />
                                )}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button type="button" onClick={() => setShowRotatedSecret(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Configuration</DialogTitle>
                        <DialogDescription>
                            Update the basic metadata and redirect URIs of your OAuth client.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditClient} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Client name</label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="My Application"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Redirect URIs</label>
                            <Textarea
                                value={editRedirectUris}
                                onChange={(e) => setEditRedirectUris(e.target.value)}
                                placeholder={"https://app.example.com/callback"}
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">One URI per line.</p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditClient(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editing}>
                                {editing ? "Saving…" : "Save changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
