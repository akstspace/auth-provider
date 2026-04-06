import { Suspense } from "react"
import { SignUpScreen } from "@/app/signup/_components/signup-screen"

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpScreen />
    </Suspense>
  )
}
