const INTERNAL_CALLBACK_PREFIX = "/";
const OAUTH_AUTHORIZE_PATH = "/api/auth/oauth2/authorize";
const APP_FLOW_PARAMS = new Set(["callbackUrl"]);

interface AuthFlowParams {
  callbackUrl: string | null;
  oauthQuery: string | null;
}

const sanitizeCallbackUrl = (value: string | null): string | null => {
  if (!value) return null;
  if (!value.startsWith(INTERNAL_CALLBACK_PREFIX)) return null;
  if (value.startsWith("//")) return null;
  return value;
};

export const getSignedOAuthQuery = (searchParams: {
  get(name: string): string | null;
  entries(): IterableIterator<[string, string]>;
}): string | null => {
  if (!searchParams.get("sig")) return null;

  const signedParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    signedParams.append(key, value);
    if (key === "sig") break;
  }

  const query = signedParams.toString();
  return query.length > 0 ? query : null;
};

export const getOAuthFlowQuery = (searchParams: {
  get(name: string): string | null;
  entries(): IterableIterator<[string, string]>;
}): string | null => {
  const signedQuery = getSignedOAuthQuery(searchParams);
  if (signedQuery) return signedQuery;

  const hasAuthorizeParams =
    Boolean(searchParams.get("client_id")) &&
    Boolean(searchParams.get("redirect_uri")) &&
    Boolean(searchParams.get("response_type"));

  if (!hasAuthorizeParams) return null;

  const query = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (APP_FLOW_PARAMS.has(key)) continue;
    query.append(key, value);
  }

  const serialized = query.toString();
  return serialized.length > 0 ? serialized : null;
};

export const getOAuthAuthorizeUrl = (
  oauthQuery: string | null,
): string | null => {
  if (!oauthQuery) return null;
  return `${OAUTH_AUTHORIZE_PATH}?${oauthQuery}`;
};

export const getAuthFlowParams = (searchParams: {
  get(name: string): string | null;
  entries(): IterableIterator<[string, string]>;
}): AuthFlowParams => {
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const oauthQuery = getOAuthFlowQuery(searchParams);

  return {
    callbackUrl,
    oauthQuery,
  };
};

export const resolveCallbackUrl = ({
  oauthQuery,
  callbackUrl,
}: AuthFlowParams): string => {
  return getOAuthAuthorizeUrl(oauthQuery) ?? callbackUrl ?? "/";
};

export const withAuthFlow = (
  pathname: string,
  params: Partial<AuthFlowParams>,
): string => {
  const query = new URLSearchParams(params.oauthQuery ?? undefined);

  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl ?? null);
  if (callbackUrl) query.set("callbackUrl", callbackUrl);

  const qs = query.toString();
  if (!qs) return pathname;
  return `${pathname}${pathname.includes("?") ? "&" : "?"}${qs}`;
};
