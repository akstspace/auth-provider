"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, KeySquare, ShieldCheck, Download, Link2, Trash2, Loader2, Monitor, Smartphone, RefreshCw, LogOut } from "lucide-react"
import QRCode from "react-qr-code"
import { getAuthErrorMessage } from "@/lib/auth-error"

interface AppAccessItem {
    consentId: string
    clientId: string
    name: string
    uri: string | null
    redirectUris: string[]
    scopes: string[]
    updatedAt: string | Date | null
}

interface DeviceSessionRecord {
    id?: string
    token?: string
    createdAt?: string
    userAgent?: string | null
    ipAddress?: string | null
}

const formatAccessDate = (value: string | Date | null) => {
    if (!value) return "Unknown"
    const date = typeof value === "string" ? new Date(value) : value
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
}

const getHostname = (value: string | null) => {
    if (!value) return null
    try {
        return new URL(value).hostname
    } catch {
        return value
    }
}

const MCP_DEBUG_REDIRECT_URI = "http://127.0.0.1:6274/oauth/callback/debug"

const isMcpClient = (item: AppAccessItem) => {
    const hasMcpScope = item.scopes.some((scope) => scope.startsWith("mcp:"))
    const hasMcpUri = (item.uri ?? "").includes("/api/mcp")
    const hasDebugRedirectUri = item.redirectUris.includes(MCP_DEBUG_REDIRECT_URI)
    return hasMcpScope || hasMcpUri || hasDebugRedirectUri
}

const formatSessionActiveAt = (value: string | undefined) => {
    if (!value) return "Unknown"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Unknown"

    const diffMs = Date.now() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return "just now"
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
}

const getDeviceLabel = (userAgent: string | null | undefined) => {
    const value = (userAgent ?? "").toLowerCase()
    if (!value) return "Browser session"
    if (/iphone|ipad|android|mobile/.test(value)) return "Mobile device"
    if (/macintosh|windows|linux|x11|cros/.test(value)) return "Desktop device"
    return "Browser session"
}

const getBrowserLabel = (userAgent: string | null | undefined) => {
    const value = userAgent ?? ""
    if (/edg\//i.test(value)) return "Microsoft Edge"
    if (/chrome\//i.test(value) && !/edg\//i.test(value)) return "Google Chrome"
    if (/safari\//i.test(value) && !/chrome\//i.test(value)) return "Safari"
    if (/firefox\//i.test(value)) return "Firefox"
    return "Unknown browser"
}

const getDeviceIcon = (userAgent: string | null | undefined) => {
    return /iphone|ipad|android|mobile/i.test(userAgent ?? "") ? Smartphone : Monitor
}

export function SecuritySettingsScreen() {
    const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState("")
    const [totpURI, setTotpURI] = useState("")
    const [totpCode, setTotpCode] = useState("")
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [verified, setVerified] = useState(false)
    const [error, setError] = useState("")
    const [accessItems, setAccessItems] = useState<AppAccessItem[]>([])
    const [accessLoading, setAccessLoading] = useState(true)
    const [accessError, setAccessError] = useState("")
    const [revokingConsentId, setRevokingConsentId] = useState<string | null>(null)
    const [deviceSessions, setDeviceSessions] = useState<DeviceSessionRecord[]>([])
    const [sessionsLoading, setSessionsLoading] = useState(true)
    const [sessionsError, setSessionsError] = useState("")
    const [revokingToken, setRevokingToken] = useState<string | null>(null)

    const { data: session } = authClient.useSession()
    const is2FAEnabled = session?.user?.twoFactorEnabled

    const currentSessionToken = session?.session?.token ?? ""
    const currentDeviceSession =
        deviceSessions.find((item) => item.token === currentSessionToken) ?? null
    const otherDeviceSessions = deviceSessions.filter(
        (item) => item.token !== currentSessionToken,
    )

    const loadDeviceSessions = async () => {
        setSessionsLoading(true)
        setSessionsError("")

        try {
            const result = await authClient.listSessions()
            if (result.error) {
                throw result.error
            }

            const data = Array.isArray(result.data)
                ? (result.data as Record<string, unknown>[])
                : []

            setDeviceSessions(
                data.map((item) => ({
                    id: typeof item.id === "string" ? item.id : undefined,
                    token: typeof item.token === "string" ? item.token : undefined,
                    createdAt:
                        typeof item.createdAt === "string"
                            ? item.createdAt
                            : item.createdAt instanceof Date
                              ? item.createdAt.toISOString()
                              : undefined,
                    userAgent: typeof item.userAgent === "string" ? item.userAgent : null,
                    ipAddress: typeof item.ipAddress === "string" ? item.ipAddress : null,
                })),
            )
        } catch (err) {
            setSessionsError(
                getAuthErrorMessage(err, "Failed to load active sessions."),
            )
        } finally {
            setSessionsLoading(false)
        }
    }

    const loadAppAccess = async () => {
        setAccessLoading(true)
        setAccessError("")

        try {
            const result = await authClient.oauth2.getConsents()
            if (result.error) {
                setAccessError("Failed to load apps with access.")
                return
            }

            const consents = Array.isArray(result.data)
                ? (result.data as Record<string, unknown>[])
                : []

            const items = await Promise.all(
                consents.map(async (consent) => {
                    const clientId = (consent.clientId as string) ?? (consent.client_id as string) ?? ""
                    const fallbackScopes =
                        (consent.scopes as string[] | undefined) ??
                        (typeof consent.scope === "string"
                            ? (consent.scope as string).split(" ").filter(Boolean)
                            : [])

                    let name = clientId || "Unknown app"
                    let uri: string | null = null
                    let redirectUris: string[] = []

                    if (clientId) {
                        try {
                            const clientResult = await authClient.oauth2.publicClient({
                                query: {
                                    client_id: clientId,
                                },
                            })
                            if (clientResult.data) {
                                const client = clientResult.data as Record<string, unknown>
                                name =
                                    (client.name as string) ??
                                    (client.client_name as string) ??
                                    name
                                uri =
                                    (client.uri as string | null) ??
                                    (client.client_uri as string | null) ??
                                    null
                                redirectUris =
                                    (client.redirectUris as string[] | undefined) ??
                                    (client.redirect_uris as string[] | undefined) ??
                                    []
                            }
                        } catch {
                            // Keep fallback display values if public client lookup fails.
                        }
                    }

                    return {
                        consentId: (consent.id as string) ?? "",
                        clientId,
                        name,
                        uri,
                        redirectUris,
                        scopes: fallbackScopes,
                        updatedAt:
                            (consent.updatedAt as string | Date | null) ??
                            (consent.updated_at as string | Date | null) ??
                            null,
                    } satisfies AppAccessItem
                }),
            )

            setAccessItems(items.filter((item) => item.consentId))
        } catch (err) {
            setAccessError(getAuthErrorMessage(err, "Failed to load apps with access."))
        } finally {
            setAccessLoading(false)
        }
    }

    useEffect(() => {
        void loadAppAccess()
    }, [])

    useEffect(() => {
        void loadDeviceSessions()
    }, [])

    const handleRevokeDeviceSession = async (sessionToken: string) => {
        setRevokingToken(sessionToken)
        setSessionsError("")

        try {
            const result = await authClient.revokeSession({
                token: sessionToken,
            })

            if (result.error) {
                throw result.error
            }

            if (currentSessionToken === sessionToken) {
                window.location.reload()
                return
            }

            setDeviceSessions((current) =>
                current.filter((item) => item.token !== sessionToken),
            )
        } catch (err) {
            setSessionsError(
                getAuthErrorMessage(err, "Failed to revoke session."),
            )
        } finally {
            setRevokingToken(null)
        }
    }

    const handleRevokeAccess = async (consentId: string) => {
        setRevokingConsentId(consentId)
        setAccessError("")

        try {
            const result = await authClient.oauth2.deleteConsent({
                id: consentId,
            })

            if (result.error) {
                setAccessError("Failed to remove saved consent.")
                return
            }

            setAccessItems((current) => current.filter((item) => item.consentId !== consentId))
        } catch (err) {
            setAccessError(getAuthErrorMessage(err, "Failed to remove saved consent."))
        } finally {
            setRevokingConsentId(null)
        }
    }

    const enable2FA = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const { data, error: requestError } = await authClient.twoFactor.enable({
                password,
            })

            if (requestError) {
                setError(getAuthErrorMessage(requestError, "Failed to enable 2FA."))
            } else if (data) {
                if (data.totpURI) setTotpURI(data.totpURI)
                if (data.backupCodes) setBackupCodes(data.backupCodes)
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "Failed to enable 2FA."))
        } finally {
            setPassword("")
            setLoading(false)
        }
    }

    const verifyTotp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const { error: requestError } = await authClient.twoFactor.verifyTotp({
                code: totpCode,
            })

            if (requestError) {
                setError(getAuthErrorMessage(requestError, "Invalid code. Please try again."))
            } else {
                setVerified(true)
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "Verification failed."))
        } finally {
            setLoading(false)
        }
    }

    const disable2FA = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const { error: requestError } = await authClient.twoFactor.disable({
                password,
            })

            if (requestError) {
                setError(getAuthErrorMessage(requestError, "Failed to disable 2FA."))
            } else {
                window.location.reload()
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "Failed to disable 2FA."))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                    <Shield className="size-5" />
                    Security Settings
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your account security and two-factor authentication.
                </p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-card-foreground">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-lg font-semibold">Your devices</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Review active sessions for this account across devices and revoke any you no longer trust.
                        </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadDeviceSessions()} disabled={sessionsLoading}>
                        <RefreshCw className={`size-4 ${sessionsLoading ? "animate-spin" : ""}`} />
                        <span className="ml-2">Refresh</span>
                    </Button>
                </div>

                {sessionsError ? <div className="text-sm text-destructive mb-4">{sessionsError}</div> : null}

                {sessionsLoading ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading active sessions...
                    </div>
                ) : deviceSessions.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        No active sessions found yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-background p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                                {(() => {
                                    const Icon = getDeviceIcon(currentDeviceSession?.userAgent)
                                    return <Icon className="mt-0.5 size-5 text-foreground" />
                                })()}
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">
                                            This device
                                        </p>
                                        <Badge variant="secondary" className="px-2.5 py-1 text-[11px]">
                                            Current
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {getDeviceLabel(currentDeviceSession?.userAgent)} · {getBrowserLabel(currentDeviceSession?.userAgent)}
                                    </p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {[session?.user?.email || "Signed in", currentDeviceSession?.ipAddress ? `IP ${currentDeviceSession.ipAddress}` : null]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <h4 className="text-sm font-medium text-foreground">Other active sessions</h4>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    These are other devices or browsers where this account is still signed in.
                                </p>
                            </div>

                            {otherDeviceSessions.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                    No other active sessions found for this account.
                                </div>
                            ) : (
                                otherDeviceSessions.map((item) => {
                                    const sessionToken = item.token ?? ""
                                    const isRevoking = revokingToken === sessionToken
                                    const Icon = getDeviceIcon(item.userAgent)

                                    return (
                                        <div
                                            key={sessionToken || item.id}
                                            className="rounded-lg border bg-background p-4"
                                        >
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0 flex items-start gap-3">
                                                    <Icon className="mt-0.5 size-5 text-muted-foreground" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {getDeviceLabel(item.userAgent)} · {getBrowserLabel(item.userAgent)}
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Active {formatSessionActiveAt(item.createdAt)}
                                                            {item.ipAddress ? ` · IP ${item.ipAddress}` : ""}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={!sessionToken || isRevoking}
                                                        onClick={() => void handleRevokeDeviceSession(sessionToken)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        {isRevoking ? (
                                                            <Loader2 className="size-4 animate-spin" />
                                                        ) : (
                                                            <LogOut className="size-4" />
                                                        )}
                                                        <span className="ml-2">
                                                            {isRevoking ? "Removing..." : "Remove"}
                                                        </span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="rounded-lg border bg-card p-6 text-card-foreground">
                <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className={`size-6 ${is2FAEnabled ? "text-[color:var(--success)]" : "text-muted-foreground"}`} />
                    <div>
                        <h3 className="text-lg font-semibold">Two-Factor Authentication (2FA)</h3>
                        <p className="text-sm text-muted-foreground">
                            {is2FAEnabled ? "2FA is currently enabled on your account." : "Add an extra layer of security to your account."}
                        </p>
                    </div>
                </div>

                {error && <div className="text-sm text-destructive mb-4">{error}</div>}

                {!is2FAEnabled && !totpURI && (
                    <form onSubmit={enable2FA} className="space-y-4 max-w-sm mt-6">
                        <p className="text-sm font-medium">Verify your password to enable 2FA:</p>
                        <Input
                            type="password"
                            placeholder="Current password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button type="submit" disabled={loading || !password}>
                            {loading ? "Enabling..." : "Enable 2FA"}
                        </Button>
                    </form>
                )}

                {totpURI && !verified && (
                    <div className="mt-6 space-y-6">
                        <div className="inline-block rounded-lg bg-[#fffdf7] p-4">
                            <QRCode value={totpURI} size={150} />
                        </div>
                        <p className="text-sm max-w-sm text-muted-foreground">
                            Scan this QR code with your authenticator app (like Google Authenticator or Authy), then enter the 6-digit code below to verify.
                        </p>
                        <form onSubmit={verifyTotp} className="space-y-4 max-w-sm">
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                placeholder="Enter 6-digit code"
                                required
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value)}
                                autoComplete="one-time-code"
                            />
                            <Button type="submit" disabled={loading || totpCode.length < 6}>
                                {loading ? "Verifying..." : "Verify and enable"}
                            </Button>
                        </form>
                    </div>
                )}

                {verified && backupCodes.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <div className="text-sm font-medium text-[color:var(--success)]">
                            ✓ 2FA has been enabled successfully.
                        </div>
                        <div>
                            <h4 className="font-semibold flex items-center gap-2 mb-2">
                                <KeySquare className="size-4" />
                                Backup Codes
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Save these codes in a secure place. You can use them to sign in if you lose access to your authenticator app.
                            </p>
                            <div className="grid grid-cols-2 gap-2 max-w-sm font-mono text-sm">
                                {backupCodes.map((code, i) => (
                                    <div key={i} className="rounded border bg-secondary px-2 py-2 text-center tracking-widest">
                                        {code}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const content = `Backup Codes\nGenerated: ${new Date().toLocaleDateString()}\n\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nEach code can only be used once.`
                                        const blob = new Blob([content], { type: "text/plain" })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement("a")
                                        a.href = url
                                        a.download = "backup-codes.txt"
                                        a.click()
                                        URL.revokeObjectURL(url)
                                    }}
                                >
                                    <Download className="size-4 mr-2" />
                                    Download .txt
                                </Button>
                                <Button onClick={() => window.location.reload()}>
                                    Done
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {is2FAEnabled && (
                    <form onSubmit={disable2FA} className="space-y-4 max-w-sm mt-6 border-t border-border/50 pt-6">
                        <p className="text-sm font-medium">Verify your password to disable 2FA:</p>
                        <Input
                            type="password"
                            placeholder="Current password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button type="submit" variant="destructive" disabled={loading || !password}>
                            {loading ? "Disabling..." : "Disable 2FA"}
                        </Button>
                    </form>
                )}

            </div>

            <div className="rounded-lg border bg-card p-6 text-card-foreground">
                <div className="flex items-center gap-3 mb-4">
                    <Link2 className="size-6 text-muted-foreground" />
                    <div>
                        <h3 className="text-lg font-semibold">Apps with access</h3>
                        <p className="text-sm text-muted-foreground">
                            Review OAuth apps you&apos;ve authorized and remove saved consent when needed.
                        </p>
                    </div>
                </div>

                {accessError ? <div className="text-sm text-destructive mb-4">{accessError}</div> : null}

                {accessLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                ) : accessItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        No apps currently have access to your account.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {accessItems.map((item) => {
                            const hostname = getHostname(item.uri)
                            const isRevoking = revokingConsentId === item.consentId
                            const isMcp = isMcpClient(item)

                            return (
                                <div
                                    key={item.consentId}
                                    className="rounded-lg border bg-background p-4"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 space-y-2">
                                            <div>
                                                <p className="font-medium text-foreground truncate">{item.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono truncate">
                                                    {item.clientId}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                {isMcp ? (
                                                    <span className="rounded-md border bg-[var(--warning-soft)] px-2.5 py-1 font-medium text-[color:var(--warning)]">
                                                        MCP client
                                                    </span>
                                                ) : null}
                                                {hostname ? (
                                                    <span className="rounded-md border bg-muted px-2.5 py-1">
                                                        {hostname}
                                                    </span>
                                                ) : null}
                                                <span className="rounded-md border bg-muted px-2.5 py-1">
                                                    Granted {formatAccessDate(item.updatedAt)}
                                                </span>
                                            </div>
                                            {item.scopes.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {item.scopes.map((scope) => (
                                                        <span
                                                            key={`${item.consentId}-${scope}`}
                                                            className="rounded-md border bg-muted px-2.5 py-1 font-mono text-[11px] text-foreground"
                                                        >
                                                            {scope}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 text-destructive hover:text-destructive"
                                            disabled={isRevoking}
                                            onClick={() => void handleRevokeAccess(item.consentId)}
                                        >
                                            <Trash2 className="size-4" />
                                            {isRevoking ? "Removing…" : "Remove saved consent"}
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
