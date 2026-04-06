import { Suspense } from "react"
import { ConsentScreen } from "@/app/consent/_components/consent-screen"

export default function ConsentPage() {
    return (
        <Suspense>
            <ConsentScreen />
        </Suspense>
    )
}
