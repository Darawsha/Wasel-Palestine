# Wiki Index and Copy Plan

This file explains how to transfer the generated wiki draft files into GitHub Wiki pages.

The files in this folder are temporary preparation files. They are intended to be reviewed in the repository, then manually copied into GitHub Wiki pages.

## Recommended GitHub Wiki Page Order

1. Home
2. Project Overview
3. Architecture
4. Setup and Run
5. Auth and Roles
6. Backend Modules
7. Frontend Structure
8. Database and Entities
9. API Overview
10. Reports and Moderation
11. Alerts System
12. Route Planner
13. Settings and Localization
14. Known Issues

## File to Wiki Page Mapping

| Local file | Suggested GitHub Wiki page title |
| --- | --- |
| `docs/WIKI_HOME.md` | `Home` |
| `docs/WIKI_PROJECT_OVERVIEW.md` | `Project Overview` |
| `docs/WIKI_ARCHITECTURE.md` | `Architecture` |
| `docs/WIKI_BACKEND_MODULES.md` | `Backend Modules` |
| `docs/WIKI_FRONTEND_STRUCTURE.md` | `Frontend Structure` |
| `docs/WIKI_DATABASE_AND_ENTITIES.md` | `Database and Entities` |
| `docs/WIKI_AUTH_AND_ROLES.md` | `Auth and Roles` |
| `docs/WIKI_API_OVERVIEW.md` | `API Overview` |
| `docs/WIKI_ALERTS_SYSTEM.md` | `Alerts System` |
| `docs/WIKI_ROUTE_PLANNER.md` | `Route Planner` |
| `docs/WIKI_REPORTS_AND_MODERATION.md` | `Reports and Moderation` |
| `docs/WIKI_SETTINGS_AND_LOCALIZATION.md` | `Settings and Localization` |
| `docs/WIKI_SETUP_AND_RUN.md` | `Setup and Run` |
| `docs/WIKI_KNOWN_ISSUES.md` | `Known Issues` |

## README Draft

The full README draft is:

```text
docs/README_FULL.md
```

Suggested use:

- Review it locally.
- Replace the root `README.md` later only after approval.
- Do not overwrite the root README automatically.

## Internal Link Suggestions

GitHub Wiki supports wiki-style links. The generated pages already use link names like:

```text
[[Project Overview]]
[[Architecture]]
[[Backend Modules]]
[[Frontend Structure]]
[[Database and Entities]]
[[Auth and Roles]]
[[API Overview]]
[[Reports and Moderation]]
[[Alerts System]]
[[Route Planner]]
[[Settings and Localization]]
[[Setup and Run]]
[[Known Issues]]
```

When copying to GitHub Wiki, use page titles exactly as listed in the mapping table so the links resolve cleanly.

## Suggested Sidebar

If using a GitHub Wiki sidebar, a simple `_Sidebar.md` could contain:

```markdown
## Wasel Palestine Wiki

- [[Home]]
- [[Project Overview]]
- [[Architecture]]
- [[Setup and Run]]
- [[Auth and Roles]]
- [[Backend Modules]]
- [[Frontend Structure]]
- [[Database and Entities]]
- [[API Overview]]
- [[Reports and Moderation]]
- [[Alerts System]]
- [[Route Planner]]
- [[Settings and Localization]]
- [[Known Issues]]
```

No `_Sidebar.md` file was generated because it was not part of the required file list.

## Review Checklist

Before copying to GitHub Wiki:

- Confirm environment variable names are complete.
- Start the app and compare `/api/docs` with `WIKI_API_OVERVIEW.md`.
- Decide whether known issues should remain public-facing or be moved to internal notes.
- Review configuration/security notes around frontend `.env` access.
- Decide whether to replace root `README.md` with `README_FULL.md`.
- Verify route planner behavior with real provider keys.
- Verify alert generation with real incident data.

