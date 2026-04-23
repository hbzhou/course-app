# Multi-Provider Login UI (Phase 2)

Date: 2026-04-21
Status: Approved in brainstorming
Scope: Design only (no implementation in this document)
Builds on: 2026-04-12-multi-provider-oauth2-design.md (Phase 1)

## 1. Goal

Enable users to choose between Azure AD and Keycloak on the login page, with the provider list served dynamically from the backend. The backend provider abstraction layer built in Phase 1 already supports both providers — this phase surfaces that capability in the UI.

## 2. Current State

- Backend: Both `AzureAdClaimsAdapter` and `KeycloakClaimsAdapter` are registered. Spring Security OAuth2 client registrations exist for both providers. `ProviderAwareOidcUserService` routes by `registrationId`.
- Frontend: Login page shows a single OAuth2 button targeting the default provider (`azure`) via a static config file (`ui/src/config/oauth2.ts`). Provider selection is driven by `VITE_OAUTH2_DEFAULT_PROVIDER` env var.
- Security entry point: `SecurityConfig.exceptionHandling` auto-redirects unauthenticated page requests to `/oauth2/authorization/azure`.

## 3. Architecture Changes

### 3.1 Backend — Providers API Endpoint

New public endpoint in `AuthController`:

`GET /api/auth/providers`

Returns:
```json
[
  { "providerId": "azure", "displayName": "Azure AD" },
  { "providerId": "keycloak", "displayName": "Keycloak" }
]
```

Reads from the existing `OAuth2ProviderProperties.providers` list. Only `providerId` and `displayName` are exposed — no internal claim configuration is returned.

Add `/api/auth/providers` to the `permitAll()` list in `SecurityConfig`.

### 3.2 Backend — Security Entry Point Change

Replace `LoginUrlAuthenticationEntryPoint("/oauth2/authorization/${oauth2ProviderResolver.defaultProfile().providerId}")` with `LoginUrlAuthenticationEntryPoint("/login")`.

Remove the `RequestMatcher` that currently only matches `/courses` — all unauthenticated page navigations should redirect to `/login`.

API requests (`/api/**`) continue to return `401 Unauthorized` as before.

### 3.3 Frontend — Multi-Provider Login Page

On mount, `Login.tsx` fetches `GET /api/auth/providers` via a new `useProviders()` hook. It renders one equally-styled outline button per provider in the "Or continue with" section, replacing the current single hardcoded button.

Each button calls `handleOAuth2Login(providerId)` which:
1. Saves the return path to `sessionStorage` (same as today)
2. Navigates to `/oauth2/authorization/{providerId}`

Layout: Buttons stacked vertically, same `variant="outline"` style, same width.

Loading state: Spinner or skeleton while providers load.
Error/empty state: Hide OAuth2 section, show only legacy login form.

### 3.4 Frontend — New Pieces

- Type: `OAuth2Provider` in `ui/src/types/` — `{ providerId: string; displayName: string }`
- API function: `getProviders()` in `ui/src/api/authApi.ts`
- Hook: `useProviders()` in `ui/src/hooks/useAuth.ts` — `useQuery` wrapping `getProviders()`

### 3.5 Frontend — Removals

- Delete `ui/src/config/oauth2.ts`
- Remove `VITE_OAUTH2_DEFAULT_PROVIDER` env var references
- Remove `defaultOAuth2AuthorizationPath` and `defaultOAuth2ProviderLabel` imports from `Login.tsx`

### 3.6 Unchanged

- Legacy username/password login form
- Registration page
- `AuthContext` session refresh logic (already provider-agnostic via `/api/auth/me`)
- All backend adapter, normalizer, and authority mapping code

## 4. Data Flow

1. User navigates to a protected route (e.g., `/courses`) while unauthenticated
2. `ProtectedRoute` redirects to `/login` with `location.state.from`
3. Login page mounts, fetches `GET /api/auth/providers`
4. User sees legacy login form + Azure AD button + Keycloak button
5. User clicks a provider button
6. Browser navigates to `/oauth2/authorization/{providerId}`
7. Spring Security performs Authorization Code flow with chosen provider
8. On success, redirects to `app.oauth2.success-url`
9. `AuthContext.refreshSession()` calls `/api/auth/me`, establishes session

## 5. Error Handling

- Provider fetch failure: Hide OAuth2 buttons, show only legacy login (graceful degradation)
- Empty provider list from API: Same as fetch failure — only legacy login visible
- OAuth2 callback failure: Existing behavior — redirect to login with error

## 6. Testing Strategy

### 6.1 Backend Tests

- `AuthController` test: `GET /api/auth/providers` returns correct provider list from config
- `SecurityConfig` test: `/api/auth/providers` is publicly accessible without authentication
- `SecurityConfig` test: Unauthenticated page navigation redirects to `/login` instead of `/oauth2/authorization/azure`
- All existing auth tests pass unchanged

### 6.2 Frontend Tests

- `Login.test.tsx`:
  - Mock `getProviders()` returning both Azure AD and Keycloak
  - Two OAuth2 buttons render with correct labels ("Continue with Azure AD", "Continue with Keycloak")
  - Clicking each button navigates to correct `/oauth2/authorization/{providerId}` path
  - Return path saved to `sessionStorage` for each provider
  - Loading state while providers fetch
  - Graceful fallback when fetch fails (only legacy form visible)
  - Legacy login tests remain unchanged
- `useProviders` hook test: `useQuery` calls `getProviders()` and returns data correctly

### 6.3 Unchanged Tests

- Claims adapter tests
- Auth context tests
- Protected route tests
- WebSocket tests

## 7. Scope

### In Scope

- `GET /api/auth/providers` endpoint
- Security entry point redirect to `/login`
- Multi-provider button rendering on Login page
- `useProviders` hook + `getProviders()` API function + `OAuth2Provider` type
- Remove `ui/src/config/oauth2.ts` and `VITE_OAUTH2_DEFAULT_PROVIDER` references
- Tests for all new and changed code

### Out of Scope

- Cross-provider account linking/merge
- Provider-specific button icons/branding
- SCIM or background group sync
- Changes to any existing backend adapter or normalizer code

## 8. Acceptance Criteria

1. Login page shows both Azure AD and Keycloak buttons with equal prominence
2. Provider list is fetched from `GET /api/auth/providers` (not hardcoded in frontend)
3. Clicking either button initiates the correct OAuth2 authorization code flow
4. Unauthenticated page navigations redirect to `/login` (not directly to a provider)
5. Legacy username/password login still works unchanged
6. Provider fetch failure degrades gracefully to legacy-only login
7. All existing auth and WebSocket tests pass
8. New tests cover providers endpoint, login page rendering, and entry point redirect
