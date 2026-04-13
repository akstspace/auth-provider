"use client"

import { type FormEvent, useState } from "react"
import { UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    AdminPageHeader,
    AdminSectionCard,
    AdminSectionContent,
    AdminSectionHeader,
} from "@/components/admin/admin-shell"
import { authClient } from "@/lib/auth-client"
import { formatAdminError, unwrapAdminUser } from "@/lib/admin-data"
import { toRolePayload } from "@/lib/platform-admin"

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

export function AdminCreateUserScreen() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [roles, setRoles] = useState("user")
    const [password, setPassword] = useState("")
    const [extraJson, setExtraJson] = useState("")
    const [createCredentialAccount, setCreateCredentialAccount] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const parsedJson = parseJsonPatch(extraJson)
        if (parsedJson.error) {
            setError(parsedJson.error)
            return
        }

        setLoading(true)
        setError("")

        try {
            const result = await authClient.admin.createUser({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role: toRolePayload(roles) as never,
                ...(createCredentialAccount ? { password } : {}),
                ...(Object.keys(parsedJson.value).length > 0 ? { data: parsedJson.value } : {}),
            })

            if (result.error) {
                setError(formatAdminError(result.error, "Failed to create the user."))
                return
            }

            const createdUser = unwrapAdminUser(result.data)
            router.push(createdUser?.id ? `/admin/users/${createdUser.id}` : "/admin/users")
        } catch (err) {
            setError(formatAdminError(err, "Failed to create the user."))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <AdminPageHeader
                title="Create user"
                description="A focused flow for creating platform users without mixing it into the user index."
            />

            {error ? (
                <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="xl:max-w-4xl border-t pt-8">
                <div className="mb-8">
                    <h2 className="text-lg font-medium text-foreground">New platform user</h2>
                    <p className="text-sm leading-6 text-muted-foreground text-pretty mt-1">
                        Create the account first, then continue to the detail page for bans, password changes, and sessions.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start border-b pb-8">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Profile</label>
                            <p className="text-sm text-muted-foreground">The user's display name and primary email address.</p>
                        </div>
                        <div className="w-full max-w-lg space-y-4">
                            <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start border-b pb-8">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Access and Roles</label>
                            <p className="text-sm text-muted-foreground">Specify the role this user will have. Defaults to standard user.</p>
                        </div>
                        <div className="w-full max-w-lg space-y-4">
                            <Input
                                value={roles}
                                onChange={(event) => setRoles(event.target.value)}
                                placeholder="user"
                            />
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start border-b pb-8">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Authentication</label>
                            <p className="text-sm text-muted-foreground">Optionally create a credential account with an initial password.</p>
                        </div>
                        <div className="w-full max-w-lg space-y-4">
                            <label className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={createCredentialAccount}
                                    onChange={(event) => setCreateCredentialAccount(event.target.checked)}
                                    className="mt-0.5 size-4"
                                />
                                <span>Create a credential account with a password.</span>
                            </label>
                            <Input
                                type="password"
                                placeholder="Initial password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required={createCredentialAccount}
                                disabled={!createCredentialAccount}
                            />
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start border-b pb-8">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Advanced</label>
                            <p className="text-sm text-muted-foreground">Additional metadata payload in JSON format.</p>
                        </div>
                        <div className="w-full max-w-lg space-y-4">
                            <Textarea
                                value={extraJson}
                                onChange={(event) => setExtraJson(event.target.value)}
                                placeholder='{"customField":"customValue"}'
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" size="sm" disabled={loading}>
                            <UserPlus className="size-4" />
                            <span className="ml-2">{loading ? "Creating..." : "Create user"}</span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
