"use client"

import { type FormEvent, useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Ban, CalendarDays, CircleOff, Copy, KeyRound, Loader2, Pencil, Shield, Trash2, Undo2, UserCog } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
    AdminPageHeader,
    AdminSectionCard,
    AdminSectionContent,
    AdminSectionFooter,
    AdminSectionHeader,
    AdminStatusBadge,
} from "@/components/admin/admin-shell"
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
    formatAdminError,
    formatDateTime,
    getAdminUserDetails,
    type AdminSessionRecord,
    type AdminUserRecord,
} from "@/lib/admin-data"
import { formatRoleList, toRolePayload } from "@/lib/platform-admin"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmState {
    title: string
    description: string
    actionLabel: string
    onConfirm: () => Promise<void>
}

const parseJsonPatch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return { value: {} as Record<string, unknown>, error: "" }

    try {
        const parsed = JSON.parse(trimmed) as unknown
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return { value: {} as Record<string, unknown>, error: "Extra JSON must be a valid object." }
        }
        return { value: parsed as Record<string, unknown>, error: "" }
    } catch {
        return { value: {} as Record<string, unknown>, error: "Extra JSON must be valid JSON." }
    }
}

const DEFAULT_BAN_TIME = "12:00"

const toTimeInputValue = (value: Date) =>
    `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`

const isValidTimeInput = (value: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)

const getBanExpiryDateTime = (date: Date, time: string) => {
    if (!isValidTimeInput(time)) return null

    const [hours, minutes] = time.split(":").map(Number)
    const next = new Date(date)
    next.setHours(hours, minutes, 0, 0)
    return next
}

export function AdminUserDetailScreen() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const userId = params.id
    const { data: session } = authClient.useSession()
    const currentUserId = session?.user?.id ?? ""

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [user, setUser] = useState<AdminUserRecord | null>(null)
    const [sessions, setSessions] = useState<AdminSessionRecord[]>([])
    const [actionError, setActionError] = useState("")
    const [actionSuccess, setActionSuccess] = useState("")
    const [profileName, setProfileName] = useState("")
    const [profileEmail, setProfileEmail] = useState("")
    const [profileImage, setProfileImage] = useState("")
    const [profilePatch, setProfilePatch] = useState("")
    const [profileEmailVerified, setProfileEmailVerified] = useState(false)
    const [roleInput, setRoleInput] = useState("user")
    const [password, setPassword] = useState("")
    const [banReason, setBanReason] = useState("")
    const [banExpiryDate, setBanExpiryDate] = useState<Date | undefined>(undefined)
    const [banExpiryTime, setBanExpiryTime] = useState(DEFAULT_BAN_TIME)
    const [savingProfile, setSavingProfile] = useState(false)
    const [savingRole, setSavingRole] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
    const [confirming, setConfirming] = useState(false)
    const [copied, setCopied] = useState(false)
    const [profileDialogOpen, setProfileDialogOpen] = useState(false)
    const [rolesDialogOpen, setRolesDialogOpen] = useState(false)
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
    const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false)

    const isSelf = user?.id === currentUserId
    const staleRef = useRef(false)

    const loadPage = async (options?: { isStale?: () => boolean }) => {
        setLoading(true)
        setError("")

        const result = await getAdminUserDetails(userId)
        if (options?.isStale?.()) return

        const resolvedUser = result.data?.user ?? null
        if (!resolvedUser) {
            setError(result.error || "Failed to load the user.")
            setLoading(false)
            return
        }

        if (result.error) {
            setError(result.error)
        }

        setUser(resolvedUser)
        setSessions(result.data?.sessions ?? [])
        setProfileName(resolvedUser?.name ?? "")
        setProfileEmail(resolvedUser?.email ?? "")
        setProfileImage(resolvedUser?.image ?? "")
        setProfilePatch("")
        setProfileEmailVerified(Boolean(resolvedUser?.emailVerified))
        setRoleInput(formatRoleList(resolvedUser?.role) || "user")
        setBanReason(resolvedUser?.banReason ?? "")
        const existingBanExpiry =
            resolvedUser?.banExpires ? new Date(resolvedUser.banExpires) : null
        if (existingBanExpiry && !Number.isNaN(existingBanExpiry.getTime()) && existingBanExpiry.getTime() > Date.now()) {
            setBanExpiryDate(existingBanExpiry)
            setBanExpiryTime(toTimeInputValue(existingBanExpiry))
        } else {
            setBanExpiryDate(undefined)
            setBanExpiryTime(DEFAULT_BAN_TIME)
        }
        setPassword("")
        setActionError("")
        setActionSuccess("")
        setLoading(false)
    }

    useEffect(() => {
        staleRef.current = false
        void loadPage({ isStale: () => staleRef.current })
        return () => { staleRef.current = true }
    }, [userId])

    useEffect(() => {
        if (!copied) return
        const timeout = window.setTimeout(() => setCopied(false), 1200)
        return () => window.clearTimeout(timeout)
    }, [copied])

    const handleCopy = async () => {
        if (!user?.id) return
        try {
            await navigator.clipboard.writeText(user.id)
            setCopied(true)
        } catch {
            setCopied(false)
        }
    }

    const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!user) return

        const parsed = parseJsonPatch(profilePatch)
        if (parsed.error) {
            setActionError(parsed.error)
            setActionSuccess("")
            return
        }

        setSavingProfile(true)
        setActionError("")
        setActionSuccess("")

        try {
            const result = await authClient.admin.updateUser({
                userId: user.id,
                data: {
                    ...parsed.value,
                    name: profileName.trim(),
                    email: profileEmail.trim().toLowerCase(),
                    image: profileImage.trim() || null,
                    emailVerified: profileEmailVerified,
                },
            })

            if (result.error) {
                setActionError(formatAdminError(result.error, "Failed to update the user."))
                return
            }

            await loadPage()
            setActionSuccess("User profile updated.")
            setProfileDialogOpen(false)
        } catch (err) {
            setActionError(formatAdminError(err, "Failed to update the user."))
        } finally {
            setSavingProfile(false)
        }
    }

    const handleSetRole = async () => {
        if (!user) return

        const trimmed = roleInput.trim()
        if (!trimmed) {
            setActionError("Role must not be empty.")
            setActionSuccess("")
            return
        }

        const tokens = trimmed.split(",").map((t) => t.trim())
        if (tokens.some((t) => !t)) {
            setActionError("Role list contains empty entries. Remove extra commas and try again.")
            setActionSuccess("")
            return
        }

        setSavingRole(true)
        setActionError("")
        setActionSuccess("")

        try {
            const result = await authClient.admin.setRole({
                userId: user.id,
                role: toRolePayload(trimmed) as never,
            })

            if (result.error) {
                setActionError(formatAdminError(result.error, "Failed to update roles."))
                return
            }

            await loadPage()
            setActionSuccess("User roles updated.")
            setRolesDialogOpen(false)
        } catch (err) {
            setActionError(formatAdminError(err, "Failed to update roles."))
        } finally {
            setSavingRole(false)
        }
    }

    const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!user) return

        setSavingPassword(true)
        setActionError("")
        setActionSuccess("")

        try {
            const result = await authClient.admin.setUserPassword({
                userId: user.id,
                newPassword: password,
            })

            if (result.error) {
                setActionError(formatAdminError(result.error, "Failed to update the password."))
                return
            }

            setPassword("")
            setActionSuccess("Password updated.")
            setPasswordDialogOpen(false)
        } catch (err) {
            setActionError(formatAdminError(err, "Failed to update the password."))
        } finally {
            setSavingPassword(false)
        }
    }

    const openConfirm = (state: ConfirmState) => setConfirmState(state)

    const runConfirmedAction = async () => {
        if (!confirmState) return
        setConfirming(true)
        await confirmState.onConfirm()
        setConfirming(false)
        setConfirmState(null)
    }

    const requestBan = () => {
        if (!user) return
        setActionError("")
        setActionSuccess("")
        openConfirm({
            title: `Ban ${user.name}?`,
            description: banReason.trim()
                ? "This revokes all active sessions, blocks sign-in, and shows the suspension reason on the banned user screen."
                : "This revokes all active sessions and blocks the user from signing in until you unban them or the ban expires.",
            actionLabel: "Ban user",
            onConfirm: async () => {
                let numericExpiry: number | null = null

                if (banExpiryDate) {
                    if (!isValidTimeInput(banExpiryTime)) {
                        setActionError("Choose a valid suspension time.")
                        return
                    }

                    const expiryDate = getBanExpiryDateTime(banExpiryDate, banExpiryTime)
                    if (!expiryDate) {
                        setActionError("Choose a valid suspension time.")
                        return
                    }

                    const secondsUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / 1000)
                    if (secondsUntilExpiry <= 0) {
                        setActionError("Suspension end time must be in the future.")
                        return
                    }

                    numericExpiry = secondsUntilExpiry
                }

                const result = await authClient.admin.banUser({
                    userId: user.id,
                    ...(banReason.trim() ? { banReason: banReason.trim() } : {}),
                    ...(numericExpiry !== null ? { banExpiresIn: numericExpiry } : {}),
                })

                if (result.error) {
                    setActionError(formatAdminError(result.error, "Failed to ban the user."))
                    return
                }

                await loadPage()
                setActionSuccess("User banned and signed out everywhere.")
                setSuspensionDialogOpen(false)
            },
        })
    }

    const handleUnban = async () => {
        if (!user) return
        setActionError("")
        setActionSuccess("")
        const result = await authClient.admin.unbanUser({ userId: user.id })
        if (result.error) {
            setActionError(formatAdminError(result.error, "Failed to unban the user."))
            return
        }
        await loadPage()
        setActionSuccess("User unbanned.")
        setSuspensionDialogOpen(false)
    }

    const requestRevokeAllSessions = () => {
        if (!user) return
        setActionError("")
        setActionSuccess("")
        openConfirm({
            title: "Revoke all sessions?",
            description: "This signs the user out of every active browser and device session immediately.",
            actionLabel: "Revoke all sessions",
            onConfirm: async () => {
                const result = await authClient.admin.revokeUserSessions({ userId: user.id })
                if (result.error) {
                    setActionError(formatAdminError(result.error, "Failed to revoke sessions."))
                    return
                }
                await loadPage()
                setActionSuccess("All sessions revoked.")
            },
        })
    }

    const requestDelete = () => {
        if (!user) return
        setActionError("")
        setActionSuccess("")
        openConfirm({
            title: `Delete ${user.name}?`,
            description: "This permanently removes the user, linked accounts, and all sessions. This cannot be undone.",
            actionLabel: "Delete user",
            onConfirm: async () => {
                const result = await authClient.admin.removeUser({ userId: user.id })
                if (result.error) {
                    setActionError(formatAdminError(result.error, "Failed to delete the user."))
                    return
                }
                router.replace("/admin/users")
            },
        })
    }

    const handleImpersonate = async () => {
        if (!user) return
        setActionError("")
        setActionSuccess("")
        const result = await authClient.admin.impersonateUser({ userId: user.id })
        if (result.error) {
            setActionError(formatAdminError(result.error, "Failed to impersonate the user."))
            return
        }
        window.location.href = "/"
    }

    return (
        <div className="space-y-8">
            <AdminPageHeader
                title={loading ? "Loading user..." : user?.name || "User detail"}
                description="A single user view for profile edits, security changes, bans, impersonation, and sessions."
                action={
                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href="/admin/users">
                            <ArrowLeft className="size-4" />
                            <span className="ml-2">Back to users</span>
                        </Link>
                    </Button>
                }
            />

            {error ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            {actionError ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {actionError}
                </div>
            ) : null}
            {actionSuccess ? (
                <div className="rounded-lg border border-[color:var(--success)]/25 bg-[var(--success-soft)] px-4 py-3 text-sm text-[color:var(--success)]">
                    {actionSuccess}
                </div>
            ) : null}

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-36 w-full rounded-xl" />
                    <Skeleton className="h-56 w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            ) : !user ? null : (
                <>
                    <AdminSectionCard>
                        <AdminSectionHeader>
                            <CardTitle className="text-lg font-medium">Account summary</CardTitle>
                            <CardDescription className="text-sm leading-6 text-pretty">
                                Primary identity and high-risk actions live here.
                            </CardDescription>
                        </AdminSectionHeader>
                        <AdminSectionContent className="space-y-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold">{user.name}</h2>
                                    <p className="text-sm leading-6 text-muted-foreground">{user.email}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
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
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-lg border bg-background p-4">
                                    <p className="text-xs text-muted-foreground">User ID</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <code className="min-w-0 flex-1 truncate text-xs">{user.id}</code>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => void handleCopy()}
                                            aria-label={copied ? "User ID copied" : "Copy user ID"}
                                        >
                                            {copied ? <span className="text-xs">OK</span> : <Copy className="size-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="rounded-lg border bg-background p-4">
                                    <p className="text-xs text-muted-foreground">Created</p>
                                    <p className="mt-2 text-sm tabular-nums">{formatDateTime(user.createdAt)}</p>
                                </div>
                                <div className="rounded-lg border bg-background p-4">
                                    <p className="text-xs text-muted-foreground">Updated</p>
                                    <p className="mt-2 text-sm tabular-nums">{formatDateTime(user.updatedAt)}</p>
                                </div>
                                <div className="rounded-lg border bg-background p-4">
                                    <p className="text-xs text-muted-foreground">Ban expires</p>
                                    <p className="mt-2 text-sm tabular-nums">
                                        {user.banExpires ? formatDateTime(user.banExpires) : "Never"}
                                    </p>
                                </div>
                            </div>

                            {user.banned && user.banReason ? (
                                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] p-3 text-sm text-destructive">
                                    Ban reason: {user.banReason}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-3">
                                <Button variant="outline" size="sm" onClick={() => void handleImpersonate()} disabled={isSelf}>
                                    <UserCog className="size-4" />
                                    <span className="ml-2">Impersonate</span>
                                </Button>
                                <Button variant="outline" size="sm" onClick={requestRevokeAllSessions}>
                                    <CircleOff className="size-4" />
                                    <span className="ml-2">Revoke all sessions</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={requestDelete}
                                    disabled={isSelf}
                                    className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                >
                                    <Trash2 className="size-4" />
                                    <span className="ml-2">Delete user</span>
                                </Button>
                            </div>

                            {isSelf ? (
                                <p className="text-sm text-muted-foreground text-pretty">
                                    Better Auth blocks self-impersonation, self-bans, and self-deletion, so those actions are disabled here.
                                </p>
                            ) : null}
                        </AdminSectionContent>
                    </AdminSectionCard>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <AdminSectionCard className="flex h-full flex-col">
                            <AdminSectionHeader>
                                <CardTitle className="text-lg font-medium">Profile</CardTitle>
                                <CardDescription className="text-sm leading-6 text-pretty">
                                    Name, email, image, and verification state.
                                </CardDescription>
                            </AdminSectionHeader>
                            <AdminSectionContent className="flex flex-1 flex-col gap-4">
                                <dl className="space-y-3 text-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-muted-foreground">Name</dt>
                                        <dd className="text-right">{user.name}</dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-muted-foreground">Email</dt>
                                        <dd className="text-right">{user.email}</dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-muted-foreground">Image</dt>
                                        <dd className="max-w-[60%] truncate text-right">{user.image || "Not set"}</dd>
                                    </div>
                                </dl>
                            </AdminSectionContent>
                            <AdminSectionFooter>
                                <Button type="button" variant="outline" size="sm" onClick={() => setProfileDialogOpen(true)}>
                                    <Pencil className="size-4" />
                                    <span className="ml-2">Edit profile</span>
                                </Button>
                            </AdminSectionFooter>
                        </AdminSectionCard>

                        <AdminSectionCard className="flex h-full flex-col">
                            <AdminSectionHeader>
                                <CardTitle className="text-lg font-medium">Roles</CardTitle>
                                <CardDescription className="text-sm leading-6 text-pretty">
                                    Review and change the user’s Better Auth role set.
                                </CardDescription>
                            </AdminSectionHeader>
                            <AdminSectionContent className="flex flex-1 flex-col gap-4">
                                <p className="text-sm">{formatRoleList(user.role) || "user"}</p>
                            </AdminSectionContent>
                            <AdminSectionFooter>
                                <Button type="button" variant="outline" size="sm" onClick={() => setRolesDialogOpen(true)}>
                                    <Shield className="size-4" />
                                    <span className="ml-2">Manage roles</span>
                                </Button>
                            </AdminSectionFooter>
                        </AdminSectionCard>

                        <AdminSectionCard className="flex h-full flex-col">
                            <AdminSectionHeader>
                                <CardTitle className="text-lg font-medium">Password</CardTitle>
                                <CardDescription className="text-sm leading-6 text-pretty">
                                    Reset the credential password without leaving this page.
                                </CardDescription>
                            </AdminSectionHeader>
                            <AdminSectionContent className="flex flex-1 flex-col gap-4">
                                <p className="text-sm text-muted-foreground">No password is shown here for security reasons.</p>
                            </AdminSectionContent>
                            <AdminSectionFooter>
                                <Button type="button" variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
                                    <KeyRound className="size-4" />
                                    <span className="ml-2">Update password</span>
                                </Button>
                            </AdminSectionFooter>
                        </AdminSectionCard>

                        <AdminSectionCard className="flex h-full flex-col">
                            <AdminSectionHeader>
                                <CardTitle className="text-lg font-medium">Suspension</CardTitle>
                                <CardDescription className="text-sm leading-6 text-pretty">
                                    Manage bans, reasons, and optional expiry.
                                </CardDescription>
                            </AdminSectionHeader>
                            <AdminSectionContent className="flex flex-1 flex-col gap-4">
                                <dl className="space-y-3 text-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-muted-foreground">Status</dt>
                                        <dd>{user.banned ? "Suspended" : "Active"}</dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-muted-foreground">Reason</dt>
                                        <dd className="max-w-[60%] text-right">{user.banReason || "Not set"}</dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-muted-foreground">Expires</dt>
                                        <dd>{user.banExpires ? formatDateTime(user.banExpires) : "Never"}</dd>
                                    </div>
                                </dl>
                            </AdminSectionContent>
                            <AdminSectionFooter>
                                <Button type="button" variant="outline" size="sm" onClick={() => setSuspensionDialogOpen(true)}>
                                    <Ban className="size-4" />
                                    <span className="ml-2">Manage suspension</span>
                                </Button>
                            </AdminSectionFooter>
                        </AdminSectionCard>
                    </div>

                    <AdminSectionCard>
                        <AdminSectionHeader>
                            <CardTitle className="text-lg font-medium">Sessions</CardTitle>
                            <CardDescription className="text-sm leading-6 text-pretty">
                                Review active sessions and revoke individual devices only when needed.
                            </CardDescription>
                        </AdminSectionHeader>
                        <AdminSectionContent className="space-y-3">
                            {sessions.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                    No active sessions found.
                                </div>
                            ) : (
                                <>
                                    <div className="hidden md:block">
                                        <div className="overflow-x-auto rounded-lg border">
                                            <Table className="min-w-[880px]">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Created</TableHead>
                                                        <TableHead>Expires</TableHead>
                                                        <TableHead>IP</TableHead>
                                                        <TableHead>User agent</TableHead>
                                                        <TableHead>State</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sessions.map((sessionRecord) => (
                                                        <TableRow key={sessionRecord.id}>
                                                            <TableCell className="tabular-nums text-muted-foreground">
                                                                {formatDateTime(sessionRecord.createdAt)}
                                                            </TableCell>
                                                            <TableCell className="tabular-nums text-muted-foreground">
                                                                {formatDateTime(sessionRecord.expiresAt)}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {sessionRecord.ipAddress || "Unavailable"}
                                                            </TableCell>
                                                            <TableCell className="max-w-[260px] truncate text-muted-foreground">
                                                                {sessionRecord.userAgent || "Unavailable"}
                                                            </TableCell>
                                                            <TableCell>
                                                                {sessionRecord.impersonatedBy ? (
                                                                    <AdminStatusBadge label="Impersonated" tone="warning" />
                                                                ) : (
                                                                    <AdminStatusBadge label="Standard" />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    <div className="space-y-3 md:hidden">
                                        {sessions.map((sessionRecord) => (
                                            <div key={sessionRecord.id} className="rounded-lg border bg-background p-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {sessionRecord.impersonatedBy ? (
                                                        <AdminStatusBadge label="Impersonated" tone="warning" />
                                                    ) : null}
                                                </div>
                                                <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                                                    <p className="tabular-nums">Created: {formatDateTime(sessionRecord.createdAt)}</p>
                                                    <p className="tabular-nums">Expires: {formatDateTime(sessionRecord.expiresAt)}</p>
                                                    <p>IP: {sessionRecord.ipAddress || "Unavailable"}</p>
                                                    <p className="text-pretty">User agent: {sessionRecord.userAgent || "Unavailable"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </AdminSectionContent>
                    </AdminSectionCard>
                </>
            )}

            <AlertDialog open={Boolean(confirmState)} onOpenChange={(open) => !open && setConfirmState(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault()
                                void runConfirmedAction()
                            }}
                            disabled={confirming}
                            className=""
                        >
                            {confirming ? <Loader2 className="size-4 animate-spin" /> : null}
                            <span className={confirming ? "ml-2" : ""}>{confirmState?.actionLabel}</span>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit profile</DialogTitle>
                        <DialogDescription>
                            Update the user’s profile fields and optional JSON patch in one focused modal.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="profileName" className="text-sm font-medium">Name</label>
                                <Input id="profileName" value={profileName} onChange={(event) => setProfileName(event.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="profileEmail" className="text-sm font-medium">Email</label>
                                <Input id="profileEmail" type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="profileImage" className="text-sm font-medium">Image URL</label>
                            <Input id="profileImage" value={profileImage} onChange={(event) => setProfileImage(event.target.value)} placeholder="https://example.com/avatar.png" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="profilePatch" className="text-sm font-medium">Extra JSON patch</label>
                            <Textarea id="profilePatch" value={profilePatch} onChange={(event) => setProfilePatch(event.target.value)} placeholder='{"department":"Operations"}' />
                        </div>

                        <label className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
                            <input
                                type="checkbox"
                                checked={profileEmailVerified}
                                onChange={(event) => setProfileEmailVerified(event.target.checked)}
                                className="mt-0.5 size-4"
                            />
                            <span>Mark this email as verified.</span>
                        </label>

                        <DialogFooter showCloseButton>
                            <Button type="submit" size="sm" disabled={savingProfile}>
                                {savingProfile ? "Saving..." : "Save profile"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage roles</DialogTitle>
                        <DialogDescription>
                            Use a single role or comma-separated list for this user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <label htmlFor="roleInput" className="sr-only">Roles</label>
                        <Input id="roleInput" value={roleInput} onChange={(event) => setRoleInput(event.target.value)} placeholder="admin,user" />
                        <DialogFooter showCloseButton>
                            <Button type="button" size="sm" onClick={() => void handleSetRole()} disabled={savingRole}>
                                {savingRole ? "Saving..." : "Apply roles"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update password</DialogTitle>
                        <DialogDescription>
                            Set a fresh password for credential-based sign-in.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSetPassword} className="space-y-4">
                        <label htmlFor="profilePassword" className="sr-only">New password</label>
                        <Input id="profilePassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                        <DialogFooter showCloseButton>
                            <Button type="submit" size="sm" disabled={savingPassword}>
                                <KeyRound className="size-4" />
                                <span className="ml-2">{savingPassword ? "Saving..." : "Update password"}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={suspensionDialogOpen} onOpenChange={setSuspensionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage suspension</DialogTitle>
                        <DialogDescription>
                            Add a reason, set an expiry, and ban or unban this account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="banReason" className="text-sm font-medium">Ban reason</label>
                            <Textarea
                                id="banReason"
                                value={banReason}
                                onChange={(event) => setBanReason(event.target.value)}
                                placeholder="Explain why this account is suspended."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Suspension ends</label>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_144px_auto]">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full justify-between"
                                        >
                                            <span className="truncate">
                                                {banExpiryDate ? format(banExpiryDate, "PPP") : "Pick a date"}
                                            </span>
                                            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-auto">
                                        <Calendar
                                            mode="single"
                                            selected={banExpiryDate}
                                            onSelect={setBanExpiryDate}
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Input
                                    type="time"
                                    step="60"
                                    value={banExpiryTime}
                                    onChange={(event) => setBanExpiryTime(event.target.value)}
                                    disabled={!banExpiryDate}
                                />

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setBanExpiryDate(undefined)
                                        setBanExpiryTime(DEFAULT_BAN_TIME)
                                    }}
                                    disabled={!banExpiryDate}
                                    className="w-full sm:w-auto"
                                >
                                    Clear
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {banExpiryDate
                                    ? isValidTimeInput(banExpiryTime)
                                      ? `This suspension will end on ${format(
                                          getBanExpiryDateTime(banExpiryDate, banExpiryTime) as Date,
                                          "PPP p",
                                        )}.`
                                      : "Choose a valid time for the selected suspension date."
                                    : "Leave this empty to suspend the account until it is manually restored."}
                            </p>
                        </div>
                        <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                            {user?.banned ? (
                                <p className="text-pretty">
                                    This account is currently suspended.
                                    {user.banReason ? ` Current reason: ${user.banReason}` : " No reason has been provided yet."}
                                </p>
                            ) : (
                                <p className="text-pretty">
                                    Leave the reason blank to use the generic suspension message. Add a reason when you want the banned user to see a clearer explanation.
                                </p>
                            )}
                        </div>
                        <DialogFooter showCloseButton>
                            {user?.banned ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => void handleUnban()}>
                                    <Undo2 className="size-4" />
                                    <span className="ml-2">Unban user</span>
                                </Button>
                            ) : (
                                <Button type="button" variant="outline" size="sm" onClick={requestBan} disabled={isSelf}>
                                    <Ban className="size-4" />
                                    <span className="ml-2">Apply suspension</span>
                                </Button>
                            )}
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
