import { NextRequest, NextResponse } from "next/server";
import {
  getVerifiedAdminSession,
  isSameOriginRequest,
} from "@/lib/api-route-auth";
import {
  getInviteOnlySettings,
  replaceInviteOnlySettings,
} from "@/lib/invite-only";

interface InviteOnlyBody {
  enabled?: boolean;
  emails?: string[];
  domains?: string[];
}

export async function GET(request: NextRequest) {
  const verified = await getVerifiedAdminSession(request);
  if (verified.response) {
    return verified.response;
  }

  try {
    const settings = await getInviteOnlySettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to load invite-only settings.", error);
    return NextResponse.json(
      { error: "Failed to load invite-only settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Cross-origin invite-only management is not allowed." },
      { status: 403 },
    );
  }

  const verified = await getVerifiedAdminSession(request);
  if (verified.response) {
    return verified.response;
  }
  const session = verified.session;

  try {
    const body = (await request.json()) as InviteOnlyBody;
    await replaceInviteOnlySettings({
      enabled: body.enabled === true,
      emails: Array.isArray(body.emails) ? body.emails : [],
      domains: Array.isArray(body.domains) ? body.domains : [],
      actorUserId: session.user.id,
    });

    const settings = await getInviteOnlySettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update invite-only settings.", error);
    return NextResponse.json(
      { error: "Failed to update invite-only settings." },
      { status: 400 },
    );
  }
}
