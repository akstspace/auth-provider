import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getVerifiedAdminSession,
  isSameOriginRequest,
} from "@/lib/api-route-auth";
import { validateRequestedScopes } from "@/lib/oauth-scope-store";

interface AdminCreateClientBody {
  client_name: string;
  redirect_uris: string[];
  scope: string;
  token_endpoint_auth_method?: "none" | "client_secret_basic" | "client_secret_post";
  skip_consent?: boolean;
  enable_end_session?: boolean;
  require_pkce?: boolean;
  subject_type?: "public" | "pairwise";
  client_secret_expires_at?: string | number;
  metadata?: Record<string, unknown>;
}

const createClientErrorResponse = () =>
  NextResponse.json(
    {
      error:
        "Could not create the OAuth client. Check your inputs and try again.",
    },
    { status: 400 },
  );

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: "Cross-origin OAuth client creation is not allowed." },
        { status: 403 },
      );
    }

    const verified = await getVerifiedAdminSession(request);
    if (verified.response) {
      return verified.response;
    }

    const body = (await request.json()) as AdminCreateClientBody;
    const scopeValidation = await validateRequestedScopes(body.scope, {
      selfServiceOnly: false,
    });

    if (!scopeValidation.ok) {
      return NextResponse.json(
        { error: scopeValidation.error },
        { status: 400 },
      );
    }

    const result = await auth.api.adminCreateOAuthClient({
      headers: request.headers,
      body: {
        redirect_uris: body.redirect_uris
          .map((value) => value.trim())
          .filter(Boolean),
        client_name: body.client_name.trim(),
        scope: scopeValidation.normalizedScopes.join(" "),
        ...(body.token_endpoint_auth_method
          ? { token_endpoint_auth_method: body.token_endpoint_auth_method }
          : {}),
        ...(body.skip_consent ? { skip_consent: true } : {}),
        ...(body.enable_end_session ? { enable_end_session: true } : {}),
        ...(body.require_pkce !== undefined
          ? { require_pkce: body.require_pkce }
          : {}),
        ...(body.subject_type ? { subject_type: body.subject_type } : {}),
        ...(body.client_secret_expires_at !== undefined &&
        body.client_secret_expires_at !== ""
          ? { client_secret_expires_at: body.client_secret_expires_at }
          : {}),
        ...(body.metadata ? { metadata: body.metadata } : {}),
      },
    });

    return NextResponse.json(
      JSON.parse(JSON.stringify(result)) as Record<string, unknown>,
      { status: 201 },
    );
  } catch (error) {
    console.error("Admin OAuth client creation failed.", error);
    return createClientErrorResponse();
  }
}
