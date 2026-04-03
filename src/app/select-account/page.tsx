import { Suspense } from "react"
import { SelectAccountScreen } from "@/app/select-account/_components/select-account-screen"

export default function SelectAccountPage() {
  return (
    <Suspense fallback={null}>
      <SelectAccountScreen />
    </Suspense>
  )
}
