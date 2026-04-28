import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inviteAllowlistEntry, platformConfig } from "@/db/app-schema";

export const PLATFORM_CONFIG_ID = "default";

export type InviteAllowlistKind = "email" | "domain";

export interface InviteOnlySettings {
  enabled: boolean;
  emails: string[];
  domains: string[];
}

const uniqueValues = (values: string[]) => Array.from(new Set(values));

export const normalizeInviteEmail = (value: string) => value.trim().toLowerCase();

export const normalizeInviteDomain = (value: string) =>
  value.trim().toLowerCase().replace(/^@+/, "");

const parseInviteEntry = (kind: InviteAllowlistKind, value: string) =>
  kind === "email" ? normalizeInviteEmail(value) : normalizeInviteDomain(value);

export const getInviteOnlySettings = async (): Promise<InviteOnlySettings> => {
  const [configRow, entries] = await Promise.all([
    db.query.platformConfig.findFirst({
      where: eq(platformConfig.id, PLATFORM_CONFIG_ID),
    }),
    db.query.inviteAllowlistEntry.findMany({
      orderBy: [asc(inviteAllowlistEntry.kind), asc(inviteAllowlistEntry.value)],
    }),
  ]);

  return {
    enabled: configRow?.inviteOnlyEnabled ?? false,
    emails: entries
      .filter((entry) => entry.kind === "email")
      .map((entry) => entry.value),
    domains: entries
      .filter((entry) => entry.kind === "domain")
      .map((entry) => entry.value),
  };
};

export const validateInviteOnlyEmail = async (email: string) => {
  const normalizedEmail = normalizeInviteEmail(email);
  const domain = normalizeInviteDomain(normalizedEmail.split("@")[1] ?? "");
  const settings = await getInviteOnlySettings();

  if (!settings.enabled) {
    return { allowed: true as const, settings };
  }

  if (settings.emails.includes(normalizedEmail)) {
    return { allowed: true as const, settings };
  }

  if (domain && settings.domains.includes(domain)) {
    return { allowed: true as const, settings };
  }

  return {
    allowed: false as const,
    settings,
    message: "Sign up is currently unavailable for this email address.",
  };
};

export const replaceInviteOnlySettings = async (input: {
  enabled: boolean;
  emails: string[];
  domains: string[];
  actorUserId?: string | null;
}) => {
  const emails = uniqueValues(
    input.emails.map((value) => parseInviteEntry("email", value)).filter(Boolean),
  );
  const domains = uniqueValues(
    input.domains
      .map((value) => parseInviteEntry("domain", value))
      .filter(Boolean),
  );

  await db.transaction(async (tx) => {
    await tx
      .insert(platformConfig)
      .values({
        id: PLATFORM_CONFIG_ID,
        inviteOnlyEnabled: input.enabled,
      })
      .onConflictDoUpdate({
        target: platformConfig.id,
        set: {
          inviteOnlyEnabled: input.enabled,
          updatedAt: new Date(),
        },
      });

    await tx.delete(inviteAllowlistEntry);

    const nextEntries = [
      ...emails.map((value) => ({
        id: crypto.randomUUID(),
        kind: "email" as const,
        value,
        createdByUserId: input.actorUserId ?? null,
      })),
      ...domains.map((value) => ({
        id: crypto.randomUUID(),
        kind: "domain" as const,
        value,
        createdByUserId: input.actorUserId ?? null,
      })),
    ];

    if (nextEntries.length > 0) {
      await tx.insert(inviteAllowlistEntry).values(nextEntries);
    }
  });
};

export const isInviteOnlyEnabled = async () => {
  const config = await db.query.platformConfig.findFirst({
    where: eq(platformConfig.id, PLATFORM_CONFIG_ID),
  });

  return config?.inviteOnlyEnabled ?? false;
};

export const isUserClientCreationAllowed = async () => {
  try {
    const config = await db.query.platformConfig.findFirst({
      where: eq(platformConfig.id, PLATFORM_CONFIG_ID),
    });
    return config?.allowUserClientCreation ?? true;
  } catch (err) {
    console.warn("Failed to read platform config, defaulting to true.", err);
    return true;
  }
};

export const isDynamicClientRegistrationEnabled = async () => {
  try {
    const config = await db.query.platformConfig.findFirst({
      where: eq(platformConfig.id, PLATFORM_CONFIG_ID),
    });
    if (typeof config?.allowDynamicClientRegistration === "boolean") {
      return config.allowDynamicClientRegistration;
    }
  } catch (err) {
    console.warn(
      "Failed to read platform config for dynamic registration toggle.",
      err,
    );
  }

  return process.env.OAUTH_ALLOW_DYNAMIC_CLIENT_REGISTRATION === "true";
};

export const isEmailPasswordAuthEnabled = async () => {
  try {
    const config = await db.query.platformConfig.findFirst({
      where: eq(platformConfig.id, PLATFORM_CONFIG_ID),
    });
    return config?.emailPasswordAuthEnabled ?? true;
  } catch (err) {
    console.warn(
      "Failed to read platform config for email/password auth toggle.",
      err,
    );
    return true;
  }
};

const parseAudienceList = (values: string[] | null | undefined) =>
  Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

const parseEnvAudiences = () =>
  parseAudienceList(process.env.OAUTH_VALID_AUDIENCES?.split(","));

export const getOAuthValidAudiences = async () => {
  try {
    const config = await db.query.platformConfig.findFirst({
      where: eq(platformConfig.id, PLATFORM_CONFIG_ID),
    });

    const configured = parseAudienceList(config?.oauthValidAudiences);
    if (configured.length > 0) {
      return configured;
    }
  } catch (err) {
    console.warn(
      "Failed to read platform config for OAuth valid audiences.",
      err,
    );
  }

  return parseEnvAudiences();
};
