import { notFound } from "next/navigation"
import { isUserClientCreationAllowed } from "@/lib/invite-only"

export default async function OAuthClientsLayout({ children }: { children: React.ReactNode }) {
    const allowUserClientCreation = await isUserClientCreationAllowed()
    
    if (!allowUserClientCreation) {
        notFound()
    }

    return children
}
