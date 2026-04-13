import { Suspense } from "react"
import { SignUpScreen } from "@/app/signup/_components/signup-screen"
import { isEmailPasswordAuthEnabled } from "@/lib/invite-only"

export default async function SignUpPage() {
  const emailPasswordAuthEnabled = await isEmailPasswordAuthEnabled()
  return (
    <Suspense fallback={null}>
      <SignUpScreen emailPasswordAuthEnabled={emailPasswordAuthEnabled} />
    </Suspense>
  )
}
