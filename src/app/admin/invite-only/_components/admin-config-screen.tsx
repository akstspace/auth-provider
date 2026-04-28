"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Shield } from "lucide-react"
import {
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface InviteOnlySettings {
  enabled: boolean
  emails: string[]
  domains: string[]
}

interface PlatformConfigSettings {
  allowUserClientCreation: boolean
  allowDynamicClientRegistration: boolean
  emailPasswordAuthEnabled: boolean
  oauthValidAudiences: string[]
}

interface InviteOnlyDraft extends InviteOnlySettings {}

const isInviteOnlySettings = (value: unknown): value is InviteOnlySettings => {
  if (typeof value !== "object" || value === null) return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.enabled === "boolean" &&
    Array.isArray(candidate.emails) &&
    Array.isArray(candidate.domains)
  )
}

const isPlatformConfigSettings = (value: unknown): value is PlatformConfigSettings => {
  if (typeof value !== "object" || value === null) return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.allowUserClientCreation === "boolean" &&
    typeof candidate.emailPasswordAuthEnabled === "boolean" &&
    typeof candidate.allowDynamicClientRegistration === "boolean" &&
    Array.isArray(candidate.oauthValidAudiences)
  )
}

const toTextareaValue = (values: string[]) => values.join("\n")

const fromTextareaValue = (value: string) =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)

const toDraft = (settings: InviteOnlySettings): InviteOnlyDraft => ({
  enabled: settings.enabled,
  emails: settings.emails,
  domains: settings.domains,
})

export function AdminConfigScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPlatformConfig, setSavingPlatformConfig] = useState(false)
  const [error, setError] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [allowUserClientCreation, setAllowUserClientCreation] = useState(true)
  const [emailPasswordAuthEnabled, setEmailPasswordAuthEnabled] = useState(true)
  const [allowDynamicClientRegistration, setAllowDynamicClientRegistration] =
    useState(false)
  const [dcrRestartRequired, setDcrRestartRequired] = useState(false)
  const [oauthAudiencesValue, setOauthAudiencesValue] = useState("")
  const [savedOAuthAudiencesValue, setSavedOAuthAudiencesValue] = useState("")
  const [audienceRestartRequired, setAudienceRestartRequired] = useState(false)
  const [emailsValue, setEmailsValue] = useState("")
  const [domainsValue, setDomainsValue] = useState("")
  const [savedSettings, setSavedSettings] = useState<InviteOnlyDraft>({
    enabled: false,
    emails: [],
    domains: [],
  })
  const emailEntries = fromTextareaValue(emailsValue)
  const domainEntries = fromTextareaValue(domainsValue)
  const hasUnsavedAllowlistChanges =
    enabled &&
    (emailsValue !== toTextareaValue(savedSettings.emails) ||
      domainsValue !== toTextareaValue(savedSettings.domains))

  const loadSettings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError("")

    try {
      const [inviteResponse, platformResponse] = await Promise.all([
        fetch("/api/admin/invite-only", {
          cache: "no-store",
        }),
        fetch("/api/admin/platform-config", {
          cache: "no-store",
        }),
      ])

      const inviteResult = (await inviteResponse.json()) as
        | (InviteOnlySettings & { error?: undefined })
        | { error?: string }
      const platformResult = (await platformResponse.json()) as
        | (PlatformConfigSettings & { error?: undefined })
        | { error?: string }

      if (!inviteResponse.ok || !isInviteOnlySettings(inviteResult)) {
        setError(
          ("error" in inviteResult ? inviteResult.error : undefined) ??
            "Failed to load invite-only settings.",
        )
        return
      }

      if (!platformResponse.ok || !isPlatformConfigSettings(platformResult)) {
        setError(
          ("error" in platformResult ? platformResult.error : undefined) ??
            "Failed to load OAuth settings.",
        )
        return
      }

      setEnabled(inviteResult.enabled)
      setEmailsValue(toTextareaValue(inviteResult.emails))
      setDomainsValue(toTextareaValue(inviteResult.domains))
      setSavedSettings(toDraft(inviteResult))
      setAllowUserClientCreation(platformResult.allowUserClientCreation)
      setEmailPasswordAuthEnabled(platformResult.emailPasswordAuthEnabled)
      setAllowDynamicClientRegistration(
        platformResult.allowDynamicClientRegistration,
      )
      const audienceValue = toTextareaValue(platformResult.oauthValidAudiences)
      setOauthAudiencesValue(audienceValue)
      setSavedOAuthAudiencesValue(audienceValue)
    } catch {
      setError("Failed to load platform configuration.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const saveSettings = async (
    nextEnabled: boolean,
    nextEmails: string[],
    nextDomains: string[],
  ) => {
    setSaving(true)
    setError("")

    try {
      const response = await fetch("/api/admin/invite-only", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: nextEnabled,
          emails: nextEmails,
          domains: nextDomains,
        }),
      })

      const result = (await response.json()) as
        | (InviteOnlySettings & { error?: undefined })
        | { error?: string }

      if (!response.ok || !isInviteOnlySettings(result)) {
        setError(
          ("error" in result ? result.error : undefined) ??
            "Failed to save invite-only settings.",
        )
        return false
      }

      setEnabled(result.enabled)
      setEmailsValue(toTextareaValue(result.emails))
      setDomainsValue(toTextareaValue(result.domains))
      setSavedSettings(toDraft(result))
      return true
    } catch {
      setError("Failed to save invite-only settings.")
      return false
    } finally {
      setSaving(false)
    }
  }

  const savePlatformConfig = async (input: PlatformConfigSettings) => {
    setSavingPlatformConfig(true)
    setError("")

    try {
      const response = await fetch("/api/admin/platform-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      })

      const result = (await response.json()) as
        | (PlatformConfigSettings & { error?: undefined })
        | { error?: string }

      if (!response.ok || !isPlatformConfigSettings(result)) {
        setError(
          ("error" in result ? result.error : undefined) ??
            "Failed to save OAuth settings.",
        )
        return false
      }

      setAllowUserClientCreation(result.allowUserClientCreation)
      setEmailPasswordAuthEnabled(result.emailPasswordAuthEnabled)
      setAllowDynamicClientRegistration(result.allowDynamicClientRegistration)
      const audienceValue = toTextareaValue(result.oauthValidAudiences)
      setOauthAudiencesValue(audienceValue)
      setSavedOAuthAudiencesValue(audienceValue)
      return true
    } catch {
      setError("Failed to save OAuth settings.")
      return false
    } finally {
      setSavingPlatformConfig(false)
    }
  }

  const handleSave = async () => {
    await saveSettings(
      enabled,
      fromTextareaValue(emailsValue),
      fromTextareaValue(domainsValue),
    )
  }

  const handleToggleEnabled = async () => {
    const nextEnabled = !enabled
    const previousEnabled = enabled
    setEnabled(nextEnabled)

    const didSave = await saveSettings(
      nextEnabled,
      fromTextareaValue(emailsValue),
      fromTextareaValue(domainsValue),
    )

    if (!didSave) {
      setEnabled(previousEnabled)
    }
  }

  const handleToggleUserClientCreation = async () => {
    const nextValue = !allowUserClientCreation
    const previousValue = allowUserClientCreation
    setAllowUserClientCreation(nextValue)

    const didSave = await savePlatformConfig({
      allowUserClientCreation: nextValue,
      emailPasswordAuthEnabled,
      allowDynamicClientRegistration,
      oauthValidAudiences: fromTextareaValue(oauthAudiencesValue),
    })

    if (!didSave) {
      setAllowUserClientCreation(previousValue)
    }
  }

  const handleToggleDynamicRegistration = async () => {
    const nextValue = !allowDynamicClientRegistration
    const previousValue = allowDynamicClientRegistration
    setAllowDynamicClientRegistration(nextValue)

    const didSave = await savePlatformConfig({
      allowUserClientCreation,
      emailPasswordAuthEnabled,
      allowDynamicClientRegistration: nextValue,
      oauthValidAudiences: fromTextareaValue(oauthAudiencesValue),
    })

    if (!didSave) {
      setAllowDynamicClientRegistration(previousValue)
    } else {
      setDcrRestartRequired(true)
    }
  }

  const handleToggleEmailPasswordAuth = async () => {
    const nextValue = !emailPasswordAuthEnabled
    const previousValue = emailPasswordAuthEnabled
    setEmailPasswordAuthEnabled(nextValue)

    const didSave = await savePlatformConfig({
      allowUserClientCreation,
      emailPasswordAuthEnabled: nextValue,
      allowDynamicClientRegistration,
      oauthValidAudiences: fromTextareaValue(oauthAudiencesValue),
    })

    if (!didSave) {
      setEmailPasswordAuthEnabled(previousValue)
    }
  }

  const handleSaveOAuthAudiences = async () => {
    const previousValue = oauthAudiencesValue
    const nextValues = fromTextareaValue(oauthAudiencesValue)
    const didSave = await savePlatformConfig({
      allowUserClientCreation,
      emailPasswordAuthEnabled,
      allowDynamicClientRegistration,
      oauthValidAudiences: nextValues,
    })

    if (!didSave) {
      setOauthAudiencesValue(previousValue)
      return
    }

    if (oauthAudiencesValue !== savedOAuthAudiencesValue) {
      setAudienceRestartRequired(true)
    }
  }

  return (
    <div className="max-w-5xl space-y-10 pb-16">
      <AdminPageHeader
        title="Platform Config"
        description="Manage sign-up controls and OAuth registration privileges from one place."
        action={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadSettings(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              <span className="ml-2">Refresh</span>
            </Button>
            {enabled ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || loading || !hasUnsavedAllowlistChanges}
              >
                {saving
                  ? "Saving..."
                  : hasUnsavedAllowlistChanges
                    ? "Save changes"
                    : "Saved"}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-12">
        <section className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">Access Mode</h2>
            <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
              Switch between open registration and a closed platform. When invite-only is active,
              only explicit emails or domains can join.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-lg border bg-muted/30 p-1.5">
            <AdminStatusBadge
              label={enabled ? "Active" : "Disabled"}
              tone={enabled ? "warning" : "default"}
            />
            <Button
              type="button"
              variant={enabled ? "outline" : "default"}
              size="sm"
              onClick={() => void handleToggleEnabled()}
              disabled={loading || saving}
              className="min-w-24"
            >
              {enabled ? "Turn off" : "Turn on"}
            </Button>
          </div>
        </section>

        <section className="space-y-4 border-b pb-10">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">OAuth Registration</h2>
            <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
              Define who can create OAuth clients and whether dynamic client registration should be available.
            </p>
          </div>
          <div className="space-y-3">
            <label
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-background p-4 text-sm",
                savingPlatformConfig ? "opacity-60" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                checked={allowUserClientCreation}
                onChange={() => void handleToggleUserClientCreation()}
                disabled={loading || savingPlatformConfig}
                className="mt-0.5 size-4"
              />
              <div>
                <p className="font-medium text-foreground">Allow user client creation</p>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">
                  When enabled, regular users can create and manage their own OAuth clients.
                </p>
              </div>
            </label>

            <label
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-background p-4 text-sm",
                savingPlatformConfig ? "opacity-60" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                checked={emailPasswordAuthEnabled}
                onChange={() => void handleToggleEmailPasswordAuth()}
                disabled={loading || savingPlatformConfig}
                className="mt-0.5 size-4"
              />
              <div>
                <p className="font-medium text-foreground">Enable email/password auth</p>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">
                  Controls sign in, sign up, and forgot-password/reset-password flows for credential-based authentication.
                </p>
              </div>
            </label>

            <label
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-background p-4 text-sm",
                savingPlatformConfig ? "opacity-60" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                checked={allowDynamicClientRegistration}
                onChange={() => void handleToggleDynamicRegistration()}
                disabled={loading || savingPlatformConfig}
                className="mt-0.5 size-4"
              />
              <div>
                <p className="font-medium text-foreground">Enable dynamic client registration</p>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">
                  Controls OAuth 2.1 dynamic registration (`/oauth2/register`) for machine and MCP-style clients.
                </p>
              </div>
            </label>
          </div>

          {dcrRestartRequired ? (
            <div className="rounded-lg border border-[color:var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-3 text-sm text-[color:var(--warning)]">
              Dynamic client registration changes are saved, but will only take effect after the server restarts or redeploys.
            </div>
          ) : null}
        </section>

        <section className="space-y-4 border-b pb-10">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">OAuth Resource Audiences</h2>
            <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
              Configure allowed RFC 8707 `resource` values for access tokens. Include your MCP resource URL so token exchange succeeds.
            </p>
          </div>

          <Textarea
            value={oauthAudiencesValue}
            onChange={(event) => setOauthAudiencesValue(event.target.value)}
            className="min-h-32 resize-y bg-muted/20 font-mono text-sm leading-relaxed"
            placeholder={"https://api.example.com"}
            disabled={loading || savingPlatformConfig}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSaveOAuthAudiences()}
              disabled={loading || savingPlatformConfig || oauthAudiencesValue === savedOAuthAudiencesValue}
            >
              {savingPlatformConfig ? "Saving..." : "Save audiences"}
            </Button>
            <p className="text-xs text-muted-foreground">
              One audience per line. These are loaded at auth server startup.
            </p>
          </div>

          {audienceRestartRequired ? (
            <div className="rounded-lg border border-[color:var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-3 text-sm text-[color:var(--warning)]">
              Audience changes are saved, but will only take effect after the server restarts or redeploys.
            </div>
          ) : null}
        </section>

        {enabled ? (
          <div className="grid gap-12 lg:grid-cols-2">
            <section className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-base font-medium">Allowed Emails</h3>
                  <AdminStatusBadge label={`${emailEntries.length} rules`} />
                </div>
                <p className="text-sm text-muted-foreground">Exact email matches only.</p>
              </div>

              <Textarea
                value={emailsValue}
                onChange={(event) => setEmailsValue(event.target.value)}
                className="min-h-32 resize-y bg-muted/20 font-mono text-sm leading-relaxed"
                placeholder={"founder@example.com\nhello@company.com"}
                disabled={loading || saving}
              />

              {emailEntries.length > 0 && (
                <div className="pt-2">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Preview
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {emailEntries.map((entry) => (
                      <span
                        key={entry}
                        className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm"
                      >
                        {entry}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-base font-medium">Allowed Domains</h3>
                  <AdminStatusBadge label={`${domainEntries.length} rules`} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Allow anyone from these domains to join.
                </p>
              </div>

              <Textarea
                value={domainsValue}
                onChange={(event) => setDomainsValue(event.target.value)}
                className="min-h-32 resize-y bg-muted/20 font-mono text-sm leading-relaxed"
                placeholder={"example.com\npartners.io"}
                disabled={loading || saving}
              />

              {domainEntries.length > 0 && (
                <div className="pt-2">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Preview
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {domainEntries.map((entry) => (
                      <span
                        key={entry}
                        className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm"
                      >
                        {entry}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 p-12 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <Shield className="size-6 text-muted-foreground/60" />
            </div>
            <h3 className="mb-2 text-sm font-medium text-foreground">Allowlist hidden</h3>
            <p className="max-w-md text-pretty text-sm leading-6 text-muted-foreground">
              Invite-only mode is currently disabled, meaning anyone can create an account. Turn it on to explicitly allow specific users or domains.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
