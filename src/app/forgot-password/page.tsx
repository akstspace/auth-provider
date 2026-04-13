import { ForgotPasswordScreen } from "@/app/forgot-password/_components/forgot-password-screen"
import { isEmailPasswordAuthEnabled } from "@/lib/invite-only"

export default async function ForgotPasswordPage() {
    const emailPasswordAuthEnabled = await isEmailPasswordAuthEnabled()
    return <ForgotPasswordScreen emailPasswordAuthEnabled={emailPasswordAuthEnabled} />
}
