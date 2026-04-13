---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## Priority of rules

- If the repo contains a local design system such as `DESIGN.md`, treat it as the primary authority for branding, color, typography, spacing, component styling, and design language.
- Use the external Web Interface Guidelines as secondary review criteria for generic UX, accessibility, and interaction quality.
- When the two differ, prefer the local repo design system for visual language and note the distinction.
- If `DESIGN.md` defines named themes or theme semantics, those local theme rules take priority over generic dark-mode assumptions.
- When reviewing theme UI, verify that `Light`, `Dark`, `Chai`, and `System` remain distinct where `DESIGN.md` requires them, and that `System` dark resolves to `Dark`, not `Chai`.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
