# Authentication and Roles

The backend supports JWT authentication with email/password signin and signup, plus Google and LinkedIn social login flows.

## Roles

The codebase defines two user roles:

```text
admin
citizen
```

Role behavior:

- Admin users access the admin dashboard and management APIs.
- Citizen users access citizen-facing flows such as reports, alerts, profile, route planner, and map data.

## Email and Password Signup

Endpoint:

```text
POST /api/v1/auth/signup
```

Backend behavior:

- Accepts signup DTO data.
- Creates a user through the users service.
- Hashes the password with bcrypt.
- Defaults normal users to the citizen role.
- Returns an authentication response with JWT data.

Frontend behavior:

- Public signup form is under `Frontend/features/public/auth`.
- The frontend appears to show success and ask the user to sign in after signup instead of auto-storing the token returned by the backend.

## Email and Password Signin

Endpoint:

```text
POST /api/v1/auth/signin
```

Backend behavior:

- Looks up user by email.
- Compares password with bcrypt.
- Returns JWT and user data.

JWT payload:

```text
sub
email
role
```

## JWT Strategy

File:

```text
Backend/src/modules/auth/strategies/jwt.strategy.ts
```

Behavior:

- Extracts bearer token from the Authorization header.
- Validates the token with `JWT_SECRET`.
- Returns request user data containing user id, email, and role.

## Profile Endpoints

Endpoints:

```text
GET   /api/v1/auth/profile
PATCH /api/v1/auth/profile
```

Profile update supports:

- First name and last name.
- Phone.
- Address.
- Language.
- Profile image.
- Password change.

Important behavior:

- Password change requires current password for password-based accounts.
- Social-only accounts cannot change password unless they have an existing password hash.

## Google Login

Endpoint:

```text
POST /api/v1/auth/google
```

Backend behavior:

- Accepts a Google access token.
- Calls Google userinfo.
- Resolves or creates a local social user.
- Returns a JWT auth response.

Frontend behavior:

- Public auth files contain Google login handlers.
- Google client ID configuration is handled in frontend auth code.

## LinkedIn Login

Endpoints:

```text
GET  /api/v1/auth/linkedin
GET  /api/v1/auth/linkedin/callback
POST /api/v1/auth/linkedin
```

Backend behavior:

- Redirect endpoint builds LinkedIn authorization URL.
- Callback endpoint redirects to a frontend callback page with `code` and `state`.
- POST endpoint exchanges LinkedIn authorization data and resolves/creates a local user.
- LinkedIn state is protected through a signed short-lived JWT.

Frontend behavior:

- LinkedIn callback handling is implemented in `Frontend/features/public/auth/linkedinCallbackHandler.js`.

## Guards and Decorators

Authorization uses:

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles(...)`

Admin controllers or endpoints generally combine JWT guard and role guard.

Example behavior:

- Admin-only user management endpoints require admin role.
- Admin-only incident/checkpoint mutation endpoints require admin role.
- Citizen and admin access may be allowed for current-user/profile-style endpoints.

## Global Auth Middleware

The application applies a custom global auth middleware to all routes from `AppModule`.

The middleware allows selected public routes, including:

- `/auth/signin`
- `/auth/signup`
- `/auth/google`
- `/auth/linkedin`
- `/auth/linkedin/callback`
- `/map/incidents`
- `/map/checkpoints`
- `/map/reports`
- `/routes/estimate`
- `/weather/current`

Important note:

- The codebase uses both middleware-level auth checks and Nest guards. This overlap should be tested carefully, especially around static frontend files, Swagger, and public API routes.

## Admin Permissions

Admin users can access:

- User management.
- Incident management.
- Checkpoint management.
- Report moderation.
- Audit logs.
- System settings.
- Admin dashboard metrics.
- Performance reports and API monitor UI.

## Citizen Permissions

Citizen users can access:

- Current profile.
- Citizen shell.
- Incidents list.
- Route planner.
- Own reports.
- Community reports.
- Report voting and confirmation.
- Alert preferences and inbox.

## Public Access

Public or unauthenticated access exists for:

- Signin/signup/social auth.
- Public map feeds.
- Route estimation.
- Current weather.

Needs verification:

- Because static frontend serving and custom middleware both apply globally, static page behavior should be tested in a clean unauthenticated browser session.

