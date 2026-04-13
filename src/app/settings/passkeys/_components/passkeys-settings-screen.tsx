"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Fingerprint, Plus, Pencil, Trash2, Loader2, KeyRound } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { cardEnterMotion } from "@/lib/motion"

interface Passkey {
    id: string
    name: string | null
    createdAt: Date | null
    deviceType: string
}

export function PasskeysSettingsScreen() {
    const [passkeys, setPasskeys] = useState<Passkey[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [error, setError] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchPasskeys = async () => {
        try {
            const { data } = await authClient.passkey.listUserPasskeys({})
            setPasskeys((data as Passkey[]) || [])
        } catch (err) {
            setError(getAuthErrorMessage(err, "Failed to load passkeys."))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void fetchPasskeys()
    }, [])

    const handleAdd = async () => {
        setActionLoading(true)
        setError("")
        try {
            const { error: err } = await authClient.passkey.addPasskey({})
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to add passkey."))
                return
            }
            await fetchPasskeys()
        } catch (err) {
            setError(getAuthErrorMessage(err, "An unexpected error occurred."))
        } finally {
            setActionLoading(false)
        }
    }

    const handleRename = async (id: string) => {
        setActionLoading(true)
        setError("")
        try {
            const { error: err } = await authClient.passkey.updatePasskey({
                id,
                name: editName,
            })
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to rename passkey."))
                return
            }
            setEditingId(null)
            await fetchPasskeys()
        } catch (err) {
            setError(getAuthErrorMessage(err, "An unexpected error occurred."))
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        setActionLoading(true)
        setError("")
        try {
            const { error: err } = await authClient.passkey.deletePasskey({ id })
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to delete passkey."))
                return
            }
            setDeletingId(null)
            await fetchPasskeys()
        } catch (err) {
            setError(getAuthErrorMessage(err, "An unexpected error occurred."))
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Passkeys</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage passkeys for passwordless sign-in using biometrics or security keys.
                    </p>
                </div>
                <Button onClick={handleAdd} disabled={actionLoading} className="gap-2 shrink-0">
                    <Plus className="size-3.5" />
                    Add Passkey
                </Button>
            </div>

            {error && (
                <div role="alert" className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Passkey List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
            ) : passkeys.length === 0 ? (
                <motion.div
                    {...cardEnterMotion}
                    className="rounded-lg border bg-card p-10 text-center"
                >
                    <div className="flex justify-center mb-4">
                        <div className="flex items-center justify-center size-12 rounded-md bg-[var(--icon-soft)]">
                            <Fingerprint className="size-6 text-muted-foreground" />
                        </div>
                    </div>
                    <p className="font-medium text-foreground mb-1">No passkeys registered</p>
                    <p className="text-sm text-muted-foreground mb-4">
                        Add a passkey to sign in without a password using your fingerprint, face, or security key.
                    </p>
                    <Button onClick={handleAdd} disabled={actionLoading} className="gap-2">
                        <Plus className="size-3.5" />
                        Add Your First Passkey
                    </Button>
                </motion.div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {passkeys.map((pk) => (
                            <motion.div
                                key={pk.id}
                                {...cardEnterMotion}
                                exit={{ opacity: 0, y: -6 }}
                                className="rounded-lg border bg-card p-4"
                            >
                                {deletingId === pk.id ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-foreground">
                                            Delete <strong>{pk.name || "Unnamed passkey"}</strong>? This cannot be undone.
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleDelete(pk.id)}
                                                disabled={actionLoading}
                                                className="gap-1.5"
                                                variant="destructive"
                                            >
                                                {actionLoading ? "Deleting…" : "Delete"}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setDeletingId(null)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : editingId === pk.id ? (
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleRename(pk.id) }}
                                        className="flex items-center gap-3"
                                    >
                                        <KeyRound className="size-4 text-muted-foreground shrink-0" />
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            autoFocus
                                            className="h-8 text-sm"
                                        />
                                        <Button size="sm" type="submit" disabled={actionLoading}>
                                            Save
                                        </Button>
                                        <Button size="sm" variant="outline" type="button" onClick={() => setEditingId(null)}>
                                            Cancel
                                        </Button>
                                    </form>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--icon-soft)]">
                                                <KeyRound className="size-4 text-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm text-foreground truncate">
                                                    {pk.name || "Unnamed passkey"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {pk.deviceType === "singleDevice" ? "Single device" : "Multi-device"} · Added{" "}
                                                    {pk.createdAt
                                                        ? new Date(pk.createdAt).toLocaleDateString()
                                                        : "—"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => { setEditingId(pk.id); setEditName(pk.name || "") }}
                                                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-[#c94b1f]"
                                                aria-label="Rename passkey"
                                            >
                                                <Pencil className="size-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setDeletingId(pk.id)}
                                                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-[var(--danger-soft)] hover:text-destructive"
                                                aria-label="Delete passkey"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
