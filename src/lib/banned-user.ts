import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-error";

interface AuthErrorPagePayload {
  error?: string | null;
  email?: string | null;
  errorDescription?: string | null;
  reason?: string | null;
  expiresAt?: string | null;
}

const sanitizeValue = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const buildAuthErrorUrl = (payload: AuthErrorPagePayload = {}) => {
  const params = new URLSearchParams();

  const error = sanitizeValue(payload.error);
  const email = sanitizeValue(payload.email);
  const errorDescription = sanitizeValue(payload.errorDescription);
  const reason = sanitizeValue(payload.reason);
  const expiresAt = sanitizeValue(payload.expiresAt);

  if (error) params.set("error", error);
  if (email) params.set("email", email);
  if (errorDescription) params.set("error_description", errorDescription);
  if (reason) params.set("reason", reason);
  if (expiresAt) params.set("expiresAt", expiresAt);

  const query = params.toString();
  return query ? `/auth/error?${query}` : "/auth/error";
};

export const isBannedError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  if (code === "BANNED_USER") return true;

  const message = getAuthErrorMessage(error, "");
  return message.toLowerCase().includes("banned");
};

export const getBannedMessage = (error: unknown) =>
  getAuthErrorMessage(
    error,
    "Your account has been suspended. Contact a platform administrator if you think this is a mistake.",
  );
