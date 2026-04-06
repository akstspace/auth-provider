import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
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
  BUILTIN_SELF_SERVICE_SCOPE_KEYS,
  getOAuthProviderScopeConfig,
} from "@/lib/oauth-scope-store";

const authBaseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const oauthValidAudiences = process.env.OAUTH_VALID_AUDIENCES
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const oauthTrustedClientIds = process.env.OAUTH_TRUSTED_CLIENT_IDS
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const allowDynamicClientRegistration =
  process.env.OAUTH_ALLOW_DYNAMIC_CLIENT_REGISTRATION === "true";
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
const dynamicRegistrationAllowedScopes =
  oauthScopeConfig.selfServiceScopeKeys.filter(
    (scope) => !BUILTIN_SELF_SERVICE_SCOPE_KEYS.includes(scope),
  );

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // Prevent conflict with the OAuth provider's /token endpoint
  disabledPaths: ["/token"],

  onAPIError: {
    errorURL: "/auth/error",
  },

  // ── Account Linking ───────────────────────────────────────────
  account: {
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

    haveIBeenPwned({
      enabled: enablePwnedPasswordChecks,
      customPasswordCompromisedMessage:
        "This password appears in a known breach. Please choose a different one.",
    }),

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
        shouldRedirect: async ({ headers }) => {
          const allSessions = await auth.api.listDeviceSessions({
            headers,
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
        oauthValidAudiences && oauthValidAudiences.length > 0
          ? oauthValidAudiences
          : undefined,
      cachedTrustedClients:
        oauthTrustedClientIds && oauthTrustedClientIds.length > 0
          ? new Set(oauthTrustedClientIds)
          : undefined,
      pairwiseSecret: process.env.OAUTH_PAIRWISE_SUBJECT_SECRET,
      allowDynamicClientRegistration,
      clientRegistrationDefaultScopes: allowDynamicClientRegistration
        ? [...BUILTIN_SELF_SERVICE_SCOPE_KEYS]
        : undefined,
      clientRegistrationAllowedScopes: allowDynamicClientRegistration
        ? dynamicRegistrationAllowedScopes
        : undefined,
      clientRegistrationClientSecretExpiration: allowDynamicClientRegistration
        ? "30d"
        : undefined,

      // Per-endpoint rate limits
      rateLimit: {
        token: { window: 60, max: 20 },
        authorize: { window: 60, max: 30 },
        introspect: { window: 60, max: 100 },
        revoke: { window: 60, max: 30 },
        register: { window: 60, max: 5 },
        userinfo: { window: 60, max: 60 },
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
      "/two-factor/send-otp": { window: 300, max: 10 },
      "/two-factor/verify-totp": { window: 60, max: 20 },
      "/two-factor/verify-otp": { window: 60, max: 20 },
      "/request-password-reset": { window: 300, max: 6 },
      "/reset-password": { window: 300, max: 10 },
    },
  },

  baseURL: authBaseUrl,
});
