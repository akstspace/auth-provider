import { Suspense } from "react"
import { TwoFactorScreen } from "@/app/2fa/_components/two-factor-screen"

export default function TwoFactorPage() {
    return (
        <Suspense fallback={null}>
            <TwoFactorScreen />
        </Suspense>
    )
}
