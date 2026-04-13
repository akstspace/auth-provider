import { Suspense } from "react"
import { ResetPasswordScreen } from "@/app/reset-password/_components/reset-password-screen"
import { isEmailPasswordAuthEnabled } from "@/lib/invite-only"

export default async function ResetPasswordPage() {
    const emailPasswordAuthEnabled = await isEmailPasswordAuthEnabled()
    return (
        <Suspense>
            <ResetPasswordScreen emailPasswordAuthEnabled={emailPasswordAuthEnabled} />
        </Suspense>
    )
}
