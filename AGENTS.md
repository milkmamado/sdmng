# Project rules

- Use the shared comparison helpers in `src/lib/crmSync.ts` for CRM/Excel versus site patient names; keep name storage separate so matching never rewrites names.
- Keep CRM matching regression tests beside the shared helper and run them with Bun's built-in test runner, because this project has no separate test framework.