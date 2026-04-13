"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Pencil, Plus, RefreshCw, Tag, XCircle } from "lucide-react"
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminSectionContent,
  AdminSectionHeader,
  AdminStatusBadge,
} from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

interface ScopeDefinition {
  key: string
  label: string
  description: string
  isSystem: boolean
  allowSelfService: boolean
  isActive: boolean
}

const emptyForm = {
  key: "",
  label: "",
  description: "",
  allowSelfService: false,
  isActive: true,
}

export function AdminOAuthScopesScreen() {
  const [scopes, setScopes] = useState<ScopeDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingScope, setEditingScope] = useState<ScopeDefinition | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const activeCustomCount = scopes.filter(
    (scope) => !scope.isSystem && scope.isActive,
  ).length

  const loadScopes = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/oauth-scopes", {
        cache: "no-store",
      })
      const result = (await response.json()) as {
        error?: string
        scopes?: ScopeDefinition[]
      }

      if (!response.ok) {
        setError(result.error ?? "Failed to load OAuth scopes.")
        return
      }

      setScopes(Array.isArray(result.scopes) ? result.scopes : [])
    } catch {
      setError("Failed to load OAuth scopes.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadScopes()
  }, [])

  const openCreateDialog = () => {
    setEditingScope(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (scope: ScopeDefinition) => {
    setEditingScope(scope)
    setForm({
      key: scope.key,
      label: scope.label,
      description: scope.description,
      allowSelfService: scope.allowSelfService,
      isActive: scope.isActive,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")

    try {
      const response = await fetch(
        editingScope
          ? `/api/admin/oauth-scopes/${encodeURIComponent(editingScope.key)}`
          : "/api/admin/oauth-scopes",
        {
          method: editingScope ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            editingScope
              ? {
                  label: form.label,
                  description: form.description,
                  allowSelfService: form.allowSelfService,
                  isActive: form.isActive,
                }
              : form,
          ),
        },
      )

      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(result.error ?? "Failed to save OAuth scope.")
        return
      }

      setDialogOpen(false)
      setEditingScope(null)
      setForm(emptyForm)
      await loadScopes(true)
    } catch {
      setError("Failed to save OAuth scope.")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleArchived = async (scope: ScopeDefinition) => {
    setError("")

    try {
      const response = await fetch(
        `/api/admin/oauth-scopes/${encodeURIComponent(scope.key)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !scope.isActive,
          }),
        },
      )

      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(result.error ?? "Failed to update OAuth scope.")
        return
      }

      await loadScopes(true)
    } catch {
      setError("Failed to update OAuth scope.")
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="OAuth Scopes"
        description="Manage custom scopes and the descriptions shown during OAuth consent."
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadScopes(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="ml-2">Refresh</span>
            </Button>
            <Button type="button" size="sm" onClick={openCreateDialog}>
              <Plus className="size-4" />
              <span className="ml-2">Create scope</span>
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border border-[color:var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-3 text-sm text-[color:var(--warning)]">
        Scope changes are saved immediately, but the OAuth provider will only advertise and issue
        newly added or updated scopes after the server restarts or redeploys.
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <AdminMetricCard
          label="Built-in scopes"
          value={scopes.filter((scope) => scope.isSystem).length}
          description="System scopes that stay fixed and ship with the provider."
        />
        <AdminMetricCard
          label="Active custom scopes"
          value={activeCustomCount}
          description="Custom scopes currently available to be advertised and issued."
        />
        <AdminMetricCard
          label="Self-service custom scopes"
          value={scopes.filter((scope) => !scope.isSystem && scope.allowSelfService && scope.isActive).length}
          description="Custom scopes that self-service client registration may request."
        />
      </div>

      <AdminSectionCard>
        <AdminSectionHeader>
          <CardTitle className="text-lg font-medium">Scope registry</CardTitle>
          <CardDescription className="text-sm text-pretty">
            Built-in scopes stay fixed. Custom scopes can be described, archived, and marked as safe
            for self-service client registration.
          </CardDescription>
        </AdminSectionHeader>
        <AdminSectionContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : scopes.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Tag className="mx-auto mb-3 size-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No OAuth scopes found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scopes.map((scope) => (
                <div
                  key={scope.key}
                  className="rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded-md border bg-muted px-2 py-1 text-xs">{scope.key}</code>
                        <AdminStatusBadge
                          label={scope.isSystem ? "Built-in" : "Custom"}
                          tone={scope.isSystem ? "default" : "success"}
                        />
                        <AdminStatusBadge
                          label={scope.isActive ? "Active" : "Archived"}
                          tone={scope.isActive ? "success" : "warning"}
                        />
                        {scope.allowSelfService ? (
                          <AdminStatusBadge label="Self-service" tone="default" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{scope.label}</p>
                        <p className="text-sm text-muted-foreground text-pretty">
                          {scope.description}
                        </p>
                      </div>
                    </div>

                    {!scope.isSystem ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(scope)}
                        >
                          <Pencil className="size-4" />
                          <span className="ml-2">Edit</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleArchived(scope)}
                        >
                          {scope.isActive ? (
                            <XCircle className="size-4" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          <span className="ml-2">{scope.isActive ? "Archive" : "Activate"}</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSectionContent>
      </AdminSectionCard>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingScope(null)
            setForm(emptyForm)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingScope ? "Edit scope" : "Create scope"}</DialogTitle>
            <DialogDescription className="text-pretty">
              {editingScope
                ? "Update the label, description, self-service policy, or archive status."
                : "Add a custom OAuth scope and the description shown during consent."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="scope-key" className="text-sm font-medium">Scope key</label>
              <Input
                id="scope-key"
                value={form.key}
                onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
                disabled={Boolean(editingScope)}
                placeholder="read:projects"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="scope-label" className="text-sm font-medium">Label</label>
              <Input
                id="scope-label"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="Read projects"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="scope-description" className="text-sm font-medium">Description</label>
              <Textarea
                id="scope-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                placeholder="View the user's project list and metadata."
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.allowSelfService}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      allowSelfService: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4"
                />
                <div>
                  <span className="font-medium">Allow self-service clients</span>
                  <p className="text-xs text-muted-foreground text-pretty">
                    When enabled, regular users may assign this scope to their own OAuth clients.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border bg-muted p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4"
                />
                <div>
                  <span className="font-medium">Active</span>
                  <p className="text-xs text-muted-foreground text-pretty">
                    Archived scopes stay on historical clients and consents, but cannot be assigned to new clients.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? "Saving..." : editingScope ? "Save changes" : "Create scope"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
