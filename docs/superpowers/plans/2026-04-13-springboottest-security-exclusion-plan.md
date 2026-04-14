# Implementation Plan: SpringBootTest Security Exclusion

**Date:** 2026-04-13  
**Design Spec:** [2026-04-13-springboottest-security-exclusion-design.md](../specs/2026-04-13-springboottest-security-exclusion-design.md)  
**Approved Approach:** Option A — Exclude Spring Security auto-configuration via test properties  
**Target Test:** `CourseAppTests` (api/src/test/kotlin/com/itsz/app/CousrseApplicationTests.kt)

---

## Overview

This plan breaks down the design into 4 concrete tasks to:
1. Create test-only configuration to exclude Spring Security auto-configuration
2. Verify CourseAppTests runs without external dependencies
3. Validate security tests remain intact
4. Document and measure success

All changes are test-scoped and do not alter production behavior.

---

## Task List

### Task 1: Create Test-Only Application Properties

**Objective:** Provide test-specific configuration that disables Spring Security bean initialization.

**Description:**
- Create `api/src/test/resources/application.properties` (or update if it exists)
- Add properties to exclude Spring Security auto-configuration
- Add empty/disabled OAuth2 and Keycloak settings to prevent bean wiring

**Files to Create/Modify:**
- `api/src/test/resources/application.properties` — Create if missing; add properties

**Specific Changes:**
Add the following properties to the test application.properties:
```properties
# Disable Spring Security auto-configuration for context-load tests
spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration,\
  org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration,\
  org.springframework.boot.autoconfigure.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration

# Disable OAuth2/Keycloak configuration to prevent bean chain initialization
spring.security.oauth2.resourceserver.jwt.issuer-uri=
spring.security.oauth2.client.provider.keycloak.issuer-uri=
spring.security.oauth2.client.registration.course-app.client-id=
spring.security.oauth2.client.registration.course-app.client-secret=
spring.security.oauth2.client.registration.course-app.redirect-uri=

# Disable Keycloak-specific properties
keycloak.realm=
keycloak.auth-server-url=

# Ensure Redis is not required for context initialization
spring.redis.host=localhost
spring.redis.port=6379
```

**Acceptance Criteria:**
- [ ] File `api/src/test/resources/application.properties` exists
- [ ] All required exclusion properties are present
- [ ] Properties are syntactically valid (no trailing commas or malformed entries)
- [ ] Comments explain the purpose of each property section

**Dependencies:**
- None — this is a foundational task

**How to Verify:**
- Run: `./gradlew api:test --tests com.itsz.app.CousrseApplicationTests`
- Verify test passes without requiring external services
- Check console output for Spring auto-configuration messages

---

### Task 2: Verify CourseAppTests Loads Without External Dependencies

**Objective:** Confirm that CourseAppTests runs successfully without Keycloak, Redis, or MySQL.

**Description:**
- Execute CourseAppTests in isolation
- Verify test passes (contextLoads() succeeds)
- Confirm no external service dependencies are required
- Check build logs for security bean initialization messages

**Files to Modify:**
- None (verification only for this task)

**Acceptance Criteria:**
- [ ] CourseAppTests::contextLoads() test passes
- [ ] No error messages about missing Redis or Keycloak configuration
- [ ] No startup messages indicating security bean chain initialization
- [ ] Test execution time is minimal (< 10 seconds, typically 3-5 seconds)

**Dependencies:**
- Task 1 must be completed first

**How to Verify:**
```bash
# Run the specific test
./gradlew api:test --tests com.itsz.app.CousrseApplicationTests --no-daemon

# Expected output: BUILD SUCCESSFUL with 1 passed test
# Log should show Spring Security exclusion in auto-configuration report

# Alternative: Run with verbose Spring output
./gradlew api:test --tests com.itsz.app.CousrseApplicationTests \
  --args='--info' --no-daemon 2>&1 | grep -i "security\|keycloak"
```

**Success Metrics:**
- Test passes consistently (5+ consecutive runs)
- Execution time < 10 seconds per run
- No timeout errors or external connectivity issues

---

### Task 3: Validate Security Integration Tests Are Unaffected

**Objective:** Ensure that security-focused test classes continue to run with full security setup.

**Description:**
- Run security integration test classes:
  - `com.itsz.app.config.SecurityConfigSessionAuthTest`
  - `com.itsz.app.auth.AuthControllerSessionTest` (if exists)
  - Any Keycloak-related tests (KeycloakOidcUserServiceTest, etc.)
- Verify these tests still require and successfully initialize full security context
- Confirm no regression in existing security test behavior

**Files to Modify:**
- None (verification only for this task)

**Acceptance Criteria:**
- [ ] SecurityConfigSessionAuthTest passes (requires MySQL & Redis)
- [ ] All other auth-related tests pass
- [ ] No unexpected test failures in security package
- [ ] Security bean initialization messages appear in logs (confirming setup)

**Dependencies:**
- Task 1 and Task 2 should be completed before this task
- Docker services (MySQL, Redis, Keycloak if testing OAuth2) should be running

**How to Verify:**
```bash
# Run security config tests (requires Docker services)
docker compose up -d

./gradlew api:test --tests 'com.itsz.app.config.*Auth*' --no-daemon

# Expected output: All tests in config/auth packages PASS
# Verify Spring Security beans are initialized in logs

# Check for security-related bean messages:
./gradlew api:test --tests 'com.itsz.app.config.*' --no-daemon 2>&1 | grep -i "Bean\|Security"
```

**Success Metrics:**
- All security tests pass with Docker services running
- No test behavior regression
- Security bean initialization confirmed in logs

---

### Task 4: Full Test Suite Verification and Documentation

**Objective:** Run complete test suite to ensure no unintended side effects; document results.

**Description:**
- Execute full `api:test` task
- Verify all tests pass (existing and new security exclusion)
- Check test report coverage
- Update repository memory with implementation notes

**Files to Modify:**
- `/memories/repo/backend-test-harness.md` — Add notes on test configuration

**Acceptance Criteria:**
- [ ] Full `./gradlew api:test` passes without failures
- [ ] Test report shows no regressions from baseline
- [ ] CourseAppTests execution time is significantly reduced (was ~30-60s with full context, now ~3-5s)
- [ ] Security tests still execute with full context (when Docker services are available)
- [ ] Implementation notes added to repository memory

**Dependencies:**
- Tasks 1, 2, and 3 must be completed first

**How to Verify:**
```bash
# Run full API test suite
./gradlew api:test --no-daemon

# Check test report
open api/build/reports/tests/test/index.html

# Look for test execution summary:
# - CourseAppTests should be very fast
# - Security tests should be slower (full context)
# - No test failures

# Verify test counts match expectations
./gradlew api:test --no-daemon 2>&1 | tail -20
```

**Success Metrics:**
- All tests pass (100% pass rate)
- CourseAppTests is 5-10x faster than before
- Test report shows breakdown of fast context-load vs. full-context tests
- No console warnings about missing security configuration

---

## Implementation Dependencies

```
Task 1 (Create properties)
    ↓
Task 2 (Verify CourseAppTests) ← depends on Task 1
    ↓
Task 3 (Validate security tests) ← depends on Task 1 & 2
    ↓
Task 4 (Full suite verification) ← depends on Task 1, 2 & 3
```

All tasks are sequential. Task 2 cannot proceed without Task 1; Task 3/4 validate that earlier changes don't cause regressions.

---

## Verification and Success Metrics

### Primary Success Criteria
1. ✅ CourseAppTests passes without Keycloak/Redis/MySQL
2. ✅ CourseAppTests is the context-load test (marked as fast/unit test)
3. ✅ Security tests remain intact with full setup
4. ✅ No production code changes (test-only configuration)
5. ✅ Full test suite passes with no regressions

### Execution Timeline
- Task 1: ~5 minutes (file creation)
- Task 2: ~2 minutes (test execution + verification)
- Task 3: ~5 minutes (test execution with Docker services)
- Task 4: ~3 minutes (full suite + documentation)

**Total estimated effort:** ~15 minutes

### Risk Mitigation
| Risk | Mitigation |
|------|-----------|
| Test auto-config exclusion too broad | Verify other tests still pass; use minimal exclusion properties |
| Test properties globally affect other tests | Scope properties to test classpath only; verify in Task 3 & 4 |
| Security tests fail unexpectedly | Run security tests before/after to detect regressions |
| CourseAppTests still slow | Check for other beans not excluded; expand exclusion list if needed |

---

## Rollback Plan

If verification fails:
1. Delete `api/src/test/resources/application.properties` (or revert changes)
2. Run full test suite again to restore baseline
3. Re-examine design specification for alternative approaches
4. Document findings and blockers

**Rollback command:**
```bash
git checkout api/src/test/resources/application.properties
./gradlew api:test --no-daemon
```

---

## Output Artifacts

Upon successful completion:
1. ✅ `api/src/test/resources/application.properties` created
2. ✅ CourseAppTests runs in ~3-5 seconds (verified via test report)
3. ✅ All tests pass (verified via `./gradlew api:test`)
4. ✅ Security tests confirmed to validate auth flows (with Docker services)
5. ✅ Repository memory updated with implementation notes

---

## Sign-Off Checklist

- [x] Task 1 completed: Properties file created with correct exclusions
- [ ] Task 2 completed: CourseAppTests passes without external dependencies
- [ ] Task 3 completed: Security tests remain intact and pass
- [ ] Task 4 completed: Full suite passes; documentation updated
- [ ] All acceptance criteria verified
- [ ] Implementation ready for code review

