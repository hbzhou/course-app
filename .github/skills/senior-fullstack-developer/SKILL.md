---
name: senior-fullstack-developer
description: 'Full-stack feature implementation workflow for course-app. Use when: implementing a new end-to-end feature from database to UI, reviewing code for quality and correctness, designing a new domain entity, deciding on architecture or data flow, making security decisions, or ensuring backend and frontend stay in sync. Covers Flyway migration → Kotlin entity → repository → service → controller → React types → API module → React Query hooks → component → route.'
argument-hint: 'Describe the feature to implement end-to-end (e.g., "a Tags domain with CRUD API and React UI")'
---

# Senior Full-Stack Developer — course-app

## When to Use
- Implementing a new end-to-end feature (database → API → UI)
- Reviewing code for quality, security, or convention violations
- Deciding between architectural approaches
- Adding a new domain entity with CRUD
- Ensuring backend contracts match frontend expectations

---

## Full-Stack Feature Workflow

Work in this order. Never skip migrations. Never hard-code IDs.

```
1. DB Migration (Flyway)
2. Kotlin Domain Entity + Repository
3. Service (extends EntityCrudService)
4. REST Controller + @PreAuthorize
5. TypeScript Types
6. API Module (apiClient)
7. React Query Hooks
8. React Component(s)
9. Route Registration (App.tsx)
```

---

## Step 1 — Database Migration

Create the next versioned file: `api/src/main/resources/db/migration/V{N}__description.sql`

**Rules:**
- Never modify an already-executed migration — add a new version instead
- Use `AUTO_INCREMENT PRIMARY KEY` as `BIGINT` for all entity tables  
- Foreign keys must have named constraints (e.g., `CONSTRAINT fk_tag_course FOREIGN KEY ...`)
- Join tables: composite PK from both FK columns

```sql
CREATE TABLE tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) NOT NULL
);
```

Apply: `./flyway.sh migrate` — or it auto-applies on next app startup.

---

## Step 2 — Kotlin Domain Entity

`api/src/main/kotlin/com/itsz/app/domain/<Entity>.kt`

```kotlin
@Entity
data class Tag(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    override val id: Long?,
    val name: String,
    val color: String
) : BaseEntity
```

**Rules:**
- Use `data class` — required for `.copy()` in `assignId`
- Implement `BaseEntity` (provides `val id: Long?`)
- Use `@ManyToMany` with explicit `@JoinTable` for many-to-many; `@ManyToOne`/`@OneToMany` for one-to-many
- No business logic in entities — they are pure data

---

## Step 3 — Repository

`api/src/main/kotlin/com/itsz/app/repository/<Entity>Repository.kt`

```kotlin
interface TagRepository : JpaRepository<Tag, Long>
```

Add custom queries only when Spring Data method names can't express them. Prefer JPQL over native SQL.

---

## Step 4 — Service

`api/src/main/kotlin/com/itsz/app/service/<Entity>Service.kt`

```kotlin
@Service
class TagService(
    override val repository: TagRepository,
    override val nameExtractor: (Tag) -> String? = { it.name }
) : EntityCrudService<Tag>() {

    override fun assignId(entity: Tag, id: Long): Tag = entity.copy(id = id)
}
```

**Override hooks when needed:**

| Hook | Use case |
|------|----------|
| `assignId(entity, id)` | **Always required** for data classes (immutability) |
| `prepareForCreate(entity)` | Set defaults, derive fields, hash passwords |
| `prepareForUpdate(existing, incoming, id)` | Merge fields, preserve immutable fields |
| `nameExtractor` | Provides entity name for `OperationEvent` messages |

`EntityCrudService` auto-publishes `OperationEvent` after every CUD via `DomainEventPublisher` (transactional, fires after commit → Redis → WebSocket).

---

## Step 5 — REST Controller

`api/src/main/kotlin/com/itsz/app/controller/<Entity>Controller.kt`

```kotlin
@RestController
@RequestMapping("/api/tags")
class TagController(private val tagService: TagService) {

    @GetMapping
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    fun getAll(): List<Tag> = tagService.getAll()

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_VIEW')")
    fun getById(@PathVariable id: Long): ResponseEntity<Tag> =
        tagService.getById(id).map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())

    @PostMapping
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun create(@RequestBody tag: Tag): ResponseEntity<Tag> =
        ResponseEntity.status(HttpStatus.CREATED).body(tagService.create(tag))

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun update(@PathVariable id: Long, @RequestBody tag: Tag): ResponseEntity<Tag> =
        try { ResponseEntity.ok(tagService.update(id, tag)) }
        catch (_: RuntimeException) { ResponseEntity.notFound().build() }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('COURSE_EDIT')")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> =
        try { tagService.delete(id); ResponseEntity.noContent().build() }
        catch (_: RuntimeException) { ResponseEntity.notFound().build() }
}
```
**Permission reference (existing permissions):**

| Permission | Holders | Use for |
|-----------|---------|----------|
| `COURSE_VIEW` | ROLE_ADMIN, ROLE_USER | Course GET endpoints |
| `COURSE_EDIT` | ROLE_ADMIN | Course POST, PUT, DELETE |
| `USER_MANAGE` | ROLE_ADMIN | User CRUD |
| `ROLE_MANAGE` | ROLE_ADMIN | Role assignment |
| `TAG_VIEW` | ROLE_ADMIN, ROLE_USER | Tag GET endpoints |
| `TAG_EDIT` | ROLE_ADMIN | Tag POST, PUT, DELETE |

**Each new domain must introduce its own permissions** — never reuse permissions from another domain (e.g. do not put `@PreAuthorize("hasAuthority('COURSE_EDIT')")` on a Tag endpoint). Create a new migration to insert the permissions and assign them to roles.

Template for new domain permissions (add to the migration that creates the domain's table, or in a dedicated `V{N}__add_<domain>_permissions.sql`):
```sql
INSERT INTO permission (name) VALUES ('<DOMAIN>_VIEW');
INSERT INTO permission (name) VALUES ('<DOMAIN>_EDIT');

-- ROLE_USER: read access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM role r JOIN permission p ON p.name = '<DOMAIN>_VIEW'
WHERE r.name = 'ROLE_USER';

-- ROLE_ADMIN: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM role r JOIN permission p ON p.name IN ('<DOMAIN>_VIEW', '<DOMAIN>_EDIT')
WHERE r.name = 'ROLE_ADMIN';
```

**Security rules:**
- Never skip `@PreAuthorize` on write endpoints
- Never expose internal exception messages in responses
- Return `404` for "not found", not `500`
- CSRF is disabled (stateless JWT); do not re-enable it

---

## Step 6 — TypeScript Types

`ui/src/types/<domain>.d.ts`

```typescript
export interface Tag {
  id: number;
  name: string;
  color: string;
}
```

Match field names exactly to the Kotlin entity's JSON serialization (camelCase by default).

---

## Step 7 — API Module

`ui/src/api/<domain>Api.ts`

```typescript
import { apiClient } from './client';
import { Tag } from '@/types/tag';

export const tagApi = {
  getTags: () => apiClient<Tag[]>('/api/tags'),
  getTagById: (id: number) => apiClient<Tag>(`/api/tags/${id}`),
  createTag: (tag: Omit<Tag, 'id'>) =>
    apiClient<Tag>('/api/tags', { method: 'POST', body: JSON.stringify(tag) }),
  updateTag: (tag: Tag) =>
    apiClient<Tag>(`/api/tags/${tag.id}`, { method: 'PUT', body: JSON.stringify(tag) }),
  deleteTag: (id: number) =>
    apiClient<void>(`/api/tags/${id}`, { method: 'DELETE' }),
};
```

`apiClient` auto-injects `Authorization: Bearer <token>` from `localStorage`.

---

## Step 8 — React Query Hooks

`ui/src/hooks/use<Domain>.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagApi } from '@/api/tagApi';
import { Tag } from '@/types/tag';

export const TAGS_QUERY_KEY = ['tags'];

// Query
export const useTags = () =>
  useQuery({ queryKey: TAGS_QUERY_KEY, queryFn: tagApi.getTags, staleTime: 5 * 60 * 1000 });

// Create — append to cache on success
export const useCreateTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tag: Omit<Tag, 'id'>) => tagApi.createTag(tag),
    onSuccess: (newTag) =>
      qc.setQueryData<Tag[]>(TAGS_QUERY_KEY, (old) => [...(old ?? []), newTag]),
    onError: () => qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY }),
  });
};

// Update — optimistic
export const useUpdateTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tag: Tag) => tagApi.updateTag(tag),
    onMutate: async (updated) => {
      await qc.cancelQueries({ queryKey: TAGS_QUERY_KEY });
      const previous = qc.getQueryData<Tag[]>(TAGS_QUERY_KEY);
      qc.setQueryData<Tag[]>(TAGS_QUERY_KEY, (old) =>
        old?.map((t) => (t.id === updated.id ? updated : t)) ?? []);
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(TAGS_QUERY_KEY, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY }),
  });
};

// Delete — optimistic
export const useDeleteTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tagApi.deleteTag(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TAGS_QUERY_KEY });
      const previous = qc.getQueryData<Tag[]>(TAGS_QUERY_KEY);
      qc.setQueryData<Tag[]>(TAGS_QUERY_KEY, (old) => old?.filter((t) => t.id !== id) ?? []);
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(TAGS_QUERY_KEY, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY }),
  });
};
```

**Cache strategy decision:**

| Operation | Strategy |
|-----------|----------|
| Create | `onSuccess`: append from server response |
| Update | `onMutate` optimistic + rollback; `onSettled` invalidate |
| Delete | `onMutate` optimistic + rollback; `onSettled` invalidate |

---

## Step 9 — Component and Route

See the `frontend-design` skill for detailed component templates (loading/error states, form patterns, Tailwind conventions). Quick reference:

- Wrap page components in `<main className="container mx-auto p-6">`
- Use `common/` primitives: `Button`, `Input`, `Label`, `Card`, `Textarea`
- Form: `react-hook-form` → `useForm<T>()` → `register` / `Controller` for complex inputs
- Error banner: `<div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">`

Register route in `App.tsx` inside `<ProtectedRoute>`:
```tsx
<Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />
<Route path="/tags/add" element={<ProtectedRoute><CreateTag /></ProtectedRoute>} />
```

---

## Event Flow — OperationEvent → Redis → WebSocket

Every `EntityCrudService` CUD operation automatically publishes a notification after the DB transaction commits. The full chain:

```
Service.create/update/delete()
  └─ DomainEventPublisher.publish(OperationEvent)         [Spring ApplicationEvent]
       └─ @TransactionalEventListener(AFTER_COMMIT)
            └─ OperationEventListener → Redis "course-app-notifications"
                 └─ RedisNotificationSubscriber → SimpMessagingTemplate → /topic/notifications
```

### Adding a New Entity Type

`OperationEvent.EntityType` is a hardcoded enum. **You must add a new value** when introducing a new domain entity, or `EntityType.valueOf(entity.javaClass.simpleName.uppercase())` will throw at runtime.

`api/src/main/kotlin/com/itsz/app/event/OperationEvent.kt`:
```kotlin
enum class EntityType { COURSE, AUTHOR, USER, TAG }  // ← add new entity here
```

### Suppressing Events

To suppress the automatic event for a specific operation (e.g., a bulk import where you don't want per-record noise), override the method in your service without calling `eventPublisher.publish(...)`:

```kotlin
@Transactional
override fun create(entity: Tag): Tag {
    val prepared = prepareForCreate(entity)
    return repository.save(prepared)
    // event deliberately omitted
}
```

### Custom Event Logic

Override `prepareForCreate` / `prepareForUpdate` only for data transformation. For custom event payloads, inject `DomainEventPublisher` and publish manually after the base `super.create(entity)` call.

---

## Architecture & Decision Rules

### State ownership
| Data | Where |
|------|-------|
| Server data (entities) | React Query |
| Auth (token, username) | Redux — `store/auth` |
| Notifications | Redux — `store/notifications` |
| Local UI (modals, search) | `useState` |

### API contract alignment
- Kotlin field names → JSON keys are camelCase by default (Jackson)
- `Long?` in Kotlin → `number \| null` in TypeScript for IDs
- `MutableList<Author>` → `Author[]` in TypeScript
- Never return raw JPA entities with lazy-loaded associations — they cause N+1 and serialization issues; add `@JsonIgnore` or use projections if needed

### Security must-haves
- Every write endpoint has `@PreAuthorize`
- JPA `@Transactional` on service writes, not controllers
- Passwords stored as BCrypt (never plaintext) — use `passwordEncoder().encode()`
- Never expose stack traces in HTTP responses

---

## Code Review Checklist

Before marking a full-stack feature complete:

**Backend**
- [ ] Migration file versioned correctly (V{N}__) and never replaces an existing file
- [ ] Entity is a `data class` implementing `BaseEntity`
- [ ] `assignId` overridden in service (required for Kotlin data class immutability)
- [ ] **New domain-specific permissions added** (`<DOMAIN>_VIEW`, `<DOMAIN>_EDIT`) in a migration — not reusing another domain's permissions
- [ ] All write endpoints have `@PreAuthorize` with the correct domain permission
- [ ] Controller returns `404` for not-found, not `500`
- [ ] No business logic in entities or controllers — it belongs in services
- [ ] No `@Transactional` on controllers

**Frontend**
- [ ] TypeScript types match Kotlin entity fields exactly
- [ ] API module uses `apiClient`, not raw `fetch`
- [ ] `staleTime: 5 * 60 * 1000` set on queries
- [ ] Update/delete mutations use optimistic cache updates with rollback
- [ ] Loading and error states rendered
- [ ] Route registered in `App.tsx` inside `<ProtectedRoute>`
- [ ] Imports use `@/` alias, not relative paths crossing directories
- [ ] No server data stored in Redux

**Full-stack**
- [ ] API path consistent between controller `@RequestMapping` and `apiClient` URL
- [ ] HTTP method matches (`POST` create, `PUT` update, `DELETE` delete)
- [ ] Permissions enforced server-side; client only gates navigation
- [ ] Optimistic updates roll back correctly on server error

---

## Project Commands Reference

```bash
# Start dependencies
docker compose up -d

# Backend dev
./gradlew api:bootRun           # starts on :8081

# Frontend dev
cd ui && npm run dev            # starts on :3000, proxies /api → :8081

# Run migrations manually
./flyway.sh migrate
./flyway.sh info

# Tests
./gradlew api:test              # JVM tests
cd ui && npm test               # Vitest (no watch)

# Production build (UI bundled into JAR)
cd ui && npm run build
./gradlew api:bootJar
```
