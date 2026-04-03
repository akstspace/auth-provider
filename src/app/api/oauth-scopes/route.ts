import { NextRequest, NextResponse } from "next/server";
import { listOAuthScopeDefinitions } from "@/lib/oauth-scope-store";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("mode");
    const keys = searchParams
      .get("keys")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const selfServiceOnly =
      mode === "self-service" || (!keys || keys.length === 0);

    const scopes = await listOAuthScopeDefinitions({
      selfServiceOnly,
      keys,
    });

    return NextResponse.json({ scopes });
  } catch (error) {
    console.error("Failed to load OAuth scope definitions.", error);
    return NextResponse.json(
      { error: "Failed to load OAuth scope definitions." },
      { status: 500 },
    );
  }
}
