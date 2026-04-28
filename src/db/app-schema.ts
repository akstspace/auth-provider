import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const oauthScopeDefinition = pgTable(
  "oauth_scope_definition",
  {
    key: text("scope_key").primaryKey(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    allowSelfService: boolean("allow_self_service").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("oauth_scope_definition_is_active_idx").on(table.isActive),
    index("oauth_scope_definition_allow_self_service_idx").on(
      table.allowSelfService,
    ),
  ],
);

export const platformConfig = pgTable("platform_config", {
  id: text("id").primaryKey(),
  inviteOnlyEnabled: boolean("invite_only_enabled").default(false).notNull(),
  allowUserClientCreation: boolean("allow_user_client_creation").default(true).notNull(),
  oauthValidAudiences: text("oauth_valid_audiences").array(),
  emailPasswordAuthEnabled: boolean("email_password_auth_enabled")
    .default(true)
    .notNull(),
  allowDynamicClientRegistration: boolean("allow_dynamic_client_registration")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const inviteAllowlistEntry = pgTable(
  "invite_allowlist_entry",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    value: text("value").notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("invite_allowlist_entry_kind_idx").on(table.kind),
    uniqueIndex("invite_allowlist_entry_kind_value_uidx").on(
      table.kind,
      table.value,
    ),
  ],
);
