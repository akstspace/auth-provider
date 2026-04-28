export interface OAuthScopeDefinition {
  key: string;
  label: string;
  description: string;
  isSystem: boolean;
  allowSelfService: boolean;
  isActive: boolean;
}

export const BUILTIN_OAUTH_SCOPE_DEFINITIONS: OAuthScopeDefinition[] = [
  {
    key: "openid",
    label: "OpenID",
    description: "Verify the user’s identity.",
    isSystem: true,
    allowSelfService: true,
    isActive: true,
  },
  {
    key: "profile",
    label: "Profile",
    description: "Access the user’s basic profile information.",
    isSystem: true,
    allowSelfService: true,
    isActive: true,
  },
  {
    key: "email",
    label: "Email",
    description: "Access the user’s email address and verification status.",
    isSystem: true,
    allowSelfService: true,
    isActive: true,
  },
  {
    key: "offline_access",
    label: "Offline Access",
    description: "Issue refresh tokens so the client can act when the user is away.",
    isSystem: true,
    allowSelfService: true,
    isActive: true,
  },
];

export const BUILTIN_OAUTH_SCOPE_KEYS = BUILTIN_OAUTH_SCOPE_DEFINITIONS.map(
  (scope) => scope.key,
);

export const BUILTIN_SELF_SERVICE_SCOPE_KEYS =
  BUILTIN_OAUTH_SCOPE_DEFINITIONS.filter((scope) => scope.allowSelfService).map(
    (scope) => scope.key,
  );

export const OAUTH_SCOPE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;
