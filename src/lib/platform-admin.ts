const PLATFORM_ADMIN_ROLE = "admin";

const normalizeRoleSource = (role: string | null | undefined) =>
  (role ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const splitRoleList = (role: string | null | undefined): string[] =>
  normalizeRoleSource(role);

export const formatRoleList = (role: string | null | undefined): string =>
  splitRoleList(role).join(", ");

export const isPlatformAdmin = (role: string | null | undefined): boolean =>
  splitRoleList(role).some((value) => value === PLATFORM_ADMIN_ROLE);

const parseRoleInput = (value: string): string[] =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

export const toRolePayload = (value: string): string | string[] => {
  const roles = parseRoleInput(value);
  if (roles.length <= 1) {
    return roles[0] ?? "user";
  }

  return roles;
};

export const isImpersonating = (
  session: { session?: { impersonatedBy?: string | null } | null } | null | undefined,
): boolean => Boolean(session?.session?.impersonatedBy);
