"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    disabled?: boolean | null
    createdAt?: string | Date | null
}

const normalizeOAuthClientItem = (value: Record<string, unknown>): OAuthClientItem => {
    const issuedAt = value.client_id_issued_at

    return {
        clientId: (value.clientId as string) ?? (value.client_id as string) ?? "",
        name: (value.name as string | null) ?? (value.client_name as string | null) ?? null,
        public: (value.public as boolean | null) ?? null,
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

export function OAuthClientsIndex() {
    const router = useRouter()
    const [clients, setClients] = useState<OAuthClientItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState("")

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold text-balance sm:text-2xl">
                        OAuth Clients
                    </h1>
                    <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
                        Create and manage standard OAuth clients for your account.
                    </p>
                </div>
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
                        <Link href="/settings/oauth-clients/new">
                            <Plus className="size-4" />
                            <span className="ml-2">Create client</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border bg-card">
                {loading ? (
                    <div className="space-y-2 p-6">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton key={index} className="h-11 w-full" />
                        ))}
                    </div>
                ) : clients.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-[var(--icon-soft)]">
                            <KeyRound className="size-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">No OAuth clients found for your account.</p>
                        <Button asChild size="sm">
                            <Link href="/settings/oauth-clients/new">
                                <Plus className="size-4 mr-1.5" />
                                Create your first client
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="hidden md:block">
                        <Table>
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
                                        onClick={() => router.push(`/settings/oauth-clients/${client.clientId}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault()
                                                router.push(`/settings/oauth-clients/${client.clientId}`)
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/settings/oauth-clients/${client.clientId}`}
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
                                        <TableCell className="text-sm text-muted-foreground">
                                            {client.public ? "Public" : "Confidential"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {client.disabled ? "Disabled" : "Active"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                                            {formatDate(client.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {!loading && clients.length > 0 ? (
                    <div className="space-y-3 p-4 md:hidden">
                        {clients.map((client) => (
                            <div key={client.clientId} className="rounded-lg border bg-background p-4">
                                <Link
                                    href={`/settings/oauth-clients/${client.clientId}`}
                                    className="block font-medium text-foreground hover:underline"
                                >
                                    {client.name ?? "Unnamed"}
                                </Link>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">
                                    {client.clientId}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge variant="outline" className="text-[11px]">
                                        {client.public ? "Public" : "Confidential"}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={client.disabled
                                            ? "border-destructive/25 bg-[var(--danger-soft)] text-destructive text-[11px]"
                                            : "border-[color:var(--success)]/25 bg-[var(--success-soft)] text-[color:var(--success)] text-[11px]"
                                        }
                                    >
                                        {client.disabled ? "Disabled" : "Active"}
                                    </Badge>
                                </div>
                                <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                                    {formatDate(client.createdAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
