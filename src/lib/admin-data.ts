"use client";

import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-error";

export type AdminSearchField = "email" | "name";
export type AdminSearchOperator = "contains" | "starts_with" | "ends_with";
export type AdminSortDirection = "asc" | "desc";
export type AdminFilterKey =
  | "all"
  | "admins"
  | "users"
  | "banned"
  | "active"
  | "verified"
  | "unverified";

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | Date | null;
}

export interface AdminSessionRecord {
  id: string;
  expiresAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  impersonatedBy?: string | null;
}


interface AdminUsersResponse {
  users: AdminUserRecord[];
  total: number;
  limit: number;
  offset: number;
}

interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalBanned: number;
  totalVerified: number;
}

export interface AdminListQuery {
  searchValue: string;
  searchField: AdminSearchField;
  searchOperator: AdminSearchOperator;
  filterKey: AdminFilterKey;
  sortBy: string;
  sortDirection: AdminSortDirection;
  limit: number;
  offset: number;
}

export const DEFAULT_ADMIN_LIST_QUERY: AdminListQuery = {
  searchValue: "",
  searchField: "email",
  searchOperator: "contains",
  filterKey: "all",
  sortBy: "createdAt",
  sortDirection: "desc",
  limit: 12,
  offset: 0,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseUser = (value: unknown): AdminUserRecord | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;
  if (typeof value.name !== "string") return null;
  if (typeof value.email !== "string") return null;

  return {
    id: value.id,
    name: value.name,
    email: value.email,
    image: typeof value.image === "string" ? value.image : null,
    emailVerified: Boolean(value.emailVerified),
    createdAt:
      typeof value.createdAt === "string" || value.createdAt instanceof Date
        ? value.createdAt
        : null,
    updatedAt:
      typeof value.updatedAt === "string" || value.updatedAt instanceof Date
        ? value.updatedAt
        : null,
    role: typeof value.role === "string" ? value.role : null,
    banned:
      typeof value.banned === "boolean" || value.banned === null
        ? value.banned
        : null,
    banReason: typeof value.banReason === "string" ? value.banReason : null,
    banExpires:
      typeof value.banExpires === "string" || value.banExpires instanceof Date
        ? value.banExpires
        : null,
  };
};

const parseSession = (value: unknown): AdminSessionRecord | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;

  return {
    id: value.id,
    expiresAt:
      typeof value.expiresAt === "string" || value.expiresAt instanceof Date
        ? value.expiresAt
        : null,
    createdAt:
      typeof value.createdAt === "string" || value.createdAt instanceof Date
        ? value.createdAt
        : null,
    updatedAt:
      typeof value.updatedAt === "string" || value.updatedAt instanceof Date
        ? value.updatedAt
        : null,
    ipAddress: typeof value.ipAddress === "string" ? value.ipAddress : null,
    userAgent: typeof value.userAgent === "string" ? value.userAgent : null,
    userId: typeof value.userId === "string" ? value.userId : null,
    impersonatedBy:
      typeof value.impersonatedBy === "string" ? value.impersonatedBy : null,
  };
};

export const unwrapAdminUser = (value: unknown): AdminUserRecord | null => {
  if (isRecord(value) && "user" in value) {
    return parseUser(value.user);
  }

  return parseUser(value);
};

export const formatAdminError = (error: unknown, fallback: string) =>
  getAuthErrorMessage(error, fallback);

export const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};


const resolveFilterQuery = (filterKey: AdminFilterKey) => {
  switch (filterKey) {
    case "admins":
      return { filterField: "role", filterValue: "admin", filterOperator: "contains" as const };
    case "users":
      return { filterField: "role", filterValue: "user", filterOperator: "contains" as const };
    case "banned":
      return { filterField: "banned", filterValue: true, filterOperator: "eq" as const };
    case "active":
      return { filterField: "banned", filterValue: false, filterOperator: "eq" as const };
    case "verified":
      return {
        filterField: "emailVerified",
        filterValue: true,
        filterOperator: "eq" as const,
      };
    case "unverified":
      return {
        filterField: "emailVerified",
        filterValue: false,
        filterOperator: "eq" as const,
      };
    default:
      return {};
  }
};

export const listAdminUsers = async (
  query: AdminListQuery,
): Promise<{ data: AdminUsersResponse | null; error: string | null }> => {
  try {
    const filterQuery = resolveFilterQuery(query.filterKey);
    const result = await authClient.admin.listUsers({
      query: {
        limit: query.limit,
        offset: query.offset,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        ...(query.searchValue.trim()
          ? {
              searchValue: query.searchValue.trim(),
              searchField: query.searchField,
              searchOperator: query.searchOperator,
            }
          : {}),
        ...filterQuery,
      },
    });

    if (result.error) {
      return {
        data: null,
        error: formatAdminError(result.error, "Failed to load users."),
      };
    }

    const payload = result.data;
    if (!isRecord(payload) || !Array.isArray(payload.users)) {
      return {
        data: {
          users: [],
          total: 0,
          limit: query.limit,
          offset: query.offset,
        },
        error: null,
      };
    }

    const raw = payload as Record<string, unknown>;
    return {
      data: {
        users: payload.users
          .map((item) => parseUser(item))
          .filter((item): item is AdminUserRecord => Boolean(item)),
        total: typeof payload.total === "number" ? payload.total : 0,
        limit: typeof raw.limit === "number" ? raw.limit : query.limit,
        offset:
          typeof raw.offset === "number" ? raw.offset : query.offset,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: formatAdminError(error, "Failed to load users."),
    };
  }
};

export const getAdminStats = async (): Promise<{
  data: AdminStats | null;
  error: string | null;
}> => {
  try {
    const [allUsers, admins, banned, verified] = await Promise.all([
      authClient.admin.listUsers({ query: { limit: 1, offset: 0 } }),
      authClient.admin.listUsers({
        query: {
          limit: 1,
          offset: 0,
          filterField: "role",
          filterValue: "admin",
          filterOperator: "contains",
        },
      }),
      authClient.admin.listUsers({
        query: {
          limit: 1,
          offset: 0,
          filterField: "banned",
          filterValue: true,
          filterOperator: "eq",
        },
      }),
      authClient.admin.listUsers({
        query: {
          limit: 1,
          offset: 0,
          filterField: "emailVerified",
          filterValue: true,
          filterOperator: "eq",
        },
      }),
    ]);

    const results = [
      { label: "total users", result: allUsers },
      { label: "admins", result: admins },
      { label: "banned users", result: banned },
      { label: "verified users", result: verified },
    ];

    for (const { label, result } of results) {
      if (result.error) {
        return {
          data: null,
          error: formatAdminError(result.error, `Failed to load ${label}.`),
        };
      }
      if (!result.data) {
        return {
          data: null,
          error: `Failed to load ${label}: no data returned.`,
        };
      }
    }

    const readTotal = (value: unknown) =>
      isRecord(value) && typeof value.total === "number" ? value.total : 0;

    return {
      data: {
        totalUsers: readTotal(allUsers.data),
        totalAdmins: readTotal(admins.data),
        totalBanned: readTotal(banned.data),
        totalVerified: readTotal(verified.data),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: formatAdminError(error, "Could not load admin stats."),
    };
  }
};

export const getAdminUserDetails = async (userId: string) => {
  try {
    const [userResult, sessionsResult] = await Promise.all([
      authClient.admin.getUser({ query: { id: userId } }),
      authClient.admin.listUserSessions({ userId }),
    ]);

    if (userResult.error) {
      return {
        data: null,
        error: formatAdminError(userResult.error, "Failed to load the user."),
      };
    }

    const sessionPayload = sessionsResult.data;
    const sessions =
      isRecord(sessionPayload) && Array.isArray(sessionPayload.sessions)
        ? sessionPayload.sessions
            .map((value) => parseSession(value))
            .filter((value): value is AdminSessionRecord => Boolean(value))
        : [];

    return {
      data: {
        user: unwrapAdminUser(userResult.data),
        sessions,
      },
      error: sessionsResult.error
        ? formatAdminError(sessionsResult.error, "Failed to load sessions.")
        : null,
    };
  } catch (error) {
    return {
      data: null,
      error: formatAdminError(error, "Failed to load the user."),
    };
  }
};
