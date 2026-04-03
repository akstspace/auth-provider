import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

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
