"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { ArrowRightLeft, Loader2, Plus, User } from "lucide-react"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"
import { LoginRequired } from "@/components/login-required"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AccountAvatar } from "@/app/select-account/_components/account-avatar"
import { authClient } from "@/lib/auth-client"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { getAuthFlowParams, resolveCallbackUrl, withAuthFlow } from "@/lib/auth-flow"

interface DeviceSessionRecord {
  session: {
    token?: string
  }
  user: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

interface PublicClientInfo {
  name: string | null
  icon: string | null
}
export function SelectAccountScreen() {
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()
  const [deviceSessions, setDeviceSessions] = useState<DeviceSessionRecord[]>([])
  const [clientInfo, setClientInfo] = useState<PublicClientInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [switchingToken, setSwitchingToken] = useState<string | null>(null)
  const [error, setError] = useState("")

  const flow = getAuthFlowParams(searchParams)
  const callbackTarget = resolveCallbackUrl(flow)
  const isOAuthFlow = Boolean(flow.oauthQuery)
  const clientId = searchParams.get("client_id")
  const currentSessionToken = session?.session?.token ?? ""

  const addAccountUrl = (() => {
    const url = new URL(
      withAuthFlow("/login", {
        callbackUrl: flow.callbackUrl,
        oauthQuery: flow.oauthQuery,
      }),
      "http://localhost",
    )
    url.searchParams.set("addAccount", "1")
    return `${url.pathname}${url.search}`
  })()

  useEffect(() => {
    if (!session?.user) return

    const loadAccounts = async () => {
      setLoading(true)
      setError("")

      try {
        const [{ data: sessionData, error: sessionError }, clientResult] =
          await Promise.all([
            authClient.multiSession.listDeviceSessions(),
            isOAuthFlow && clientId
              ? authClient.oauth2.publicClient({
                  query: {
                    client_id: clientId,
                  },
                })
              : Promise.resolve({ data: null, error: null }),
          ])

        if (sessionError) {
          throw sessionError
        }

        setDeviceSessions(
          Array.isArray(sessionData) ? (sessionData as DeviceSessionRecord[]) : [],
        )

        if (clientResult?.error) {
          throw clientResult.error
        }

        if (clientResult?.data) {
          const client = clientResult.data as Record<string, unknown>
          setClientInfo({
            name:
              (client.name as string | null) ??
              (client.client_name as string | null) ??
              null,
            icon:
              (client.icon as string | null) ??
              (client.logo_uri as string | null) ??
              null,
          })
        } else {
          setClientInfo(null)
        }
      } catch (loadError) {
        setError(getAuthErrorMessage(loadError, "Failed to load signed-in accounts."))
      } finally {
        setLoading(false)
      }
    }

    void loadAccounts()
  }, [clientId, isOAuthFlow, session?.user])

  const handleSelectAccount = async (sessionToken?: string) => {
    const tokenKey = sessionToken ?? "__current__"
    setSwitchingToken(tokenKey)
    setError("")

    try {
      if (sessionToken && sessionToken !== currentSessionToken) {
        const { error: switchError } = await authClient.multiSession.setActive({
          sessionToken,
        })
        if (switchError) {
          throw switchError
        }
      }

      if (isOAuthFlow) {
        const { error: continueError } = await authClient.oauth2.oauth2Continue({
          selected: true,
        })
        if (continueError) {
          throw continueError
        }
        return
      }

      window.location.href = callbackTarget
    } catch (selectionError) {
      setError(getAuthErrorMessage(selectionError, "Failed to switch account."))
    } finally {
      setSwitchingToken(null)
    }
  }

  const currentAccount =
    deviceSessions.find((item) => item.session.token === currentSessionToken) ??
    (session?.user
      ? {
          session: {
            token: currentSessionToken,
          },
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          },
        }
      : null)
  const otherAccounts = deviceSessions.filter(
    (item) => item.session.token !== currentSessionToken,
  )

  const heading = clientInfo?.name
    ? `Continue to ${clientInfo.name}`
    : isOAuthFlow
      ? "Choose an account"
      : "Switch account"
  const description = isOAuthFlow
    ? "Select which signed-in account should continue this OAuth flow."
    : "Choose another signed-in account on this browser, or add a new one."

  return (
    <LoginRequired>
      <AuthScreenShell widthClassName="max-w-lg" cardClassName="px-6 py-7 sm:px-7">
        <div className="mb-8 text-center">
          {isOAuthFlow && clientInfo?.icon ? (
            <Image
              src={clientInfo.icon}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="mx-auto mb-4 size-12 rounded-md border bg-background object-cover"
            />
          ) : (
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-[var(--icon-soft)]">
              <User className="size-5 text-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-balance">{heading}</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">{description}</p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Signed in on this browser</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-muted-foreground hover:text-[#c94b1f]"
            onClick={() => {
              window.location.href = addAccountUrl
            }}
          >
            <Plus className="size-4" />
            Add account
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading accounts...
          </div>
        ) : (
          <div className="space-y-3">
            {currentAccount ? (
              isOAuthFlow ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full rounded-md px-4 py-4"
                  disabled={switchingToken === "__current__"}
                  onClick={() => void handleSelectAccount()}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3 text-left">
                      <AccountAvatar image={currentAccount.user.image} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {currentAccount.user.name || currentAccount.user.email || "Current account"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {currentAccount.user.email || "Signed in"}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground">
                      {switchingToken === "__current__" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="size-4" />
                      )}
                      {switchingToken === "__current__" ? "Continuing..." : "Continue"}
                    </span>
                  </div>
                </Button>
              ) : (
                <div className="flex w-full items-center justify-between gap-3 rounded-md border bg-card px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <AccountAvatar image={currentAccount.user.image} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {currentAccount.user.name || currentAccount.user.email || "Current account"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {currentAccount.user.email || "Signed in"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Current
                  </Badge>
                </div>
              )
            ) : null}

            {otherAccounts.map((item) => {
              const token = item.session.token ?? ""
              const isSwitching = switchingToken === token

              return (
                <Button
                  key={token || item.user.email || item.user.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full rounded-md px-4 py-4"
                  disabled={!token || isSwitching}
                  onClick={() => void handleSelectAccount(token)}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3 text-left">
                      <AccountAvatar image={item.user.image} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.user.name || item.user.email || "Saved account"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {item.user.email || "Saved on this browser"}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground">
                      {isSwitching ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="size-4" />
                      )}
                      {isSwitching ? "Switching..." : "Use"}
                    </span>
                  </div>
                </Button>
              )
            })}
          </div>
        )}
      </AuthScreenShell>
    </LoginRequired>
  )
}
