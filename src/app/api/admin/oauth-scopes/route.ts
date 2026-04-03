import { NextRequest, NextResponse } from "next/server";
import {
  getVerifiedAdminSession,
  isSameOriginRequest,
} from "@/lib/api-route-auth";
import {
  createCustomOAuthScope,
  listOAuthScopeDefinitions,
} from "@/lib/oauth-scope-store";

interface CreateScopeBody {
  key: string;
  label: string;
  description: string;
  allowSelfService?: boolean;
  isActive?: boolean;
}

export async function GET(request: NextRequest) {
  const verified = await getVerifiedAdminSession(request);
  if (verified.response) {
    return verified.response;
  }

  try {
    const scopes = await listOAuthScopeDefinitions({
      includeInactive: true,
    });
    return NextResponse.json({
      scopes,
      restartRequired: true,
    });
  } catch (error) {
    console.error("Failed to load admin OAuth scopes.", error);
    return NextResponse.json(
      { error: "Failed to load OAuth scopes." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Cross-origin scope management is not allowed." },
      { status: 403 },
    );
  }

  const verified = await getVerifiedAdminSession(request);
  if (verified.response) {
    return verified.response;
  }

  try {
    const body = (await request.json()) as CreateScopeBody;
    const result = await createCustomOAuthScope({
      key: body.key,
      label: body.label,
      description: body.description,
      allowSelfService: Boolean(body.allowSelfService),
      isActive: body.isActive !== false,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { scope: result.data, restartRequired: true },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create OAuth scope.", error);
    return NextResponse.json(
      { error: "Failed to create OAuth scope." },
      { status: 400 },
    );
  }
}
