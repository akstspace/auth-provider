"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"
import { isPlatformAdmin } from "@/lib/platform-admin"

export function HomeRedirectScreen() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (isPending) return

    if (!session) {
      router.replace("/login")
      return
    }

    router.replace(isPlatformAdmin(session.user.role) ? "/admin" : "/org")
  }, [session, isPending, router])

  // Loading state
  if (isPending) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
