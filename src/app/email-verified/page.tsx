import { Suspense } from "react"
import { EmailVerifiedScreen } from "@/app/email-verified/_components/email-verified-screen"

export default function EmailVerifiedPage() {
    return (
        <Suspense>
            <EmailVerifiedScreen />
        </Suspense>
    )
}
