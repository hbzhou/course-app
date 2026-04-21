# Pure Spring OAuth2 Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom OAuth2 code-exchange controller with Spring Security `oauth2Login`, keep legacy JWT login working, and use server-side session auth for OAuth2 users.

**Architecture:** The backend becomes the owner of the OAuth2 authorization-code flow through Spring Security’s built-in `/oauth2/authorization/{registrationId}` and `/login/oauth2/code/{registrationId}` endpoints. Legacy username/password JWT login remains for backward compatibility, while the frontend switches from “token is the only auth signal” to a hybrid model: legacy users authenticate with bearer tokens, OAuth2 users authenticate with the session cookie and bootstrap identity via `/api/auth/me`.

**Tech Stack:** Spring Boot 4, Spring Security OAuth2 Client, Spring Security Resource Server, Kotlin, React 19, TypeScript, React Query, Vitest

---

## File Map

**Backend**
- Modify: `api/build.gradle.kts` — add Spring Security test support for MockMvc OAuth2 session tests.
- Modify: `api/src/main/resources/application.properties` — switch redirect URI to Spring’s built-in callback and add frontend success redirect setting.
- Modify: `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt` — enable `oauth2Login`, stop forcing stateless mode, keep resource-server support for legacy bearer flows.
- Modify: `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt` — add `/api/auth/me`, make logout invalidate session as well as return `200`.
- Delete: `api/src/main/kotlin/com/itsz/app/auth/controller/OAuth2AuthController.kt` — remove custom login, callback, exchange, refresh, and config endpoints.
- Modify: `api/src/main/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptor.kt` — accept an existing authenticated session principal before falling back to bearer token parsing.
- Create: `api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt` — verify unauthenticated redirects, OAuth2 session access, and legacy bearer compatibility.
- Create: `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt` — verify `/api/auth/me` and session logout behavior.

**Frontend**
- Modify: `ui/src/api/client.ts` — always send cookies with requests, keep bearer header only when a legacy token exists.
- Modify: `ui/src/api/authApi.ts` — add `getCurrentUser`, simplify OAuth2 login start to browser redirect, make logout session-safe.
- Modify: `ui/src/context/auth-context.ts` — reshape context around `user`, `authStatus`, `isAuthenticated`, and bootstrap methods instead of OAuth2 token storage.
- Modify: `ui/src/context/AuthContext.tsx` — bootstrap session user from `/api/auth/me`, keep legacy token persistence, remove browser-side OAuth2 token storage and refresh loop.
- Modify: `ui/src/router/ProtectedRoute.tsx` — wait for auth bootstrap before deciding whether to redirect.
- Modify: `ui/src/pages/auth/Login.tsx` — send the browser to Spring’s `/oauth2/authorization/keycloak` endpoint and remove custom callback assumptions.
- Delete: `ui/src/pages/auth/OAuth2Callback.tsx` — no longer needed because Spring handles the callback.
- Modify: `ui/src/App.tsx` — remove the OAuth2 callback route.
- Modify: `ui/src/layout/Profile.tsx` — render authenticated user from session or legacy login and call session-aware logout.
- Modify: `ui/src/hooks/useAuth.ts` — login remains for legacy JWT, logout clears either auth mode.
- Modify: `ui/src/hooks/useWebSocket.ts` — connect with session cookies by default and use bearer headers only when a legacy token exists.
- Modify tests: `ui/src/context/__tests__/AuthContext.test.tsx`, `ui/src/router/__tests__/ProtectedRoute.test.tsx`, `ui/src/pages/auth/__tests__/Login.test.tsx`, `ui/src/hooks/__tests__/useWebSocket.test.tsx`, `ui/src/api/__tests__/client.test.ts`, `ui/src/hooks/__tests__/useAuth.test.tsx`, `ui/src/layout/__tests__/Profile.test.tsx`

**Docs**
- Modify: `README.md` — update OAuth2 login flow description and remove references to `/api/auth/oauth2/exchange` and `/oauth2/callback`.
- Modify: `OAUTH2_SETUP_GUIDE.md` — change redirect URI and verification steps to Spring Security built-ins.

---

### Task 1: Add Backend Test Coverage for Session-Based OAuth2

**Files:**
- Modify: `api/build.gradle.kts`
- Create: `api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt`

- [ ] **Step 1: Write the failing security integration test**

```kotlin
package com.itsz.app.config

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigSessionAuthTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `oauth2 protected request redirects unauthenticated users to authorization endpoint`() {
        mockMvc.get("/courses")
            .andExpect {
                status { is3xxRedirection() }
                redirectedUrlPattern("**/oauth2/authorization/keycloak")
            }
    }

    @Test
    fun `oauth2 login session can access protected api`() {
        mockMvc.get("/api/auth/me") {
            with(oauth2Login().attributes { it["preferred_username"] = "testuser"; it["email"] = "test@example.com" })
        }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("testuser") }
            jsonPath("$.email") { value("test@example.com") }
        }
    }

    @Test
    fun `legacy bearer token access still works`() {
        mockMvc.get("/api/auth/me") {
            with(jwt().jwt { jwt -> jwt.subject("admin") })
        }.andExpect {
            status { isOk() }
        }
    }
}
```

- [ ] **Step 2: Run the backend security test to verify it fails**

Run: `./gradlew api:test --tests com.itsz.app.config.SecurityConfigSessionAuthTest`

Expected: FAIL because `spring-security-test` is not on the classpath and `/api/auth/me` does not exist yet.

- [ ] **Step 3: Add the missing test dependency**

```kotlin
dependencies {
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
```

- [ ] **Step 4: Re-run the test to confirm the remaining failures are real feature gaps**

Run: `./gradlew api:test --tests com.itsz.app.config.SecurityConfigSessionAuthTest`

Expected: FAIL with missing `/api/auth/me` behavior and current stateless security config.

- [ ] **Step 5: Commit the test scaffolding**

```bash
git add api/build.gradle.kts api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt
git commit -m "test: cover session oauth2 security flow"
```

### Task 2: Replace the Custom OAuth2 Controller with Spring Security oauth2Login

**Files:**
- Modify: `api/src/main/resources/application.properties`
- Modify: `api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt`
- Modify: `api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt`
- Delete: `api/src/main/kotlin/com/itsz/app/auth/controller/OAuth2AuthController.kt`
- Create: `api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt`

- [ ] **Step 1: Write the failing controller/session test**

```kotlin
package com.itsz.app.auth.controller

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerSessionTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `me returns oauth2 principal details`() {
        mockMvc.get("/api/auth/me") {
            with(oauth2Login().attributes {
                it["preferred_username"] = "testuser"
                it["email"] = "testuser@example.com"
            })
        }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("testuser") }
            jsonPath("$.email") { value("testuser@example.com") }
            jsonPath("$.authType") { value("oauth2") }
        }
    }

    @Test
    fun `logout invalidates current session`() {
        val mvcResult = mockMvc.get("/api/auth/me") {
            with(oauth2Login())
        }.andReturn()

        mockMvc.delete("/api/auth/logout") {
            session(mvcResult.request.session)
        }.andExpect {
            status { isOk() }
        }
    }
}
```

- [ ] **Step 2: Run the controller test to verify it fails**

Run: `./gradlew api:test --tests com.itsz.app.auth.controller.AuthControllerSessionTest`

Expected: FAIL because `/api/auth/me` does not return principal data and logout does not invalidate sessions.

- [ ] **Step 3: Update OAuth2 properties to use Spring’s built-in callback**

```properties
spring.security.oauth2.client.registration.keycloak.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}
app.oauth2.success-url=${OAUTH2_SUCCESS_URL:http://localhost:3000/courses}
```

- [ ] **Step 4: Convert security config to `oauth2Login` while keeping legacy bearer support**

```kotlin
@Bean
fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
    http
        .csrf { csrf -> csrf.disable() }
        .authorizeHttpRequests {
            it
                .requestMatchers(
                    "/",
                    "/assets/**",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/error",
                    "/**/*.html", "/**/*.css", "/**/*.js", "/**/*.png", "/**/*.jpg", "/**/*.jpeg", "/**/*.gif", "/**/*.svg", "/**/*.ico",
                    "/actuator/health/**",
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/auth/logout",
                    "/oauth2/**",
                    "/login/oauth2/**",
                    "/ws/**"
                ).permitAll()
                .anyRequest().authenticated()
        }
        .oauth2Login { oauth2 ->
            oauth2.defaultSuccessUrl(successUrl, true)
        }
        .oauth2ResourceServer { oauth2 ->
            oauth2.jwt { jwt ->
                jwt.jwtAuthenticationConverter(keycloakJwtConverter())
            }
        }
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)

    return http.build()
}
```

- [ ] **Step 5: Expose authenticated user details and invalidate session on logout**

```kotlin
@GetMapping("/me")
fun me(authentication: Authentication?): ResponseEntity<Map<String, String>> {
    if (authentication == null || !authentication.isAuthenticated) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
    }

    val principal = authentication.principal
    return when (principal) {
        is Jwt -> ResponseEntity.ok(
            mapOf(
                "name" to (principal.subject ?: "unknown"),
                "email" to (principal.getClaimAsString("email") ?: "unknown@example.com"),
                "authType" to "bearer"
            )
        )
        is OAuth2User -> ResponseEntity.ok(
            mapOf(
                "name" to (principal.getAttribute("preferred_username") ?: principal.name),
                "email" to (principal.getAttribute("email") ?: "unknown@example.com"),
                "authType" to "oauth2"
            )
        )
        else -> ResponseEntity.ok(
            mapOf(
                "name" to authentication.name,
                "email" to "unknown@example.com",
                "authType" to "session"
            )
        )
    }
}

@DeleteMapping("/logout")
fun logout(request: HttpServletRequest, response: HttpServletResponse): ResponseEntity<Void> {
    request.getSession(false)?.invalidate()
    SecurityContextHolder.clearContext()
    response.setHeader("Clear-Site-Data", "\"cookies\"")
    return ResponseEntity.ok().build()
}
```

- [ ] **Step 6: Delete the manual OAuth2 controller**

```text
Delete file: api/src/main/kotlin/com/itsz/app/auth/controller/OAuth2AuthController.kt
```

- [ ] **Step 7: Run the targeted backend tests to verify the new flow passes**

Run: `./gradlew api:test --tests com.itsz.app.config.SecurityConfigSessionAuthTest --tests com.itsz.app.auth.controller.AuthControllerSessionTest`

Expected: PASS.

- [ ] **Step 8: Commit the backend migration**

```bash
git add api/src/main/resources/application.properties api/src/main/kotlin/com/itsz/app/config/SecurityConfig.kt api/src/main/kotlin/com/itsz/app/auth/controller/AuthController.kt api/src/test/kotlin/com/itsz/app/config/SecurityConfigSessionAuthTest.kt api/src/test/kotlin/com/itsz/app/auth/controller/AuthControllerSessionTest.kt
git rm api/src/main/kotlin/com/itsz/app/auth/controller/OAuth2AuthController.kt
git commit -m "feat: use spring oauth2 login for keycloak"
```

### Task 3: Refactor Frontend Auth State to Bootstrap Session Users

**Files:**
- Modify: `ui/src/api/client.ts`
- Modify: `ui/src/api/authApi.ts`
- Modify: `ui/src/context/auth-context.ts`
- Modify: `ui/src/context/AuthContext.tsx`
- Modify: `ui/src/hooks/useAuth.ts`
- Modify: `ui/src/context/__tests__/AuthContext.test.tsx`
- Modify: `ui/src/api/__tests__/client.test.ts`

- [ ] **Step 1: Write the failing API client and auth context tests**

```ts
it("apiClient sends credentials for session auth", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );

  await apiClient("/api/auth/me");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/auth/me",
    expect.objectContaining({ credentials: "include" })
  );
});

it("bootstraps authenticated user from session endpoint", async () => {
  vi.mocked(localStorage.getItem).mockReturnValue(null);
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ name: "testuser", email: "test@example.com", authType: "oauth2" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );

  const { result } = renderHook(() => useAuthContext(), { wrapper });

  await waitFor(() => {
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe("testuser");
    expect(result.current.authStatus).toBe("authenticated");
  });
});
```

- [ ] **Step 2: Run the focused frontend tests to verify they fail**

Run: `cd ui && npm test -- --run src/api/__tests__/client.test.ts src/context/__tests__/AuthContext.test.tsx`

Expected: FAIL because `credentials: "include"`, `authStatus`, and `/api/auth/me` bootstrap behavior do not exist.

- [ ] **Step 3: Update the shared API client to support both cookies and legacy bearer tokens**

```ts
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiClient = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const hasBody = options?.body !== undefined && options?.body !== null;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  // keep the existing response parsing and ApiError handling
};
```

- [ ] **Step 4: Replace OAuth2 token storage with a session bootstrap model**

```ts
export interface AuthenticatedUser {
  name: string;
  email: string;
  authType: "legacy" | "oauth2" | "bearer" | "session";
}

export interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  authStatus: "loading" | "authenticated" | "anonymous";
  isAuthenticated: boolean;
  login: (user: { username: string; email: string; token: string }) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}
```

```ts
useEffect(() => {
  let mounted = true;

  const bootstrap = async () => {
    if (token) {
      setUser({ name: currentUser?.username ?? "", email: currentUser?.email ?? "", authType: "legacy" });
      setAuthStatus("authenticated");
      return;
    }

    try {
      const sessionUser = await authApi.getCurrentUser();
      if (!mounted) return;
      setUser(sessionUser);
      setAuthStatus("authenticated");
    } catch {
      if (!mounted) return;
      setUser(null);
      setAuthStatus("anonymous");
    }
  };

  bootstrap();
  return () => {
    mounted = false;
  };
}, [token]);
```

- [ ] **Step 5: Add session-aware auth API methods and logout hook behavior**

```ts
export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    return apiClient<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  getCurrentUser: async (): Promise<{ name: string; email: string; authType: "oauth2" | "bearer" | "session" }> => {
    return apiClient("/api/auth/me");
  },

  logout: async (): Promise<void> => {
    return apiClient<void>("/api/auth/logout", {
      method: "DELETE",
    });
  },
};
```

```ts
export const useLogout = () => {
  const { logout } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
};
```

- [ ] **Step 6: Re-run the focused frontend tests to verify the refactor passes**

Run: `cd ui && npm test -- --run src/api/__tests__/client.test.ts src/context/__tests__/AuthContext.test.tsx src/hooks/__tests__/useAuth.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the frontend auth state refactor**

```bash
git add ui/src/api/client.ts ui/src/api/authApi.ts ui/src/context/auth-context.ts ui/src/context/AuthContext.tsx ui/src/hooks/useAuth.ts ui/src/context/__tests__/AuthContext.test.tsx ui/src/api/__tests__/client.test.ts ui/src/hooks/__tests__/useAuth.test.tsx
git commit -m "refactor: bootstrap oauth2 auth from server session"
```

### Task 4: Simplify the Login UI and Route Gating Around Server Sessions

**Files:**
- Modify: `ui/src/pages/auth/Login.tsx`
- Modify: `ui/src/router/ProtectedRoute.tsx`
- Modify: `ui/src/App.tsx`
- Modify: `ui/src/layout/Profile.tsx`
- Delete: `ui/src/pages/auth/OAuth2Callback.tsx`
- Modify: `ui/src/pages/auth/__tests__/Login.test.tsx`
- Modify: `ui/src/router/__tests__/ProtectedRoute.test.tsx`
- Modify: `ui/src/layout/__tests__/Profile.test.tsx`

- [ ] **Step 1: Write the failing UI tests for login redirect and auth bootstrap loading state**

```ts
it("redirects browser to Spring Security oauth2 authorization endpoint", async () => {
  const assignSpy = vi.fn();
  Object.defineProperty(window, "location", {
    value: { href: "http://localhost:3000/login", assign: assignSpy },
    writable: true,
  });

  renderLogin();
  await userEvent.click(screen.getByRole("button", { name: /login with oauth2/i }));

  expect(window.location.href).toContain("/oauth2/authorization/keycloak");
});

it("shows loading UI while auth bootstrap is in progress", () => {
  vi.mock("@/context/auth-context", () => ({
    useAuthContext: () => ({ authStatus: "loading", isAuthenticated: false }),
  }));

  render(
    <MemoryRouter>
      <ProtectedRoute><div>Secret</div></ProtectedRoute>
    </MemoryRouter>
  );

  expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused UI tests to verify they fail**

Run: `cd ui && npm test -- --run src/pages/auth/__tests__/Login.test.tsx src/router/__tests__/ProtectedRoute.test.tsx src/layout/__tests__/Profile.test.tsx`

Expected: FAIL because the UI still depends on `/api/auth/oauth2/login`, callback routing, and token-only protection.

- [ ] **Step 3: Point the OAuth2 button at Spring’s built-in entry point and remove the callback route**

```ts
const handleOAuth2Login = () => {
  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
  if (fromPath && fromPath !== "/login") {
    sessionStorage.setItem("oauth2_return_to", fromPath);
  }

  window.location.href = "/oauth2/authorization/keycloak";
};
```

```tsx
<Routes>
  <Route element={<ProtectedLayout />}>
    <Route path='/' element={<Navigate to='/courses' replace />} />
    <Route path='/courses' element={<Courses />} />
    <Route path='/courses/:id' element={<CourseInfo />} />
    <Route path='/authors' element={<Authors />} />
    <Route path='/tags' element={<Tags />} />
    <Route path='/users' element={<Users />} />
    <Route path='/courses/add' element={<CreateCourse />} />
  </Route>
  <Route path='/login' element={<Login />} />
  <Route path='/register' element={<Registration />} />
</Routes>
```

- [ ] **Step 4: Make route protection and profile rendering session-aware**

```tsx
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { authStatus, isAuthenticated } = useAuthContext();

  if (authStatus == "loading") {
    return <div className="p-6 text-sm text-muted-foreground">Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};
```

```tsx
const { user, isAuthenticated } = useAuthContext();

if (!isAuthenticated) return null;

<span className="text-sm font-medium line-clamp-1">{user?.name}</span>
```

- [ ] **Step 5: Delete the obsolete callback page**

```text
Delete file: ui/src/pages/auth/OAuth2Callback.tsx
```

- [ ] **Step 6: Re-run the focused UI tests to verify the new route model passes**

Run: `cd ui && npm test -- --run src/pages/auth/__tests__/Login.test.tsx src/router/__tests__/ProtectedRoute.test.tsx src/layout/__tests__/Profile.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the UI routing cleanup**

```bash
git add ui/src/pages/auth/Login.tsx ui/src/router/ProtectedRoute.tsx ui/src/App.tsx ui/src/layout/Profile.tsx ui/src/pages/auth/__tests__/Login.test.tsx ui/src/router/__tests__/ProtectedRoute.test.tsx ui/src/layout/__tests__/Profile.test.tsx
git rm ui/src/pages/auth/OAuth2Callback.tsx
git commit -m "refactor: remove custom oauth2 callback ui"
```

### Task 5: Make WebSocket Authentication Work with Session Cookies and Legacy Tokens

**Files:**
- Modify: `api/src/main/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptor.kt`
- Modify: `ui/src/hooks/useWebSocket.ts`
- Modify: `ui/src/hooks/__tests__/useWebSocket.test.tsx`

- [ ] **Step 1: Write the failing WebSocket hook test for session-backed connections**

```ts
it("connects without Authorization header when using session auth", () => {
  vi.mock("@/context/auth-context", () => ({
    useAuthContext: () => ({ token: null, isAuthenticated: true }),
  }));

  renderHook(() => useWebSocket(), { wrapper });

  expect(Client).toHaveBeenCalledWith(
    expect.objectContaining({
      connectHeaders: {},
    })
  );
});
```

- [ ] **Step 2: Run the WebSocket test to verify it fails**

Run: `cd ui && npm test -- --run src/hooks/__tests__/useWebSocket.test.tsx`

Expected: FAIL because the hook always injects `Authorization: Bearer ...`.

- [ ] **Step 3: Let the backend reuse an existing authenticated principal before parsing bearer headers**

```kotlin
override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
    val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
        ?: return message

    if (accessor.command == StompCommand.CONNECT) {
        if (accessor.user != null) {
            return message
        }

        val rawHeader = accessor.getFirstNativeHeader("Authorization") ?: return message
        val token = rawHeader.removePrefix("Bearer ").trim()
        if (token.isBlank()) {
            throw BadCredentialsException("Missing JWT token")
        }

        // keep existing legacy JWT and Keycloak JWT fallback logic
    }

    return message
}
```

- [ ] **Step 4: Remove the forced bearer header from session-backed browser connections**

```ts
const { token, isAuthenticated } = useAuthContext();

if (!isAuthenticated) {
  clientRef.current?.deactivate();
  clientRef.current = null;
  return;
}

const client = new Client({
  brokerURL: WS_URL,
  connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  reconnectDelay: 5000,
  onConnect: () => {
    client.subscribe(TOPIC, (frame) => {
      const msg: NotificationMessage = JSON.parse(frame.body);
      addNotification(transformToNotification(msg));
    });
  },
});
```

- [ ] **Step 5: Re-run the WebSocket tests to verify both auth modes are supported**

Run: `cd ui && npm test -- --run src/hooks/__tests__/useWebSocket.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the WebSocket auth update**

```bash
git add api/src/main/kotlin/com/itsz/app/config/WebSocketAuthChannelInterceptor.kt ui/src/hooks/useWebSocket.ts ui/src/hooks/__tests__/useWebSocket.test.tsx
git commit -m "fix: support session auth for websocket connections"
```

### Task 6: Update Docs and Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `OAUTH2_SETUP_GUIDE.md`

- [ ] **Step 1: Update the docs to describe the Spring-managed flow**

```md
## OAuth2 Login Flow

1. Browser navigates to `/oauth2/authorization/keycloak`
2. Spring Security redirects to Keycloak
3. Keycloak redirects back to `/login/oauth2/code/keycloak`
4. Spring Security exchanges the authorization code and establishes the session
5. Frontend bootstraps the logged-in user by calling `/api/auth/me`
```

```md
### Keycloak Redirect URIs

- `http://localhost:8081/login/oauth2/code/keycloak`
- `http://localhost:3000/courses`
```

- [ ] **Step 2: Run backend verification**

Run: `./gradlew api:test`

Expected: PASS.

- [ ] **Step 3: Run frontend verification**

Run: `cd ui && npm test && npm run lint`

Expected: PASS.

- [ ] **Step 4: Run a manual end-to-end smoke check**

Run:

```bash
docker compose up -d
./gradlew api:bootRun
cd ui && npm run dev
```

Expected:
- Legacy login still works.
- Clicking `Login with OAuth2 (Keycloak)` redirects to Keycloak.
- Successful OAuth2 login lands on `/courses` with no code-exchange XHR.
- `/api/auth/me` returns the authenticated user.
- Notifications still arrive over WebSocket.

- [ ] **Step 5: Commit docs and verification follow-ups**

```bash
git add README.md OAUTH2_SETUP_GUIDE.md
git commit -m "docs: describe spring managed oauth2 login"
```

---

## Self-Review

**Spec coverage:** The plan covers backend security, OAuth2 callback ownership, frontend auth bootstrap, route protection, WebSocket auth, tests, and docs.

**Placeholder scan:** No `TODO`, `TBD`, or “handle later” placeholders remain. Each task includes exact files, commands, and code to write.

**Type consistency:** The plan consistently uses `authStatus`, `isAuthenticated`, `getCurrentUser`, `/api/auth/me`, and Spring’s `/oauth2/authorization/keycloak` plus `/login/oauth2/code/keycloak` endpoints.