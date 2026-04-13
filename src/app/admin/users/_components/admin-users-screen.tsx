"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AdminPageHeader,
    AdminSectionCard,
    AdminSectionContent,
    AdminSectionHeader,
    AdminStatusBadge,
} from "@/components/admin/admin-shell"
import {
    DEFAULT_ADMIN_LIST_QUERY,
    type AdminFilterKey,
    type AdminListQuery,
    type AdminSearchField,
    type AdminSearchOperator,
    type AdminSortDirection,
    formatDateTime,
    listAdminUsers,
} from "@/lib/admin-data"
import { formatRoleList } from "@/lib/platform-admin"

const FILTER_OPTIONS: { value: AdminFilterKey; label: string }[] = [
    { value: "all", label: "All users" },
    { value: "admins", label: "Admins" },
    { value: "users", label: "Users" },
    { value: "banned", label: "Banned" },
    { value: "active", label: "Active" },
    { value: "verified", label: "Verified" },
    { value: "unverified", label: "Unverified" },
]

const SEARCH_OPERATOR_OPTIONS: { value: AdminSearchOperator; label: string }[] = [
    { value: "contains", label: "Contains" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
]

const SORT_OPTIONS = [
    { value: "createdAt:desc", label: "Created (newest)" },
    { value: "createdAt:asc", label: "Created (oldest)" },
    { value: "name:asc", label: "Name (A-Z)" },
    { value: "name:desc", label: "Name (Z-A)" },
    { value: "email:asc", label: "Email (A-Z)" },
    { value: "email:desc", label: "Email (Z-A)" },
]

export function AdminUsersScreen() {
    const router = useRouter()
    const [draftQuery, setDraftQuery] = useState<AdminListQuery>(DEFAULT_ADMIN_LIST_QUERY)
    const [query, setQuery] = useState<AdminListQuery>(DEFAULT_ADMIN_LIST_QUERY)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [users, setUsers] = useState<Array<{
        id: string
        name: string
        email: string
        role?: string | null
        createdAt?: string | Date | null
        banned?: boolean | null
        emailVerified: boolean
    }>>([])
    const [total, setTotal] = useState(0)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError("")

            const result = await listAdminUsers(query)
            if (result.error) {
                setError(result.error)
                setUsers([])
                setTotal(0)
            } else if (result.data) {
                setUsers(result.data.users)
                setTotal(result.data.total)
            }

            setLoading(false)
        }

        void load()
    }, [query])

    const safeLimit = Number(query.limit) || 1
    const safeOffset = Number(query.offset) || 0
    const totalPages = Math.max(1, Math.ceil(total / safeLimit))
    const currentPage = Math.floor(safeOffset / safeLimit) + 1
    const hasActiveFilters =
        Boolean(draftQuery.searchValue.trim()) ||
        draftQuery.searchField !== DEFAULT_ADMIN_LIST_QUERY.searchField ||
        draftQuery.searchOperator !== DEFAULT_ADMIN_LIST_QUERY.searchOperator ||
        draftQuery.filterKey !== DEFAULT_ADMIN_LIST_QUERY.filterKey ||
        draftQuery.sortBy !== DEFAULT_ADMIN_LIST_QUERY.sortBy ||
        draftQuery.sortDirection !== DEFAULT_ADMIN_LIST_QUERY.sortDirection

    const resetFilters = () => {
        setDraftQuery(DEFAULT_ADMIN_LIST_QUERY)
        setQuery(DEFAULT_ADMIN_LIST_QUERY)
    }

    return (
        <div className="space-y-8">
            <AdminPageHeader
                title="Users"
                description="Search the auth database, filter users, and jump into a dedicated detail page for each account."
                action={
                    <Button asChild size="sm" className="w-full sm:w-auto">
                        <Link href="/admin/users/new">
                            <Plus className="size-4" />
                            <span className="ml-2">Create user</span>
                        </Link>
                    </Button>
                }
            />

            <div className="mb-8 p-4 md:p-6 bg-muted/40 rounded-xl border border-border/50">
                <form
                    onSubmit={(event) => {
                        event.preventDefault()
                        setQuery({ ...draftQuery, offset: 0 })
                    }}
                    className="space-y-6"
                >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12 lg:gap-6">
                        <div className="space-y-2 xl:col-span-4">
                            <label className="text-sm font-medium">Search</label>
                            <Input
                                value={draftQuery.searchValue}
                                onChange={(event) =>
                                    setDraftQuery((current) => ({
                                        ...current,
                                        searchValue: event.target.value,
                                    }))
                                }
                                placeholder="Search by email or name"
                            />
                        </div>

                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-sm font-medium">Field</label>
                            <Select
                                value={draftQuery.searchField}
                                onValueChange={(value) =>
                                    setDraftQuery((current) => ({
                                        ...current,
                                        searchField: value as AdminSearchField,
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="name">Name</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-sm font-medium">Match</label>
                            <Select
                                value={draftQuery.searchOperator}
                                onValueChange={(value) =>
                                    setDraftQuery((current) => ({
                                        ...current,
                                        searchOperator: value as AdminSearchOperator,
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEARCH_OPERATOR_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select
                                value={draftQuery.filterKey}
                                onValueChange={(value) =>
                                    setDraftQuery((current) => ({
                                        ...current,
                                        filterKey: value as AdminFilterKey,
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FILTER_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-sm font-medium">Sort</label>
                            <Select
                                value={`${draftQuery.sortBy}:${draftQuery.sortDirection}`}
                                onValueChange={(value) => {
                                    const [sortBy, sortDirection] = value.split(":")
                                    setDraftQuery((current) => ({
                                        ...current,
                                        sortBy,
                                        sortDirection: sortDirection as AdminSortDirection,
                                    }))
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SORT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground text-pretty">
                            Open a user to manage profile, password, sessions, and suspension settings.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            {hasActiveFilters ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="w-full sm:w-auto"
                                >
                                    Reset
                                </Button>
                            ) : null}
                            <Button type="submit" size="sm" className="w-full sm:w-auto">
                                Apply filters
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-2">
                    <div>
                        <h2 className="text-lg font-medium text-foreground">User results</h2>
                        <p className="text-sm leading-6 text-muted-foreground text-pretty mt-1">
                            {total} matched result{total === 1 ? "" : "s"}.
                        </p>
                    </div>
                    <div className="rounded-md border bg-muted px-3 py-1 text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </div>
                </div>
                <div className="space-y-4">
                    {loading ? (
                        <>
                            <div className="hidden md:block space-y-2">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <Skeleton key={index} className="h-11 w-full" />
                                ))}
                            </div>
                            <div className="space-y-3 md:hidden">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <Skeleton key={index} className="h-28 w-full rounded-xl" />
                                ))}
                            </div>
                        </>
                    ) : users.length === 0 ? (
                        <div className="rounded-lg border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
                            <Users className="mx-auto size-8 text-muted-foreground/50 mb-4" />
                            <p className="font-medium text-foreground text-base">No users match these filters</p>
                            <p className="mt-1 mb-6 max-w-md mx-auto">Try adjusting your search query or removing some filters to see more results.</p>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/users/new">Create a user</Link>
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <div className="overflow-hidden rounded-lg border">
                                    <Table className="min-w-[760px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="text-right">Detail</TableHead>
                                            </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {users.map((user) => (
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
                                                    <TableCell className="font-medium">{user.name}</TableCell>
                                                    <TableCell className="max-w-[260px] truncate text-muted-foreground">
                                                        {user.email}
                                                    </TableCell>
                                                    <TableCell className="max-w-[180px]">
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
                                                    <TableCell className="text-right">
                                                        <Button asChild variant="ghost" size="sm">
                                                            <Link
                                                                href={`/admin/users/${user.id}`}
                                                                onClick={(event) => event.stopPropagation()}
                                                                onKeyDown={(event) => event.stopPropagation()}
                                                            >
                                                                Open
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="space-y-3 md:hidden">
                                {users.map((user) => (
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
                                        <div className="mt-4 flex items-center justify-between gap-3">
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                {formatDateTime(user.createdAt)}
                                            </p>
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/admin/users/${user.id}`}>Open</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {users.length} of {total}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setQuery((current) => ({
                                        ...current,
                                        offset: Math.max(0, current.offset - current.limit),
                                    }))
                                }
                                disabled={query.offset === 0 || loading}
                            >
                                Previous
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setQuery((current) => ({
                                        ...current,
                                        offset: Math.min(
                                            current.offset + current.limit,
                                            Math.max(0, total - current.limit),
                                        ),
                                    }))
                                }
                                disabled={loading || query.offset + query.limit >= total}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
