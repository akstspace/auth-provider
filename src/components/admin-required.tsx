"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { LoginRequired } from "@/components/login-required"
import { isPlatformAdmin } from "@/lib/platform-admin"

function AdminRequiredInner({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()
  const canAccessAdmin = isPlatformAdmin(session?.user?.role)

  useEffect(() => {
    if (!isPending && session?.user && !canAccessAdmin) {
      router.replace("/")
    }
  }, [canAccessAdmin, isPending, router, session?.user])

  if (isPending || !session?.user || !canAccessAdmin) {
    return null
  }

  return <>{children}</>
}

export function AdminRequired({ children }: { children: React.ReactNode }) {
  return (
    <LoginRequired>
      <AdminRequiredInner>{children}</AdminRequiredInner>
    </LoginRequired>
  )
}
