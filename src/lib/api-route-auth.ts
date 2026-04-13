import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform-admin";

const isSameOriginUrl = (value: string | null, expectedOrigin: string) => {
  if (!value) return false;

  try {
    return new URL(value).origin === expectedOrigin;
  } catch {
    return false;
  }
};

const getAllowedOrigins = () => {
  const origins = new Set<string>();
  origins.add(process.env.BETTER_AUTH_URL || "");
  origins.add(process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "");
  return Array.from(origins).filter(Boolean);
};

export const isSameOriginRequest = (request: NextRequest) => {
  const allowedOrigins = getAllowedOrigins();

  const origin = request.headers.get("origin");
  if (origin) {
    if (origin === request.nextUrl.origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    return false;
  }

  const referer = request.headers.get("referer");
  if (isSameOriginUrl(referer, request.nextUrl.origin)) return true;
  if (referer && allowedOrigins.some((o) => isSameOriginUrl(referer, o))) {
    return true;
  }

  return false;
};

export const getVerifiedSession = async (request: NextRequest) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  if (!session.user.emailVerified) {
    return {
      session: null,
      response: NextResponse.json(
        {
          error:
            "Email verification is required before continuing with this action.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    session,
    response: null,
  };
};

export const getVerifiedAdminSession = async (request: NextRequest) => {
  const verified = await getVerifiedSession(request);
  if (verified.response) return verified;

  const role =
    "role" in verified.session.user &&
    (typeof verified.session.user.role === "string" ||
      verified.session.user.role === null)
      ? verified.session.user.role
      : undefined;

  if (!isPlatformAdmin(role)) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Platform admin access is required." },
        { status: 403 },
      ),
    };
  }

  return verified;
};
