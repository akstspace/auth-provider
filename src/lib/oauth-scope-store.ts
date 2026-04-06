import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { oauthScopeDefinition } from "@/db/app-schema";
import {
  BUILTIN_OAUTH_SCOPE_DEFINITIONS,
  BUILTIN_OAUTH_SCOPE_KEYS,
  BUILTIN_SELF_SERVICE_SCOPE_KEYS,
  OAUTH_SCOPE_KEY_PATTERN,
  type OAuthScopeDefinition,
} from "@/lib/oauth-scope-constants";

type ScopeRow = typeof oauthScopeDefinition.$inferSelect;

const BUILTIN_SCOPE_MAP = new Map(
  BUILTIN_OAUTH_SCOPE_DEFINITIONS.map((scope) => [scope.key, scope]),
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isMissingScopeTableError = (error: unknown) => {
  if (!isRecord(error)) return false;
  const message = typeof error.message === "string" ? error.message : "";
  const code = typeof error.code === "string" ? error.code : "";
  return code === "42P01" || /oauth_scope_definition/.test(message);
};

const sortScopeDefinitions = (definitions: OAuthScopeDefinition[]) =>
  [...definitions].sort((left, right) => {
    if (left.isSystem !== right.isSystem) {
      return left.isSystem ? -1 : 1;
    }
    return left.key.localeCompare(right.key);
  });

const validateStoredScopeRows = (rows: ScopeRow[]) => {
  for (const row of rows) {
    if (row.isSystem && !BUILTIN_SCOPE_MAP.has(row.key)) {
      throw new Error(
        `Invalid stored OAuth scope definition "${row.key}": unknown system scope.`,
      );
    }

    if (!row.isSystem && BUILTIN_SCOPE_MAP.has(row.key)) {
      throw new Error(
        `Invalid stored OAuth scope definition "${row.key}": custom scopes cannot shadow built-in scopes.`,
      );
    }
  }
};

const normalizeCustomScopeRow = (row: ScopeRow): OAuthScopeDefinition => ({
  key: row.key,
  label: row.label,
  description: row.description,
  isSystem: false,
  allowSelfService: row.allowSelfService,
  isActive: row.isActive,
});

const mergeScopeDefinitions = (
  rows: ScopeRow[],
  keys?: string[],
): OAuthScopeDefinition[] => {
  validateStoredScopeRows(rows);

  const customDefinitions = rows
    .filter((row) => !row.isSystem)
    .map((row) => normalizeCustomScopeRow(row));
  const customMap = new Map(customDefinitions.map((scope) => [scope.key, scope]));
  const allDefinitions = [
    ...BUILTIN_OAUTH_SCOPE_DEFINITIONS,
    ...customDefinitions,
  ];

  if (keys && keys.length > 0) {
    return keys
      .map((key) => BUILTIN_SCOPE_MAP.get(key) ?? customMap.get(key) ?? null)
      .filter((scope): scope is OAuthScopeDefinition => Boolean(scope));
  }

  return sortScopeDefinitions(allDefinitions);
};

const queryStoredScopeRows = async ({
  includeInactive = false,
  keys,
}: {
  includeInactive?: boolean;
  keys?: string[];
} = {}): Promise<ScopeRow[]> => {
  try {
    const predicates = [];

    if (!includeInactive) {
      predicates.push(eq(oauthScopeDefinition.isActive, true));
    }

    if (keys && keys.length > 0) {
      predicates.push(inArray(oauthScopeDefinition.key, keys));
    }

    if (predicates.length === 0) {
      return await db
        .select()
        .from(oauthScopeDefinition)
        .orderBy(asc(oauthScopeDefinition.key));
    }

    return await db
      .select()
      .from(oauthScopeDefinition)
      .where(predicates.length === 1 ? predicates[0] : and(...predicates))
      .orderBy(asc(oauthScopeDefinition.key));
  } catch (error) {
    if (isMissingScopeTableError(error)) {
      console.warn(
        "OAuth scope registry table is not available yet. Falling back to built-in scopes only.",
      );
      return [];
    }

    throw error;
  }
};

export const listOAuthScopeDefinitions = async ({
  includeInactive = false,
  selfServiceOnly = false,
  keys,
}: {
  includeInactive?: boolean;
  selfServiceOnly?: boolean;
  keys?: string[];
} = {}): Promise<OAuthScopeDefinition[]> => {
  const uniqueKeys = keys
    ? Array.from(new Set(keys.map((value) => value.trim()).filter(Boolean)))
    : undefined;
  const rows = await queryStoredScopeRows({
    includeInactive,
    keys: uniqueKeys,
  });

  const merged = mergeScopeDefinitions(rows, uniqueKeys);
  return merged.filter(
    (scope) =>
      (includeInactive || scope.isActive) &&
      (!selfServiceOnly || scope.allowSelfService),
  );
};

export const getOAuthProviderScopeConfig = async () => {
  try {
    const definitions = await listOAuthScopeDefinitions();

    return {
      definitions,
      allScopeKeys: definitions.map((scope) => scope.key),
      selfServiceScopeKeys: definitions
        .filter((scope) => scope.allowSelfService)
        .map((scope) => scope.key),
    };
  } catch (error) {
    console.error(
      "Failed to load custom OAuth scopes at startup. Falling back to built-in scopes only.",
      error,
    );
    return {
      definitions: BUILTIN_OAUTH_SCOPE_DEFINITIONS,
      allScopeKeys: BUILTIN_OAUTH_SCOPE_DEFINITIONS.map((scope) => scope.key),
      selfServiceScopeKeys: BUILTIN_OAUTH_SCOPE_DEFINITIONS.filter(
        (scope) => scope.allowSelfService,
      ).map((scope) => scope.key),
    };
  }
};

const splitScopeString = (scope: string) =>
  scope
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

export const validateRequestedScopes = async (
  scope: string | undefined,
  options: {
    selfServiceOnly: boolean;
  },
) => {
  const normalizedScopes = scope
    ? Array.from(new Set(splitScopeString(scope)))
    : [];

  if (normalizedScopes.length === 0) {
    return {
      ok: false as const,
      error: "At least one scope is required.",
      normalizedScopes: [],
    };
  }

  const allowedScopeKeys = new Set(
    (
      await listOAuthScopeDefinitions({
        selfServiceOnly: options.selfServiceOnly,
      })
    ).map((definition) => definition.key),
  );

  const invalidScopes = normalizedScopes.filter(
    (value) => !allowedScopeKeys.has(value),
  );

  if (invalidScopes.length > 0) {
    return {
      ok: false as const,
      error: `Unsupported scopes requested: ${invalidScopes.join(", ")}.`,
      normalizedScopes: [],
    };
  }

  return {
    ok: true as const,
    error: null,
    normalizedScopes,
  };
};

const normalizeScopeLabel = (value: string) => value.trim();
const normalizeScopeDescription = (value: string) => value.trim();
const normalizeScopeKey = (value: string) => value.trim();

const validateScopePayload = ({
  key,
  label,
  description,
}: {
  key: string;
  label: string;
  description: string;
}) => {
  if (!key || !OAUTH_SCOPE_KEY_PATTERN.test(key)) {
    return "Scope keys may only contain letters, numbers, colon, period, underscore, and hyphen.";
  }

  if (BUILTIN_OAUTH_SCOPE_KEYS.includes(key)) {
    return `The scope "${key}" is reserved by the OAuth provider.`;
  }

  if (!label) {
    return "A human-readable label is required.";
  }

  if (!description) {
    return "A description is required.";
  }

  return null;
};

export const createCustomOAuthScope = async (input: {
  key: string;
  label: string;
  description: string;
  allowSelfService: boolean;
  isActive: boolean;
}) => {
  const key = normalizeScopeKey(input.key);
  const label = normalizeScopeLabel(input.label);
  const description = normalizeScopeDescription(input.description);
  const validationError = validateScopePayload({
    key,
    label,
    description,
  });

  if (validationError) {
    return {
      ok: false as const,
      error: validationError,
    };
  }

  const existing = await queryStoredScopeRows({
    includeInactive: true,
    keys: [key],
  });
  if (existing.some((scope) => scope.key === key)) {
    return {
      ok: false as const,
      error: `The scope "${key}" already exists.`,
    };
  }

  const [created] = await db
    .insert(oauthScopeDefinition)
    .values({
      key,
      label,
      description,
      isSystem: false,
      allowSelfService: input.allowSelfService,
      isActive: input.isActive,
    })
    .returning();

  return {
    ok: true as const,
    data: normalizeCustomScopeRow(created),
  };
};

export const updateCustomOAuthScope = async (
  key: string,
  updates: {
    label?: string;
    description?: string;
    allowSelfService?: boolean;
    isActive?: boolean;
  },
) => {
  const existingRows = await queryStoredScopeRows({
    includeInactive: true,
    keys: [key],
  });
  const existing = existingRows.find((scope) => scope.key === key);

  if (!existing) {
    return {
      ok: false as const,
      error: "Scope not found.",
    };
  }

  if (existing.isSystem) {
    return {
      ok: false as const,
      error: "Built-in scopes cannot be edited.",
    };
  }

  const nextLabel = updates.label !== undefined
    ? normalizeScopeLabel(updates.label)
    : existing.label;
  const nextDescription = updates.description !== undefined
    ? normalizeScopeDescription(updates.description)
    : existing.description;
  const validationError = validateScopePayload({
    key,
    label: nextLabel,
    description: nextDescription,
  });

  if (validationError) {
    return {
      ok: false as const,
      error: validationError,
    };
  }

  const [updated] = await db
    .update(oauthScopeDefinition)
    .set({
      ...(updates.label !== undefined ? { label: nextLabel } : {}),
      ...(updates.description !== undefined
        ? { description: nextDescription }
        : {}),
      ...(updates.allowSelfService !== undefined
        ? { allowSelfService: updates.allowSelfService }
        : {}),
      ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(oauthScopeDefinition.key, key))
    .returning();

  return {
    ok: true as const,
    data: normalizeCustomScopeRow(updated),
  };
};

export {
  BUILTIN_OAUTH_SCOPE_DEFINITIONS,
  BUILTIN_SELF_SERVICE_SCOPE_KEYS,
  BUILTIN_OAUTH_SCOPE_KEYS,
};
