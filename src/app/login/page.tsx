import { Suspense } from "react"
import { LoginScreen } from "@/app/login/_components/login-screen"
import { isEmailPasswordAuthEnabled } from "@/lib/invite-only"

export default async function LoginPage() {
  const emailPasswordAuthEnabled = await isEmailPasswordAuthEnabled()
  return (
    <Suspense>
      <LoginScreen emailPasswordAuthEnabled={emailPasswordAuthEnabled} />
    </Suspense>
  )
}
