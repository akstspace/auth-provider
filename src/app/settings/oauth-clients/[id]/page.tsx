import { OAuthClientDetailScreen } from "@/app/settings/oauth-clients/[id]/_components/oauth-client-detail-screen"

export default function SettingsOAuthClientDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return <OAuthClientDetailScreen params={params} />
}
