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

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown; body?: unknown };
    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      return maybeError.message;
    }

    if (typeof maybeError.body === "object" && maybeError.body !== null) {
      const body = maybeError.body as { message?: unknown; error?: unknown };
      if (typeof body.message === "string" && body.message.trim()) {
        return body.message;
      }
      if (typeof body.error === "string" && body.error.trim()) {
        return body.error;
      }
    }
  }

  return null;
};

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
    const redirectUris = body.redirect_uris
      .map((value) => value.trim())
      .filter(Boolean);
    if (redirectUris.length === 0) {
      return NextResponse.json(
        { error: "At least one redirect URI is required." },
        { status: 400 },
      );
    }

    if (!body.client_name?.trim()) {
      return NextResponse.json(
        { error: "Client name is required." },
        { status: 400 },
      );
    }

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
        redirect_uris: redirectUris,
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
    const message = getErrorMessage(error);
    if (message) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return createClientErrorResponse();
  }
}
