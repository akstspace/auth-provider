"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, RefreshCw, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminMetricCard, AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-shell"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { DEFAULT_ADMIN_LIST_QUERY, formatAdminError, formatDateTime, getAdminStats, listAdminUsers } from "@/lib/admin-data"
import { formatRoleList } from "@/lib/platform-admin"

export function AdminOverviewScreen() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState("")
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAdmins: 0,
        totalBanned: 0,
        totalVerified: 0,
    })
    const [recentUsers, setRecentUsers] = useState<
        Array<{
            id: string
            name: string
            email: string
            role?: string | null
            createdAt?: string | Date | null
            banned?: boolean | null
            emailVerified: boolean
        }>
    >([])

    const loadPage = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true)
        if (!isManualRefresh) setLoading(true)
        setError("")

        try {
            const [statsResult, usersResult] = await Promise.all([
                getAdminStats(),
                listAdminUsers({ ...DEFAULT_ADMIN_LIST_QUERY, limit: 6 }),
            ])

            if (statsResult.error) {
                setError(statsResult.error)
            }
            if (usersResult.error) {
                setError((current) => current || usersResult.error || "")
            }

            if (statsResult.data) setStats(statsResult.data)
            if (usersResult.data) setRecentUsers(usersResult.data.users)
        } catch (err) {
            setError(formatAdminError(err, "Failed to load admin overview."))
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        void loadPage()
    }, [])

    return (
        <div className="space-y-8">
            <AdminPageHeader
                title="Overview"
                description="Monitor account health, review recent users, and jump quickly into the admin actions you need most."
                action={
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadPage(true)}
                        disabled={refreshing}
                        className="w-full sm:w-auto"
                    >
                        <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                        <span className="ml-2">Refresh</span>
                    </Button>
                }
            />

            {error ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminMetricCard
                    label="Total users"
                    value={loading ? "..." : stats.totalUsers}
                    description="All accounts currently stored in Better Auth."
                />
                <AdminMetricCard
                    label="Platform admins"
                    value={loading ? "..." : stats.totalAdmins}
                    description="Users who currently have the default admin role."
                />
                <AdminMetricCard
                    label="Banned users"
                    value={loading ? "..." : stats.totalBanned}
                    description="Accounts blocked from signing in right now."
                />
                <AdminMetricCard
                    label="Verified emails"
                    value={loading ? "..." : stats.totalVerified}
                    description="Accounts with completed email verification."
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Recent users</CardTitle>
                        <CardDescription className="text-sm leading-6 text-pretty">
                            A fast way into user detail pages without loading the heavier management view first.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading ? (
                            <>
                                <div className="hidden space-y-2 md:block">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <Skeleton key={index} className="h-11 w-full" />
                                    ))}
                                </div>
                                <div className="space-y-3 md:hidden">
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <Skeleton key={index} className="h-24 w-full rounded-lg" />
                                    ))}
                                </div>
                            </>
                        ) : recentUsers.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                No users found yet.
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block">
                                    <div className="overflow-hidden rounded-lg border">
                                        <Table className="min-w-[620px]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Role</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Created</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recentUsers.map((user) => (
                                                    <TableRow
                                                        key={user.id}
                                                        role="link"
                                                        tabIndex={0}
                                                        className="cursor-pointer"
                                                        onClick={() => router.push(`/admin/users/${user.id}`)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter" || event.key === " ") {
                                                                event.preventDefault()
                                                                router.push(`/admin/users/${user.id}`)
                                                            }
                                                        }}
                                                    >
                                                        <TableCell>
                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={`/admin/users/${user.id}`}
                                                                    className="block truncate font-medium text-foreground hover:underline"
                                                                    onClick={(event) => event.stopPropagation()}
                                                                    onKeyDown={(event) => event.stopPropagation()}
                                                                >
                                                                    {user.name}
                                                                </Link>
                                                                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <AdminStatusBadge label={formatRoleList(user.role) || "user"} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-2">
                                                                {user.banned ? (
                                                                    <AdminStatusBadge label="Banned" tone="danger" />
                                                                ) : (
                                                                    <AdminStatusBadge label="Active" tone="success" />
                                                                )}
                                                                {user.emailVerified ? (
                                                                    <AdminStatusBadge label="Verified" tone="success" />
                                                                ) : (
                                                                    <AdminStatusBadge label="Unverified" tone="warning" />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                                                            {formatDateTime(user.createdAt)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="space-y-3 md:hidden">
                                    {recentUsers.map((user) => (
                                        <div key={user.id} className="rounded-lg border bg-background p-4">
                                            <Link
                                                href={`/admin/users/${user.id}`}
                                                className="block font-medium text-foreground hover:underline"
                                            >
                                                {user.name}
                                            </Link>
                                            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <AdminStatusBadge label={formatRoleList(user.role) || "user"} />
                                                {user.banned ? (
                                                    <AdminStatusBadge label="Banned" tone="danger" />
                                                ) : (
                                                    <AdminStatusBadge label="Active" tone="success" />
                                                )}
                                                {user.emailVerified ? (
                                                    <AdminStatusBadge label="Verified" tone="success" />
                                                ) : (
                                                    <AdminStatusBadge label="Unverified" tone="warning" />
                                                )}
                                            </div>
                                            <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                                                {formatDateTime(user.createdAt)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Quick actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button asChild variant="outline" size="sm" className="w-full justify-between">
                            <Link href="/admin/users">
                                <span className="inline-flex items-center gap-2">
                                    <Users className="size-4" />
                                    Manage users
                                </span>
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="w-full justify-between">
                            <Link href="/admin/users/new">
                                <span className="inline-flex items-center gap-2">
                                    <UserPlus className="size-4" />
                                    Create user
                                </span>
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
