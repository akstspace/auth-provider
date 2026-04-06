import { Suspense } from "react"
import { ResetPasswordScreen } from "@/app/reset-password/_components/reset-password-screen"

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordScreen />
        </Suspense>
    )
}
