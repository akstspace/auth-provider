import { Suspense } from "react"
import { VerifyEmailScreen } from "@/app/verify-email/_components/verify-email-screen"

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailScreen />
        </Suspense>
    )
}
