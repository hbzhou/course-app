# Multi-Provider OAuth2 Design (Azure AD First)

Date: 2026-04-12
Status: Approved in brainstorming
Scope: Design only (no implementation in this document)

## 1. Goal

Extend the current OAuth2 integration so the application can support multiple identity providers through a provider-agnostic architecture, with Azure AD as the first new provider, while preserving:

- Spring Security server-side Authorization Code flow with session
- Existing legacy username/password login behavior
- Existing Keycloak compatibility during migration

## 2. Current Constraints and Context

The current implementation is tightly coupled to Keycloak in several areas:

- Security entrypoint uses a hardcoded Keycloak authorization path
- Keycloak-specific authority mapping and JWT conversion classes are primary auth mappers
- Login UI hardcodes the OAuth2 button target to Keycloak
- Claim handling assumes Keycloak claim semantics in key auth paths

The current architecture already prefers server-managed OAuth2 session flow, and this design keeps that direction.

## 3. Evaluated Approaches

### Approach A (Recommended): Provider Abstraction Layer in App

Create provider-agnostic auth contracts and adapters per provider.

- Introduce normalized claim and authority mapping interfaces
- Implement Azure AD adapter first
- Keep Keycloak adapter for backward compatibility

Why recommended:

- Scales cleanly to future providers (GitHub, Google, etc.)
- Reduces hardcoded provider assumptions
- Preserves current Spring session model

Trade-offs:

- Moderate refactor up front

### Approach B: Minimal Azure Add-On with Conditional Branching

Add Azure config and insert registrationId if/else checks in existing Keycloak-focused classes.

Pros:

- Fast initial delivery

Cons:

- Increases coupling and maintenance cost
- Makes later providers expensive and risky

### Approach C: External Broker-Only Strategy

Route all social providers through one external broker and keep app mostly unchanged.

Pros:

- Lowest app code change

Cons:

- Reduces direct control of provider behavior in app
- Does not satisfy long-term in-app provider extensibility goal

## 4. Architecture Design

### 4.1 New Auth Abstraction Components

1. OAuth2ProviderProfile
- Metadata per provider: provider id, preferred username claims, email claims, role/group claims, default scopes

2. OAuth2ClaimsNormalizer
- Converts raw provider claims into an internal normalized principal model

3. NormalizedOAuth2Principal
- Stable internal auth identity contract with:
  - provider
  - subject
  - username
  - email
  - groupsOrRoles
  - rawClaims

4. OAuth2AuthorityMapper
- Maps normalized roles/groups to application permissions
- Keeps provider claims separate from app authorization policy

5. OAuth2ProviderResolver
- Resolves provider from registrationId and configured defaults
- Removes hardcoded provider assumptions from entrypoints and auth paths

### 4.2 Provider Adapters

Phase 1 adapters:

- AzureAdClaimsAdapter (new)
- KeycloakClaimsAdapter (compatibility)

Future adapters:

- GitHubClaimsAdapter
- GoogleClaimsAdapter

## 5. Data Flow (Session-First Authorization Code)

1. User clicks provider login in UI
2. Browser goes to /oauth2/authorization/{providerId}
3. Spring Security performs Authorization Code exchange server-side
4. OIDC user service routes claims through provider adapter
5. Claims are normalized into NormalizedOAuth2Principal
6. Authorities are mapped to app permissions
7. Spring establishes authenticated server-side session
8. Frontend calls /api/auth/me and receives normalized user fields
9. Protected routes and WebSocket auth continue to use session principal first

## 6. Frontend Design

1. Login page shows provider-aware OAuth2 button label and target URL
- Default provider: Azure AD in phase 1

2. Provider selection is configuration-driven
- UI can remain single-button in phase 1 (no provider chooser required)

3. Existing legacy login form is unchanged

4. Return-path behavior from protected routes remains unchanged

## 7. Error Handling and Guardrails

### 7.1 Error Handling

- Unknown provider id returns controlled auth error response (not generic server crash)
- Missing optional claims (such as email) uses deterministic fallback claim order
- Callback failures redirect to login with stable reason codes for user-facing messages
- Mapping failures default to least privilege, never escalation

### 7.2 Security Guardrails

- Explicit allow-list for supported providers
- Strict issuer and redirect URI validation per provider
- Provider adapters do not assign business permissions directly
- Centralized permission mapping remains in app domain policy
- Audit logs include provider id, subject, normalized username, mapped authorities

## 8. Testing Strategy

### 8.1 Backend Unit Tests

- Azure and Keycloak claim normalization tests
- Provider resolver tests (default, explicit provider, unknown provider)
- Authority mapping tests (normalized roles/groups to app permissions)

### 8.2 Backend Integration Tests

- Security filter chain with configurable provider entrypoint
- OAuth2 session auth behavior on protected endpoints
- /api/auth/me returns expected normalized fields
- WebSocket session auth regression coverage

### 8.3 Frontend Tests

- Login renders provider-aware OAuth2 button label and URL
- Protected-route return path preserved across OAuth2 login start
- Legacy login behavior remains unchanged

## 9. Phase 1 Scope and Non-Goals

### In Scope

- Provider abstraction foundation
- Azure AD provider support (Authorization Code + server-side session)
- Keycloak compatibility adapter
- Configurable default provider behavior

### Out of Scope

- Multi-provider chooser UI
- Cross-provider account linking/merge
- SCIM or background group sync
- Full bearer-first SPA token architecture

## 10. Finalized Configuration Decisions

- /api/auth/me will return authType=session for server-side OAuth2 session users in phase 1
- Azure AD claim precedence for username: preferred_username -> upn -> email -> sub
- Azure AD claim precedence for email: email -> preferred_username -> upn -> unknown@example.com
- Azure AD group/role source precedence: roles -> groups -> empty
- Default provider will be configuration-driven via app.oauth2.default-provider with default value azure; profiles may override explicitly

## 11. Acceptance Criteria for Implementation Planning

1. Keycloak hardcoded logic is replaced by provider abstraction contracts
2. Azure AD login works via Spring server-side session Authorization Code flow
3. Existing legacy login still works unchanged
4. Existing Keycloak flow remains functional via compatibility adapter
5. /api/auth/me and protected routes work consistently for session auth
6. Regression tests for auth and WebSocket pass
