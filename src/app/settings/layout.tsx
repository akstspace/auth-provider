import { isUserClientCreationAllowed } from "@/lib/invite-only"
import { SettingsLayoutShell } from "@/app/settings/_components/settings-layout-shell"

export default async function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
    const allowUserClientCreation = await isUserClientCreationAllowed()
    return <SettingsLayoutShell allowUserClientCreation={allowUserClientCreation}>{children}</SettingsLayoutShell>
}
