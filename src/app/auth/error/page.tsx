import { Suspense } from "react"
import { AuthErrorScreen } from "@/app/auth/error/_components/auth-error-screen"

export default function AuthErrorPage() {
    return (
        <Suspense fallback={null}>
            <AuthErrorScreen />
        </Suspense>
    )
}
