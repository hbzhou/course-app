# Multi-Provider Login UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show both Azure AD and Keycloak login buttons on the login page, with the provider list served dynamically from a backend API endpoint.

**Architecture:** Add a `GET /api/auth/providers` public endpoint to `AuthController` that returns provider metadata from existing config. Update `SecurityConfig` to redirect unauthenticated page navigations to `/login` instead of auto-redirecting to a single provider. Replace the static single-provider OAuth2 button in `Login.tsx` with a dynamic list fetched via `useProviders()` hook.

**Tech Stack:** Spring Boot 4 / Kotlin, React 19 / TypeScript, TanStack React Query v5, Vitest + Testing Library

---

### Task 1: Backend — Add `GET /api/auth/providers` endpoint

**Files:**
- Modify: `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt`
- Test: `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerProvidersTest.kt`

- [ ] **Step 1: Write the failing test**

Create `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerProvidersTest.kt`:

```kotlin
package com.itsz.app.auth.controller

import com.itsz.app.config.EmbeddedRedisSupport
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.web.FilterChainProxy
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext

@SpringBootTest
class AuthControllerProvidersTest : EmbeddedRedisSupport() {

    @Autowired
    lateinit var webApplicationContext: WebApplicationContext

    @Autowired
    lateinit var springSecurityFilterChain: FilterChainProxy

    private lateinit var mockMvc: MockMvc

    @BeforeEach
    fun setUp() {
        val builder: DefaultMockMvcBuilder = MockMvcBuilders.webAppContextSetup(webApplicationContext)
        builder.addFilters<DefaultMockMvcBuilder>(springSecurityFilterChain)
        mockMvc = builder.build()
    }

    @Test
    fun `providers endpoint returns configured providers`() {
        mockMvc.get("/api/auth/providers")
            .andExpect {
                status { isOk() }
                jsonPath("$[0].providerId") { value("azure") }
                jsonPath("$[0].displayName") { value("Azure AD") }
                jsonPath("$[1].providerId") { value("keycloak") }
                jsonPath("$[1].displayName") { value("Keycloak") }
            }
    }

    @Test
    fun `providers endpoint is publicly accessible without authentication`() {
        mockMvc.get("/api/auth/providers")
            .andExpect {
                status { isOk() }
            }
    }

    @Test
    fun `providers endpoint does not expose internal claim configuration`() {
        mockMvc.get("/api/auth/providers")
            .andExpect {
                status { isOk() }
                jsonPath("$[0].usernameClaims") { doesNotExist() }
                jsonPath("$[0].emailClaims") { doesNotExist() }
                jsonPath("$[0].roleClaims") { doesNotExist() }
                jsonPath("$[0].issuerUri") { doesNotExist() }
            }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew api:test --tests "com.itsz.app.auth.controller.AuthControllerProvidersTest" --info 2>&1 | tail -20`
Expected: FAIL — no endpoint mapped to `GET /api/auth/providers`

- [ ] **Step 3: Write minimal implementation**

Add to `AuthController.kt` — inject `OAuth2ProviderProperties` and add the endpoint. Add the import and constructor parameter, then add the method.

Add import at the top of `AuthController.kt`:

```kotlin
import com.itsz.app.auth.oauth2.OAuth2ProviderProperties
```

Add `oauth2ProviderProperties` to the constructor:

```kotlin
class AuthController(
    private val authenticationManager: AuthenticationManager,
    private val userDetailsService: UserDetailsService,
    private val jwtService: JwtService,
    private val userService: UserService,
    private val roleRepository: RoleRepository,
    private val passwordEncoder: PasswordEncoder,
    private val oauth2ProviderProperties: OAuth2ProviderProperties
) {
```

Add the endpoint method (before the `login` method):

```kotlin
    data class ProviderInfo(val providerId: String, val displayName: String)

    @GetMapping("/providers")
    fun providers(): List<ProviderInfo> {
        return oauth2ProviderProperties.providers.map {
            ProviderInfo(providerId = it.providerId, displayName = it.displayName)
        }
    }
```

- [ ] **Step 4: Add `/api/auth/providers` to `permitAll()` in `SecurityConfig.kt`**

In `SecurityConfig.kt`, update the existing `permitAll` line from:

```kotlin
.requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout").permitAll()
```

to:

```kotlin
.requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/providers").permitAll()
```

- [ ] **Step 5: Run test to verify it passes**

Run: `./gradlew api:test --tests "com.itsz.app.auth.controller.AuthControllerProvidersTest" --info 2>&1 | tail -20`
Expected: PASS — all 3 tests green

- [ ] **Step 6: Run all existing backend tests to check for regressions**

Run: `./gradlew api:test 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt \
        api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt \
        api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerProvidersTest.kt
git commit -m "feat: add GET /api/auth/providers public endpoint"
```

---

### Task 2: Backend — Change security entry point to redirect to `/login`

**Files:**
- Modify: `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt`
- Modify: `api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt`

- [ ] **Step 1: Update the existing redirect test to expect `/login`**

In `SecurityConfigSessionAuthTest.kt`, change the test `oauth2 protected request redirects unauthenticated users to authorization endpoint` from:

```kotlin
    @Test
    fun `oauth2 protected request redirects unauthenticated users to authorization endpoint`() {
        mockMvc.get("/courses")
            .andExpect {
                status { is3xxRedirection() }
                redirectedUrlPattern("**/oauth2/authorization/azure")
            }
    }
```

to:

```kotlin
    @Test
    fun `unauthenticated page request redirects to login`() {
        mockMvc.get("/courses")
            .andExpect {
                status { is3xxRedirection() }
                redirectedUrlPattern("**/login")
            }
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew api:test --tests "com.itsz.app.config.SecurityConfigSessionAuthTest.unauthenticated page request redirects to login" --info 2>&1 | tail -20`
Expected: FAIL — still redirecting to `/oauth2/authorization/azure`

- [ ] **Step 3: Update `SecurityConfig.kt` exception handling**

Replace the current `exceptionHandling` block in `SecurityConfig.kt` from:

```kotlin
            .exceptionHandling { exceptions ->
                val oauth2EntryPoint = LoginUrlAuthenticationEntryPoint("/oauth2/authorization/${oauth2ProviderResolver.defaultProfile().providerId}")
                oauth2EntryPoint.setFavorRelativeUris(false)
                exceptions.defaultAuthenticationEntryPointFor(
                    oauth2EntryPoint,
                    RequestMatcher { request -> request.requestURI == "/courses" }
                )
            }
```

to:

```kotlin
            .exceptionHandling { exceptions ->
                val loginEntryPoint = LoginUrlAuthenticationEntryPoint("/login")
                exceptions.defaultAuthenticationEntryPointFor(
                    loginEntryPoint,
                    RequestMatcher { request -> !request.requestURI.startsWith("/api/") }
                )
            }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew api:test --tests "com.itsz.app.config.SecurityConfigSessionAuthTest" --info 2>&1 | tail -20`
Expected: All tests in this class pass

- [ ] **Step 5: Run all backend tests for regressions**

Run: `./gradlew api:test 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt \
        api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt
git commit -m "feat: redirect unauthenticated page requests to /login instead of default provider"
```

---

### Task 3: Frontend — Add `OAuth2Provider` type, `getProviders()` API, and `useProviders()` hook

**Files:**
- Create: `ui/src/types/oauth2-provider.d.ts`
- Modify: `ui/src/api/authApi.ts`
- Modify: `ui/src/hooks/useAuth.ts`

- [ ] **Step 1: Create the `OAuth2Provider` type**

Create `ui/src/types/oauth2-provider.d.ts`:

```typescript
export type OAuth2Provider = {
  providerId: string;
  displayName: string;
};
```

- [ ] **Step 2: Add `getProviders()` to `authApi.ts`**

Add the import at the top of `ui/src/api/authApi.ts`:

```typescript
import type { OAuth2Provider } from "@/types/oauth2-provider";
```

Add the method inside the `authApi` object, after the `logout` method:

```typescript
  getProviders: async (): Promise<OAuth2Provider[]> => {
    return apiClient<OAuth2Provider[]>("/api/auth/providers");
  },
```

- [ ] **Step 3: Add `useProviders()` hook to `useAuth.ts`**

Add import for `useQuery` at the top of `ui/src/hooks/useAuth.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
```

Add the hook at the bottom of the file:

```typescript
export const useProviders = () => {
  return useQuery({
    queryKey: ["oauth2-providers"],
    queryFn: () => authApi.getProviders(),
    staleTime: 5 * 60 * 1000,
  });
};
```

- [ ] **Step 4: Commit**

```bash
git add ui/src/types/oauth2-provider.d.ts ui/src/api/authApi.ts ui/src/hooks/useAuth.ts
git commit -m "feat: add OAuth2Provider type, getProviders API, and useProviders hook"
```

---

### Task 4: Frontend — Update `Login.tsx` to render dynamic provider buttons

**Files:**
- Modify: `ui/src/pages/auth/Login.tsx`
- Delete: `ui/src/config/oauth2.ts`

- [ ] **Step 1: Update `Login.tsx` imports**

Replace the import:

```typescript
import { defaultOAuth2AuthorizationPath, defaultOAuth2ProviderLabel } from "@/config/oauth2";
```

with:

```typescript
import { useProviders } from "@/hooks/useAuth";
```

- [ ] **Step 2: Add `useProviders()` call inside the component**

Inside the `Login` component, after the `useForm` call, add:

```typescript
  const { data: providers, isLoading: providersLoading } = useProviders();
```

- [ ] **Step 3: Update `handleOAuth2Login` to accept `providerId`**

Replace the current `handleOAuth2Login` function:

```typescript
  const handleOAuth2Login = () => {
    const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
    if (fromPath && fromPath !== "/login") {
      sessionStorage.setItem("oauth2_return_to", fromPath);
    }

    window.location.href = defaultOAuth2AuthorizationPath;
  };
```

with:

```typescript
  const handleOAuth2Login = (providerId: string) => {
    const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
    if (fromPath && fromPath !== "/login") {
      sessionStorage.setItem("oauth2_return_to", fromPath);
    }

    window.location.href = `/oauth2/authorization/${providerId}`;
  };
```

- [ ] **Step 4: Replace the single OAuth2 button with a dynamic provider list**

Replace the OAuth2 button section (the entire `{/* OAuth2 Login Option */}` div):

```tsx
            {/* OAuth2 Login Option */}
            <div className="w-full space-y-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleOAuth2Login}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                {`Continue with ${defaultOAuth2ProviderLabel}`}
              </Button>
            </div>
```

with:

```tsx
            {/* OAuth2 Login Options */}
            {providersLoading ? (
              <div className="w-full flex justify-center py-2">
                <span className="text-sm text-muted-foreground">Loading providers...</span>
              </div>
            ) : providers && providers.length > 0 ? (
              <div className="w-full space-y-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                {providers.map((provider) => (
                  <Button
                    key={provider.providerId}
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuth2Login(provider.providerId)}
                  >
                    {`Continue with ${provider.displayName}`}
                  </Button>
                ))}
              </div>
            ) : null}
```

- [ ] **Step 5: Delete `ui/src/config/oauth2.ts`**

```bash
rm ui/src/config/oauth2.ts
```

- [ ] **Step 6: Verify the app compiles**

Run: `cd ui && npx tsc --noEmit 2>&1 | tail -20`
Expected: No errors (no remaining references to deleted config)

- [ ] **Step 7: Commit**

```bash
git add ui/src/pages/auth/Login.tsx ui/src/hooks/useAuth.ts
git rm ui/src/config/oauth2.ts
git commit -m "feat: render dynamic multi-provider OAuth2 buttons on login page"
```

---

### Task 5: Frontend — Update `Login.test.tsx` for multi-provider behavior

**Files:**
- Modify: `ui/src/pages/auth/__tests__/Login.test.tsx`

- [ ] **Step 1: Update the mock to include `getProviders`**

Replace the mock block at the top of `Login.test.tsx`:

```typescript
vi.mock("@/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));
```

with:

```typescript
vi.mock("@/api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    getProviders: vi.fn(),
  },
}));
```

- [ ] **Step 2: Set up default `getProviders` mock in `beforeEach`**

Add to the `beforeEach` block, after `vi.clearAllMocks()`:

```typescript
    vi.mocked(authApi.getProviders).mockResolvedValue([
      { providerId: "azure", displayName: "Azure AD" },
      { providerId: "keycloak", displayName: "Keycloak" },
    ]);
```

- [ ] **Step 3: Replace the old single-provider button test**

Replace the test:

```typescript
  it("renders the default Azure AD button label", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /continue with azure ad/i })).toBeInTheDocument();
  });
```

with:

```typescript
  it("renders both provider buttons from API", async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue with azure ad/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /continue with keycloak/i })).toBeInTheDocument();
  });
```

- [ ] **Step 4: Replace the single-provider redirect test**

Replace the test:

```typescript
  it("redirects browser to the configured provider authorization endpoint", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    const locationMock = {
      ...window.location,
      href: "http://localhost:3000/login",
    };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: locationMock,
    });

    renderLogin();
    await user.click(screen.getByRole("button", { name: /continue with azure ad/i }));

    expect(window.location.href).toContain("/oauth2/authorization/azure");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
```

with two tests:

```typescript
  it("redirects to Azure AD authorization endpoint when Azure button clicked", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "http://localhost:3000/login" },
    });

    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue with azure ad/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /continue with azure ad/i }));

    expect(window.location.href).toContain("/oauth2/authorization/azure");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("redirects to Keycloak authorization endpoint when Keycloak button clicked", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "http://localhost:3000/login" },
    });

    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue with keycloak/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /continue with keycloak/i }));

    expect(window.location.href).toContain("/oauth2/authorization/keycloak");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
```

- [ ] **Step 5: Update the return-path test to use async provider rendering**

Replace the test:

```typescript
  it("stores oauth2 return path when login is opened from a protected route", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "http://localhost:3000/login" },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/login",
                state: { from: { pathname: "/courses" } },
              },
            ]}
          >
            <Routes>
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await user.click(screen.getByRole("button", { name: /continue with azure ad/i }));

    expect(sessionStorage.setItem).toHaveBeenCalledWith("oauth2_return_to", "/courses");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
```

with:

```typescript
  it("stores oauth2 return path when login is opened from a protected route", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "http://localhost:3000/login" },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: "/login",
                state: { from: { pathname: "/courses" } },
              },
            ]}
          >
            <Routes>
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue with azure ad/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /continue with azure ad/i }));

    expect(sessionStorage.setItem).toHaveBeenCalledWith("oauth2_return_to", "/courses");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
```

- [ ] **Step 6: Add test for graceful fallback when providers fetch fails**

Add new test:

```typescript
  it("hides OAuth2 section when providers fetch fails", async () => {
    vi.mocked(authApi.getProviders).mockRejectedValue(new Error("Network error"));

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^login$/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /continue with/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 7: Add test for loading state**

Add new test:

```typescript
  it("shows loading state while providers are being fetched", () => {
    vi.mocked(authApi.getProviders).mockImplementation(
      () => new Promise(() => {})
    );

    renderLogin();

    expect(screen.getByText(/loading providers/i)).toBeInTheDocument();
  });
```

- [ ] **Step 8: Run all frontend tests**

Run: `cd ui && npm test 2>&1 | tail -30`
Expected: All tests pass, including both new and existing Login tests

- [ ] **Step 9: Commit**

```bash
git add ui/src/pages/auth/__tests__/Login.test.tsx
git commit -m "test: update Login tests for multi-provider OAuth2 buttons"
```

---

### Task 6: Verify and final commit

**Files:** None (verification only)

- [ ] **Step 1: Run all backend tests**

Run: `./gradlew api:test 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 2: Run all frontend tests**

Run: `cd ui && npm test 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 3: Run frontend lint**

Run: `cd ui && npm run lint 2>&1 | tail -10`
Expected: 0 errors

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd ui && npx tsc --noEmit 2>&1 | tail -10`
Expected: No errors

- [ ] **Step 5: Final verification commit (if any lint/type fixes were needed)**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "chore: lint and type fixes for multi-provider login"
```
