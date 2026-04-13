# SpringBootTest Security Exclusion Design

## Summary

Keep `@SpringBootTest` in `CourseAppTests` to preserve full application context verification while excluding Spring Security and Keycloak-driven configuration for this specific test scenario.

This design targets one narrow outcome:
- `CourseAppTests` remains a context-load test.
- Security-heavy wiring is removed from this test context.
- Security integration tests continue to run separately with full dependencies.

## Scope

In scope:
- Add test-only context customization for the app-level context-load test.
- Avoid external dependency requirements (Keycloak, Redis, MySQL) for this single test path.

Out of scope:
- Refactoring all test classes.
- Changing security integration test behavior.
- Reworking CI job split between unit and integration tests.

## Current State

- `CourseAppTests` currently uses `@SpringBootTest` and inherits full production security configuration.
- Full security wiring depends on OAuth2/Keycloak settings and related beans.
- In CI, this introduces environment coupling for tests that should only validate context bootstrap.

## Chosen Approach

Use a test-local security exclusion with `@SpringBootTest` unchanged.

Implementation intent:
- Keep `CourseAppTests` annotation as `@SpringBootTest`.
- Add test-time configuration that excludes Spring Security auto-configuration for this test context.
- Prefer a test profile or test-only properties bound to the test classpath to avoid impacting runtime configuration.

## Design Details

### 1) Test Class Behavior

`CourseAppTests` remains the same in purpose and structure:
- It checks `contextLoads()`.
- It does not assert authentication/authorization behavior.

### 2) Security Exclusion Mechanism

Apply one of the following test-only mechanisms (final pick during implementation planning):

Option A (preferred):
- Exclude security auto-configuration in test properties for this test context.
- Keep change isolated to tests and avoid mock bean drift.

Option B:
- Use test configuration with `@MockBean`/`@MockitoBean` for security chain dependencies.
- Use only if auto-config exclusion has side effects.

Recommendation rationale:
- Exclusion is lower maintenance than mocking many evolving security beans.
- It keeps the test focused on app bootstrap, not auth pipeline internals.

### 3) Interaction with Other Tests

- Security tests under config/auth packages keep full security setup.
- No behavior change expected for `SecurityConfigSessionAuthTest`, `AuthControllerSessionTest`, and `KeycloakOidcUserServiceTest`.

## Data Flow and Dependencies

For `CourseAppTests` after change:
- Spring bootstraps core application context.
- Security auto-configuration is skipped.
- No Keycloak JWT/OAuth2 bean chain is initialized for this test path.

For dedicated security tests:
- Existing full chain remains active.
- CI dependency-backed execution remains unchanged.

## Error Handling and Risks

Risks:
- Over-broad exclusion could hide non-security bean wiring issues.
- Global test property application might affect unrelated tests.

Mitigations:
- Scope exclusion to the minimal test surface.
- Verify dedicated security tests still run in the integration environment.
- Keep production `application.properties` unchanged.

## Verification Strategy

Minimum verification:
- `CourseAppTests` passes without requiring security env dependencies.
- Security-focused test classes continue to validate auth flows separately.
- No regression in API test reports in CI.

## Acceptance Criteria

- `CourseAppTests` still uses `@SpringBootTest`.
- `CourseAppTests` no longer requires Keycloak/security context initialization.
- Security integration tests remain intact and continue to verify auth behavior.
- Changes are test-only and do not alter runtime security behavior.
