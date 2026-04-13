"use client"

import { useEffect, useState } from "react"
import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { getAuthErrorMessage } from "@/lib/auth-error"

export function ProfileSettingsScreen() {
    const { data: session } = authClient.useSession()
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        if (session?.user?.name) {
            const parts = session.user.name.split(" ")
            setFirstName(parts[0] || "")
            setLastName(parts.slice(1).join(" ") || "")
        }
    }, [session?.user?.name])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setMessage("")

        const fullName = `${firstName} ${lastName}`.trim()
        if (!fullName) {
            setError("Please enter your name.")
            setLoading(false)
            return
        }

        try {
            const { error: updateError } = await authClient.updateUser({
                name: fullName,
            })

            if (updateError) {
                setError(getAuthErrorMessage(updateError, "Failed to update profile."))
            } else {
                setMessage("Profile updated successfully.")
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "An unexpected error occurred."))
        } finally {
            setLoading(false)
        }
    }

    const hasChanges = (() => {
        if (!session?.user?.name) return false
        const parts = session.user.name.split(" ")
        const origFirst = parts[0] || ""
        const origLast = parts.slice(1).join(" ") || ""
        return firstName !== origFirst || lastName !== origLast
    })()

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                    <User className="size-5" />
                    Profile
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your personal information.
                </p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-card-foreground">
                {error && <div className="mb-4 rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-3 py-2 text-sm text-destructive">{error}</div>}
                {message && <div className="mb-4 rounded-lg border border-[color:var(--success)]/25 bg-[var(--success-soft)] px-3 py-2 text-sm text-[color:var(--success)]">{message}</div>}

                <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
                    <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium">
                            First name
                        </label>
                        <Input
                            id="firstName"
                            type="text"
                            placeholder="First name"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium">
                            Last name
                        </label>
                        <Input
                            id="lastName"
                            type="text"
                            placeholder="Last name"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                            Email
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={session?.user?.email || ""}
                            disabled
                            className="opacity-60"
                        />
                        <p className="text-xs text-muted-foreground">
                            Email cannot be changed.
                        </p>
                    </div>

                    <Button type="submit" disabled={loading || !hasChanges}>
                        {loading ? "Saving..." : "Save changes"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
