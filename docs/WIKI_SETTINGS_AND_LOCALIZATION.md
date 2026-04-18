# Settings and Localization

This page documents platform settings and language behavior in the current codebase.

## Backend System Settings

Backend location:

```text
Backend/src/modules/system-settings
```

Main files:

- `system-settings.controller.ts`
- `system-settings.service.ts`
- `system-settings.module.ts`
- `entities/system-settings.entity.ts`
- `dto/update-system-settings.dto.ts`
- `dto/system-settings-response.dto.ts`
- `enums/primary-language.enum.ts`

## System Settings Entity

Table:

```text
system_settings
```

Fields:

- `id`
- `platformName`
- `primaryLanguage`
- `createdAt`
- `updatedAt`

The service treats system settings as a singleton row. If no row exists, it creates the default settings lazily.

## System Settings API

```text
GET   /api/v1/system-settings
PATCH /api/v1/system-settings
```

Access:

- Admin only.

Update DTO behavior:

- `platformName` is required.
- `primaryLanguage` is required.

Primary language enum:

```text
English
Arabic
```

## Frontend System Settings

Frontend location:

```text
Frontend/features/admin/system-settings
Frontend/Services/system-settings.service.js
Frontend/views/admin/header/admin-settings-runtime.js
```

Admin settings UI supports platform-level display/runtime settings such as:

- Platform name.
- Primary language.
- API base URL display/override behavior.
- External API-related configuration display.

Runtime settings can affect:

- `window.AppConfig.API_BASE_URL`
- Admin header translation behavior.
- Local persisted settings.

## User Language Preference

User language is stored on the `User` entity through the `language` field.

Profile files that use language:

```text
Frontend/Services/profile.service.js
Frontend/features/citizen/profile/Profile.js
Frontend/Services/session.service.js
Frontend/core/i18n/user-language.js
```

The session service also persists language in localStorage under:

```text
wasel.user.language
```

## Citizen Localization

File:

```text
Frontend/core/i18n/user-language.js
```

Behavior:

- Reads language from user profile or localStorage.
- Applies text translation using a manual dictionary.
- Observes DOM changes and translates new text nodes/attributes.
- Updates document language.
- Keeps citizen pages in LTR layout, even for Arabic text.

Important comment found in code:

```text
Citizen pages keep their existing LTR layout; language changes text only.
```

## Admin Localization

File:

```text
Frontend/views/admin/header/admin-settings-runtime.js
```

Behavior:

- Applies admin runtime settings.
- Contains translation mappings for admin UI labels.
- Watches route/page content and applies translated labels.

## Configuration Concern

`Frontend/Services/system-settings.service.js` attempts to fetch:

```text
/.env
```

It also contains a hardcoded weather fallback key.

This should be reviewed before production because frontend-accessible environment files or hardcoded API keys can expose secrets. Even if the current static root limits which `.env` is returned, the pattern is risky.

## Current Limitations

- Localization is manual, not framework-based.
- Arabic appears to translate text but does not switch the layout direction to RTL for citizen pages.
- Admin and citizen translation systems are separate.
- System settings store a primary language but not a full locale configuration.
- Runtime API base URL override is stored in localStorage, which may make environments harder to reason about if stale values remain.

