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

export const isSameOriginRequest = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  if (origin) {
    return origin === request.nextUrl.origin;
  }

  const referer = request.headers.get("referer");
  return isSameOriginUrl(referer, request.nextUrl.origin);
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

  if (!isPlatformAdmin(verified.session.user.role)) {
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
