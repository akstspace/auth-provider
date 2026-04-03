import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getVerifiedSession,
  isSameOriginRequest,
} from "@/lib/api-route-auth";
import { validateRequestedScopes } from "@/lib/oauth-scope-store";

interface CreateClientBody {
  client_name: string;
  redirect_uris: string[];
  scope: string;
  token_endpoint_auth_method?: "none" | "client_secret_basic" | "client_secret_post";
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

    const verified = await getVerifiedSession(request);
    if (verified.response) {
      return verified.response;
    }

    const body = (await request.json()) as CreateClientBody;
    const scopeValidation = await validateRequestedScopes(body.scope, {
      selfServiceOnly: true,
    });

    if (!scopeValidation.ok) {
      return NextResponse.json(
        { error: scopeValidation.error },
        { status: 400 },
      );
    }

    const result = await auth.api.createOAuthClient({
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
      },
    });

    return NextResponse.json(
      JSON.parse(JSON.stringify(result)) as Record<string, unknown>,
      { status: 201 },
    );
  } catch (error) {
    console.error("OAuth client creation failed.", error);
    return createClientErrorResponse();
  }
}
