import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getVerifiedAdminSession,
  isSameOriginRequest,
} from "@/lib/api-route-auth";

interface AdminUpdateClientBody {
  client_name?: string;
  redirect_uris?: string[];
  scope?: string;
  token_endpoint_auth_method?: "none" | "client_secret_basic" | "client_secret_post";
  skip_consent?: boolean;
  enable_end_session?: boolean;
  require_pkce?: boolean;
  subject_type?: "public" | "pairwise";
  client_secret_expires_at?: string | number;
  metadata?: Record<string, unknown>;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin OAuth client update is not allowed." },
        { status: 403 }
      );
    }

    const verified = await getVerifiedAdminSession(request);
    if (verified.response) {
      return verified.response;
    }

    const { id: clientId } = await params;
    const body = (await request.json()) as AdminUpdateClientBody;

    const update: Record<string, any> = {};

    if (body.client_name !== undefined) update.client_name = body.client_name.trim();
    if (body.redirect_uris !== undefined) {
      update.redirect_uris = body.redirect_uris.map((v) => v.trim()).filter(Boolean);
    }
    if (body.scope !== undefined) update.scope = body.scope;
    if (body.token_endpoint_auth_method !== undefined) {
      update.token_endpoint_auth_method = body.token_endpoint_auth_method;
    }
    if (body.skip_consent !== undefined) update.skip_consent = body.skip_consent;
    if (body.enable_end_session !== undefined) update.enable_end_session = body.enable_end_session;
    if (body.require_pkce !== undefined) update.require_pkce = body.require_pkce;
    if (body.subject_type !== undefined) update.subject_type = body.subject_type;
    if (body.client_secret_expires_at !== undefined && body.client_secret_expires_at !== "") {
      update.client_secret_expires_at = body.client_secret_expires_at;
    }
    if (body.metadata !== undefined) update.metadata = body.metadata;

    const result = await auth.api.adminUpdateOAuthClient({
      headers: request.headers,
      body: {
        client_id: clientId,
        update,
      } as any,
    });

    return NextResponse.json(
      JSON.parse(JSON.stringify(result)) as Record<string, unknown>,
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin OAuth client update failed.", error);
    return NextResponse.json(
      { error: "Could not update the OAuth client. Check your inputs and try again." },
      { status: 400 }
    );
  }
}
