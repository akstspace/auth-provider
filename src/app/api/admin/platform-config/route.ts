import { NextRequest, NextResponse } from "next/server";
import {
  getVerifiedAdminSession,
  isSameOriginRequest,
} from "@/lib/api-route-auth";
import { db } from "@/db";
import { platformConfig } from "@/db/app-schema";
import { eq } from "drizzle-orm";
import { PLATFORM_CONFIG_ID } from "@/lib/invite-only";

interface PlatformConfigBody {
  allowUserClientCreation?: boolean;
  allowDynamicClientRegistration?: boolean;
  emailPasswordAuthEnabled?: boolean;
}

export async function GET(request: NextRequest) {
  const verified = await getVerifiedAdminSession(request);
  if (verified.response) {
    return verified.response;
  }

  try {
    const config = await db.query.platformConfig.findFirst({
      where: eq(platformConfig.id, PLATFORM_CONFIG_ID),
    });

    return NextResponse.json({
      allowUserClientCreation: config?.allowUserClientCreation ?? true,
      emailPasswordAuthEnabled: config?.emailPasswordAuthEnabled ?? true,
      allowDynamicClientRegistration:
        config?.allowDynamicClientRegistration ??
        process.env.OAUTH_ALLOW_DYNAMIC_CLIENT_REGISTRATION === "true",
    });
  } catch (error) {
    console.error("Failed to load platform config.", error);
    return NextResponse.json(
      { error: "Failed to load platform settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Cross-origin settings management is not allowed." },
      { status: 403 },
    );
  }

  const verified = await getVerifiedAdminSession(request);
  if (verified.response) {
    return verified.response;
  }

  try {
    const body = (await request.json()) as PlatformConfigBody;
    const existingConfig = await db.query.platformConfig.findFirst({
      where: eq(platformConfig.id, PLATFORM_CONFIG_ID),
    });
    const allowUserClientCreation =
      body.allowUserClientCreation ??
      existingConfig?.allowUserClientCreation ??
      true;
    const emailPasswordAuthEnabled =
      body.emailPasswordAuthEnabled ??
      existingConfig?.emailPasswordAuthEnabled ??
      true;
    const allowDynamicClientRegistration =
      body.allowDynamicClientRegistration ??
      existingConfig?.allowDynamicClientRegistration ??
      process.env.OAUTH_ALLOW_DYNAMIC_CLIENT_REGISTRATION === "true";

    await db
      .insert(platformConfig)
      .values({
        id: PLATFORM_CONFIG_ID,
        allowUserClientCreation,
        emailPasswordAuthEnabled,
        allowDynamicClientRegistration,
      })
      .onConflictDoUpdate({
        target: platformConfig.id,
        set: {
          allowUserClientCreation,
          emailPasswordAuthEnabled,
          allowDynamicClientRegistration,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      allowUserClientCreation,
      emailPasswordAuthEnabled,
      allowDynamicClientRegistration,
    });
  } catch (error) {
    console.error("Failed to update platform config.", error);
    return NextResponse.json(
      { error: "Failed to update platform settings." },
      { status: 400 },
    );
  }
}
