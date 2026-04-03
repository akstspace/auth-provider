import { AdminOAuthClientDetailScreen } from "@/app/admin/oauth-clients/[id]/_components/admin-oauth-client-detail-screen"

export default function AdminOAuthClientDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return <AdminOAuthClientDetailScreen params={params} />
}
