---
name: better-auth-llms
description: Implement Better Auth flows from official LLM/docs guidance with CLI-first schema updates, organization+teams, invitation redirects, and permission-aware UI.
---

# Better Auth LLM Skill

Primary references:
- https://better-auth.com/llms.txt
- https://better-auth.com/docs/plugins/organization
- https://better-auth.com/docs/concepts/oauth

## Non-Negotiables

1. Use Better Auth APIs/plugins, not custom auth logic.
2. Use Better Auth CLI for auth schema/table changes before manual edits.
3. Preserve invitation callback context across login/signup/OAuth.
4. Use Better Auth permissions/roles to gate org management UI.
5. Prefer active org/team context (avoid forcing orgId in routes).
6. Surface Better Auth error messages/codes in UI handling.

## CLI-first Workflow

Run these first for auth schema/plugin changes:

```bash
npx @better-auth/cli generate --config src/lib/auth.ts --output src/db/schema.ts
npx @better-auth/cli migrate --config src/lib/auth.ts
```

## Organization + Teams Checklist

- Enable server plugin:
  - `organization({ teams: { enabled: true } })`
- Enable client plugin:
  - `organizationClient({ teams: { enabled: true } })`
- Integrate team endpoints where relevant:
  - `createTeam`, `listTeams`, `updateTeam`, `removeTeam`
  - `addTeamMember`, `removeTeamMember`
  - invitation `teamId` assignment
- Hide org-management surfaces for non-manager roles (`member`).

## Redirect & Invitation Checklist

- Logged-in user on `/login` or `/signup` should redirect immediately.
- Preserve `callbackUrl` and `invitationId` across auth entrypoints.
- For invitation acceptance, send unauthenticated users to auth with callback back to the invitation route.
- Verify-email page should not show logged-in-only controls when logged out.
