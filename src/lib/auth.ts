import "server-only";

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { session as authSession } from "@/db/auth-schema";
import { eq } from "drizzle-orm";
import {
  jwt,
  lastLoginMethod,
  twoFactor,
  admin,
  captcha,
  multiSession,
  haveIBeenPwned,
} from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { oauthProvider } from "@better-auth/oauth-provider";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  send2FAEmail,
} from "@/lib/email";
import { appName } from "@/lib/app-config";
import {
  getOAuthProviderScopeConfig,
} from "@/lib/oauth-scope-store";
import {
  isEmailPasswordAuthEnabled,
  isDynamicClientRegistrationEnabled,
  getOAuthValidAudiences,
  isUserClientCreationAllowed,
  validateInviteOnlyEmail,
} from "@/lib/invite-only";

const authBaseUrl = process.env.BETTER_AUTH_URL;
const oauthTrustedClientIds = process.env.OAUTH_TRUSTED_CLIENT_IDS
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const maximumBrowserSessions = Number(
  process.env.AUTH_MAX_BROWSER_SESSIONS ?? "5",
);
const enablePwnedPasswordChecks =
  process.env.AUTH_ENABLE_HIBP_PASSWORD_CHECKS === "true" ||
  (process.env.AUTH_ENABLE_HIBP_PASSWORD_CHECKS !== "false" &&
    process.env.NODE_ENV === "production");
const captchaSecretKey = process.env.TURNSTILE_SECRET_KEY;
const oauthScopeConfig = await getOAuthProviderScopeConfig();
const oauthScopes = oauthScopeConfig.allScopeKeys;
// All self-service scopes (built-in + custom) available at startup.
// Used for both defaults and allowed scopes in dynamic client registration.
const selfServiceScopeKeys = oauthScopeConfig.selfServiceScopeKeys;
// Read at startup — like oauthScopeConfig. Changes take effect after a server restart.
const dynamicClientRegistrationEnabled = await isDynamicClientRegistrationEnabled();
const oauthValidAudiences = await getOAuthValidAudiences();
const EMAIL_PASSWORD_AUTH_DISABLED_MESSAGE =
  "Email/password authentication is currently disabled by an administrator.";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = typeof user.email === "string" ? user.email : null;
          if (!email) {
            return;
          }

          const validation = await validateInviteOnlyEmail(email);
          if (!validation.allowed) {
            throw new APIError("FORBIDDEN", {
              message: validation.message,
            });
          }
        },
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const emailPasswordAuthEnabled = await isEmailPasswordAuthEnabled();
      if (!emailPasswordAuthEnabled) {
        const disabledPaths = new Set([
          "/sign-in/email",
          "/sign-up/email",
          "/request-password-reset",
          "/reset-password",
        ]);

        if (disabledPaths.has(ctx.path)) {
          throw new APIError("FORBIDDEN", {
            message: EMAIL_PASSWORD_AUTH_DISABLED_MESSAGE,
          });
        }
      }

      if (ctx.path !== "/sign-up/email") {
        return;
      }

      const email =
        typeof ctx.body?.email === "string" ? ctx.body.email : null;

      if (!email) {
        return;
      }

      const validation = await validateInviteOnlyEmail(email);
      if (!validation.allowed) {
        throw new APIError("FORBIDDEN", {
          message: validation.message,
        });
      }
    }),
  },

  // Prevent conflict with the OAuth provider's /token endpoint
  disabledPaths: ["/token"],

  onAPIError: {
    errorURL: "/auth/error",
  },

  // ── Account Linking ───────────────────────────────────────────
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  // ── Email & Password Authentication ───────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: sendPasswordResetEmail,
  },

  emailVerification: {
    sendVerificationEmail,
  },

  // ── Social Providers ──────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  // ── Plugins ───────────────────────────────────────────────────
  plugins: [
    jwt(),

    passkey(),

    lastLoginMethod(),

    multiSession({
      maximumSessions:
        Number.isFinite(maximumBrowserSessions) && maximumBrowserSessions > 0
          ? maximumBrowserSessions
          : 5,
    }),

    twoFactor({
      issuer: appName,
      otpOptions: {
        sendOTP: send2FAEmail,
      },
    }),

    ...(enablePwnedPasswordChecks
      ? [
        haveIBeenPwned({
          customPasswordCompromisedMessage:
            "This password appears in a known breach. Please choose a different one.",
        }),
      ]
      : []),

    ...(captchaSecretKey
      ? [
        captcha({
          provider: "cloudflare-turnstile",
          secretKey: captchaSecretKey,
        }),
      ]
      : []),

    admin({
      bannedUserMessage:
        "Your account has been suspended. Contact a platform administrator if you think this is a mistake.",
    }),

    // ── OAuth 2.1 Provider ─────────────────────────────────────────
    oauthProvider({
      loginPage: "/login",
      selectAccount: {
        page: "/select-account",
        shouldRedirect: async ({ user }) => {
          const allSessions = await db.query.session.findMany({
            where: eq(authSession.userId, user.id),
          });
          return allSessions.length > 1;
        },
      },
      signup: {
        page: "/signup",
      },
      consentPage: "/consent",

      // Supported scopes
      scopes: oauthScopes,
      advertisedMetadata: {
        scopes_supported: oauthScopes,
      },

      // Public issuer/resource metadata
      validAudiences:
        oauthValidAudiences.length > 0
          ? oauthValidAudiences
          : undefined,
      cachedTrustedClients:
        oauthTrustedClientIds && oauthTrustedClientIds.length > 0
          ? new Set(oauthTrustedClientIds)
          : undefined,
      pairwiseSecret: process.env.OAUTH_PAIRWISE_SUBJECT_SECRET,
      // Both read from DB at startup — changes take effect after a server restart.
      allowDynamicClientRegistration: dynamicClientRegistrationEnabled,
      allowUnauthenticatedClientRegistration: dynamicClientRegistrationEnabled,
      silenceWarnings: {
        oauthAuthServerConfig: true,
      },
      clientRegistrationDefaultScopes: selfServiceScopeKeys,
      clientRegistrationAllowedScopes: selfServiceScopeKeys,
      clientRegistrationClientSecretExpiration: "30d",

      // Per-endpoint rate limits
      rateLimit: {
        token: { window: 60, max: 20 },
        authorize: { window: 60, max: 30 },
        introspect: { window: 60, max: 100 },
        revoke: { window: 60, max: 30 },
        register: { window: 60, max: 5 },
        userinfo: { window: 60, max: 60 },
      },

      clientPrivileges: async ({ action, user }) => {
        if (action === "create") {
          const isAllowedLocal = await isUserClientCreationAllowed();
          if (!isAllowedLocal && user?.role !== "admin") {
            return false;
          }
        }
        return true; // allow all other actions (list, read, update, delete, rotate)
      },
    }),
  ],

  // ── Rate Limiting ─────────────────────────────────────────────
  rateLimit: {
    enabled: true,
    window: 60,
    max: 300,
    customRules: {
      "/sign-in/social": { window: 60, max: 20 },
      "/sign-in/passkey": { window: 60, max: 20 },
      "/sign-in/email": { window: 60, max: 20 },
      "/sign-up/email": { window: 60, max: 12 },
      "/send-verification-email": { window: 300, max: 4 },
      "/two-factor/send-otp": { window: 300, max: 10 },
      "/two-factor/verify-totp": { window: 60, max: 20 },
      "/two-factor/verify-otp": { window: 60, max: 20 },
      "/request-password-reset": { window: 300, max: 6 },
      "/reset-password": { window: 300, max: 10 },
    },
  },

  baseURL: authBaseUrl,
});
