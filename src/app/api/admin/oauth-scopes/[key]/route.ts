import { NextRequest, NextResponse } from "next/server";
import {
  getVerifiedAdminSession,
  isSameOriginRequest,
} from "@/lib/api-route-auth";
import { updateCustomOAuthScope } from "@/lib/oauth-scope-store";

interface UpdateScopeBody {
  label?: string;
  description?: string;
  allowSelfService?: boolean;
  isActive?: boolean;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
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
    const { key } = await params;
    const body = (await request.json()) as UpdateScopeBody;
    const result = await updateCustomOAuthScope(key, body);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      scope: result.data,
      restartRequired: true,
    });
  } catch (error) {
    console.error("Failed to update OAuth scope.", error);
    return NextResponse.json(
      { error: "Failed to update OAuth scope." },
      { status: 400 },
    );
  }
}
