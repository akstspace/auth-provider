"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-shell"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { authClient } from "@/lib/auth-client"

interface OAuthClientItem {
    clientId: string
    name?: string | null
    public?: boolean | null
    scopes?: string[] | null
    disabled?: boolean | null
    createdAt?: string | Date | null
}

const normalizeOAuthClientItem = (value: Record<string, unknown>): OAuthClientItem => {
    const issuedAt = value.client_id_issued_at

    return {
        clientId: (value.clientId as string) ?? (value.client_id as string) ?? "",
        name: (value.name as string | null) ?? (value.client_name as string | null) ?? null,
        public: (value.public as boolean | null) ?? null,
        scopes:
            (value.scopes as string[] | null) ??
            (typeof value.scope === "string" ? (value.scope as string).split(" ").filter(Boolean) : null),
        disabled: (value.disabled as boolean | null) ?? null,
        createdAt:
            (value.createdAt as string | Date | null) ??
            (typeof issuedAt === "number" ? new Date(issuedAt * 1000) : null),
    }
}

const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return "—"
    const d = typeof value === "string" ? new Date(value) : value
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function AdminOAuthClientsScreen() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState("")
    const [clients, setClients] = useState<OAuthClientItem[]>([])

    const loadClients = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError("")

        try {
            const result = await authClient.oauth2.getClients()
            if (result.error) {
                setError("Failed to load OAuth clients.")
            } else if (result.data) {
                const items = Array.isArray(result.data)
                    ? result.data.map((item) => normalizeOAuthClientItem(item as Record<string, unknown>))
                    : []
                setClients(items.filter((item) => item.clientId))
            }
        } catch {
            setError("Failed to load OAuth clients.")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        void loadClients()
    }, [])

    return (
        <div className="space-y-8">
            <AdminPageHeader
                title="OAuth Clients"
                description="Manage registered OAuth 2.1 clients that can authenticate against this server."
                action={
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void loadClients(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                            <span className="ml-2">Refresh</span>
                        </Button>
                        <Button asChild size="sm">
                            <Link href="/admin/oauth-clients/new">
                                <Plus className="size-4" />
                                <span className="ml-2">Create client</span>
                            </Link>
                        </Button>
                    </div>
                }
            />

            {error ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">Ownership visibility note</p>
                <p className="mt-1 text-pretty">
                    This page shows the OAuth clients owned by the currently signed-in admin account.
                    Even platform admins do not get cross-owner delete or management here.
                    To inspect or change OAuth clients owned by other users, update the database directly.
                </p>
            </div>

            <Card className="border-border/50 bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">Registered clients</CardTitle>
                    <CardDescription className="text-sm leading-6 text-pretty">
                        Manage registered OAuth 2.1 clients that can authenticate against this server.
                        Each client represents an application that can request OAuth authorization.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <>
                            <div className="hidden space-y-2 md:block">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <Skeleton key={index} className="h-11 w-full" />
                                ))}
                            </div>
                            <div className="space-y-3 md:hidden">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <Skeleton key={index} className="h-24 w-full rounded-xl" />
                                ))}
                            </div>
                        </>
                    ) : clients.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
                            <KeyRound className="mx-auto size-8 text-muted-foreground/60 mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">No OAuth clients registered yet.</p>
                            <Button asChild size="sm">
                                <Link href="/admin/oauth-clients/new">
                                    <Plus className="size-4 mr-1.5" />
                                    Create your first client
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block">
                                <div className="overflow-hidden rounded-xl border border-border/60">
                                    <Table className="min-w-[620px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name / Client ID</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Created</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clients.map((client) => (
                                                <TableRow
                                                    key={client.clientId}
                                                    role="link"
                                                    tabIndex={0}
                                                    className="cursor-pointer"
                                                    onClick={() => router.push(`/admin/oauth-clients/${client.clientId}`)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter" || event.key === " ") {
                                                            event.preventDefault()
                                                            router.push(`/admin/oauth-clients/${client.clientId}`)
                                                        }
                                                    }}
                                                >
                                                    <TableCell>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/admin/oauth-clients/${client.clientId}`}
                                                                className="block truncate font-medium text-foreground hover:underline"
                                                                onClick={(event) => event.stopPropagation()}
                                                                onKeyDown={(event) => event.stopPropagation()}
                                                            >
                                                                {client.name ?? "Unnamed"}
                                                            </Link>
                                                            <p className="truncate text-xs text-muted-foreground font-mono">
                                                                {client.clientId}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <AdminStatusBadge
                                                            label={client.public ? "Public" : "Confidential"}
                                                            tone={client.public ? "warning" : "default"}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {client.disabled ? (
                                                            <AdminStatusBadge label="Disabled" tone="danger" />
                                                        ) : (
                                                            <AdminStatusBadge label="Active" tone="success" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                                                        {formatDate(client.createdAt)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Mobile cards */}
                            <div className="space-y-3 md:hidden">
                                {clients.map((client) => (
                                    <div key={client.clientId} className="rounded-xl border border-border/60 p-4">
                                        <Link
                                            href={`/admin/oauth-clients/${client.clientId}`}
                                            className="block font-medium text-foreground hover:underline"
                                        >
                                            {client.name ?? "Unnamed"}
                                        </Link>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">
                                            {client.clientId}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <AdminStatusBadge
                                                label={client.public ? "Public" : "Confidential"}
                                                tone={client.public ? "warning" : "default"}
                                            />
                                            {client.disabled ? (
                                                <AdminStatusBadge label="Disabled" tone="danger" />
                                            ) : (
                                                <AdminStatusBadge label="Active" tone="success" />
                                            )}
                                        </div>
                                        <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                                            {formatDate(client.createdAt)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
