"use client";

import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { lastLoginMethodClient, multiSessionClient, twoFactorClient } from "better-auth/client/plugins";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { getOAuthFlowQuery, withAuthFlow } from "@/lib/auth-flow";
import { adminClient } from "better-auth/client/plugins";

const authClientBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
if (!authClientBaseUrl) {
  throw new Error("NEXT_PUBLIC_BETTER_AUTH_URL is required.");
}

export const authClient = createAuthClient({
  baseURL: authClientBaseUrl,
  plugins: [
    jwtClient(),
    passkeyClient(),
    lastLoginMethodClient(),
    multiSessionClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        const params = new URLSearchParams(window.location.search);
        window.location.href = withAuthFlow("/2fa", {
          callbackUrl: params.get("callbackUrl"),
          oauthQuery: getOAuthFlowQuery(params),
        });
      },
    }),
    adminClient(),
    oauthProviderClient(),
  ],
  fetchOptions: {
    onError: async (ctx) => {
      if (ctx.response.status === 429) {
        console.warn("[Auth] Rate limited — please try again shortly.");
        return;
      }
      console.error(
        "[Auth] Request failed:",
        getAuthErrorMessage(ctx.error, "Unexpected authentication error."),
      );
    },
  },
});
