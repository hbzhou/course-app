---
name: frontend-design
description: 'Design and implement React frontend features in the course-app UI. Use when: adding a new page or route, creating a component, adding an API-connected feature, building a form with validation, wiring up React Query mutations/queries, updating Redux state, or following the project component/styling conventions. Covers full workflow from types → API → hooks → component → route registration.'
argument-hint: 'Describe the feature to build (e.g., "a new Tags management page with CRUD")'
---

# Frontend Design — course-app UI

## When to Use
- Adding a new page, route, or feature area
- Creating or refactoring a component
- Wiring up a new backend API endpoint to the UI
- Building a form with validation
- Deciding between React Query vs Redux for state
- Applying consistent Tailwind / shadcn-style conventions

---

## Project Layout (`ui/src/`)

```
api/            # API module per domain (courseApi, authorApi, userApi, authApi)
common/         # Shared shadcn-style primitives: Button, Card, Input, Label, Textarea, Toast, …
components/     # Feature folders, each with co-located component files
hooks/          # Custom hooks per domain (useCourses, useAuthors, useUsers, useAuth, useWebSocket)
store/          # Redux Toolkit: auth slice + notification slice
types/          # TypeScript declaration files (*.d.ts) per domain
lib/            # Utilities (cn() for Tailwind class merging)
App.tsx         # Router tree + QueryClient + Redux Provider
constants.ts    # App-wide constants
```

---

## Step-by-Step: Adding a New Feature

### 1. Define Types

Create `ui/src/types/<domain>.d.ts`:
```typescript
export interface Tag {
  id: number;
  name: string;
  color: string;
}
```

### 2. Create the API Module

Create `ui/src/api/<domain>Api.ts` using `apiClient`:
```typescript
import { apiClient } from './client';
import { Tag } from '@/types/tag';

export const tagApi = {
  getTags: () => apiClient<Tag[]>('/api/tags'),
  createTag: (tag: Omit<Tag, 'id'>) =>
    apiClient<Tag>('/api/tags', { method: 'POST', body: JSON.stringify(tag) }),
  updateTag: (tag: Tag) =>
    apiClient<Tag>(`/api/tags/${tag.id}`, { method: 'PUT', body: JSON.stringify(tag) }),
  deleteTag: (id: number) =>
    apiClient<void>(`/api/tags/${id}`, { method: 'DELETE' }),
};
```

`apiClient` auto-injects `Authorization: Bearer <token>` from `localStorage`.

### 3. Create React Query Hooks

Create `ui/src/hooks/use<Domain>.ts`:

**Query (read):**
```typescript
export const TAGS_QUERY_KEY = ['tags'];

export const useTags = () =>
  useQuery({ queryKey: TAGS_QUERY_KEY, queryFn: tagApi.getTags, staleTime: 5 * 60 * 1000 });
```

**Mutation patterns:**
| Operation | Cache strategy |
|-----------|---------------|
| Create | `onSuccess`: append to cache via `setQueryData` |
| Update | `onMutate`: optimistic update + rollback context; `onSettled`: invalidate |
| Delete | `onMutate`: optimistic remove; `onError`: rollback; `onSettled`: invalidate |

Update mutation template:
```typescript
export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tag: Tag) => tagApi.updateTag(tag),
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: TAGS_QUERY_KEY });
      const previous = queryClient.getQueryData<Tag[]>(TAGS_QUERY_KEY);
      queryClient.setQueryData<Tag[]>(TAGS_QUERY_KEY,
        (old) => old?.map(t => t.id === updated.id ? updated : t) ?? []);
      return { previous };
    },
    onError: (_err, _updated, context) => {
      if (context?.previous) queryClient.setQueryData(TAGS_QUERY_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY }),
  });
};
```

### 4. Build the Component

Create `ui/src/components/<Feature>/`:

**List / data-display component conventions:**
- `React.FC` with no external props for page-level components
- Destructure query result: `const { data: tags = [], isLoading, error } = useTags()`
- Render loading state: `<div className="text-center py-12 text-muted-foreground">Loading…</div>`
- Render error state: `<div className="text-center py-12 text-destructive">{error.message}</div>`
- Wrap in `<main className="container mx-auto p-6">`
- Grid layout: `className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"`

**Form component conventions** (react-hook-form, no zod unless already present):
```typescript
const { register, handleSubmit, control, formState: { errors } } = useForm<Tag>();
const mutation = useCreateTag();
const [errorMessage, setErrorMessage] = useState<string | null>(null);

const onSubmit: SubmitHandler<Tag> = async (data) => {
  try {
    setErrorMessage(null);
    await mutation.mutateAsync(data);
    navigate('/tags');
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Operation failed');
  }
};
```

Error banner:
```tsx
{errorMessage && (
  <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
    {errorMessage}
  </div>
)}
```

Field block pattern:
```tsx
<div className="space-y-2">
  <Label htmlFor="name">Tag Name</Label>
  <Input id="name" placeholder="Enter tag name" {...register('name', { required: true })} />
  {errors.name && <span className="text-sm text-destructive">This field is required</span>}
</div>
```

Wrap forms in `<Card><CardHeader><CardTitle>…</CardTitle></CardHeader><CardContent>…</CardContent></Card>`.

### 5. Register the Route

In `ui/src/App.tsx`, add inside `<Routes>` wrapped with `<ProtectedRoute>`:
```tsx
<Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />
<Route path="/tags/add" element={<ProtectedRoute><CreateTag /></ProtectedRoute>} />
```

### 6. Add Navigation Link (if needed)

Check `ui/src/components/Navigation/` for the nav component and add a `<NavLink>` entry.

---

## State Management Decision

| Data | Where |
|------|-------|
| Server data (courses, authors, users, tags…) | **React Query** via `hooks/use<Domain>.ts` |
| Auth state (`currentUser`, JWT token) | **Redux** — `store/auth/auth.slice.ts` |
| Notification toasts | **Redux** — `store/notifications/` |
| Local UI state (modals, search keyword) | `useState` in component |

**Never** put server data in Redux. **Never** put auth token in React Query.

---

## Styling Conventions

- Use **Tailwind utility classes** exclusively; no custom CSS files except `index.css`
- Use `cn()` from `@/lib/utils` to merge conditional classes
- Use **common/** primitives (`Button`, `Input`, `Label`, `Card`, `Textarea`, `Dialog`, `Badge`) instead of raw HTML — they follow shadcn/ui patterns
- Button variants: `default` (primary), `outline`, `ghost`, `destructive`
- Spacing: `space-y-2` for form field internals, `space-y-6` between form sections, `gap-6` for grids
- Colors via semantic tokens: `text-muted-foreground`, `text-destructive`, `bg-destructive/10`
- Responsive: mobile-first with `md:` and `lg:` breakpoints

---

## Quality Checklist

Before finishing a frontend feature:

- [ ] TypeScript types defined in `types/`
- [ ] API module uses `apiClient`, no raw `fetch` calls
- [ ] React Query `staleTime: 5 * 60 * 1000` on queries
- [ ] Mutations use correct cache strategy (optimistic for update/delete, append for create)
- [ ] Loading and error states rendered
- [ ] Form errors shown inline with `text-destructive`
- [ ] Route registered in `App.tsx` inside `<ProtectedRoute>`
- [ ] Imports use `@/` alias, not relative paths crossing directories
- [ ] No server data in Redux store
- [ ] No raw HTML form elements where a `common/` primitive exists

---

## Permission Gating

**Auth state in Redux** (`store/auth/auth.slice.ts`) stores only `{ username?, email?, token? }` — roles/permissions are **not** stored client-side.

- **Route protection**: wrap routes with `<ProtectedRoute>` — it checks `currentUser.token` via `useSelector(selectCurrentUser)`; redirects to `/login` when absent.
- **Conditional UI** (e.g., hide an "Add" button from non-admins): the backend enforces permissions; the frontend currently gates only on authentication state (`token`). To conditionally show/hide elements based on the user's role, you would need the backend to return role info in the auth response and store it in the Redux slice.
- **Never trust client-side permission checks as security.** All write endpoints are protected server-side via `@PreAuthorize`.

Check `currentUser.token` to decide whether to render privileged actions:
```tsx
const currentUser = useSelector(selectCurrentUser) as AuthSliceState;
// show action only when authenticated
{currentUser?.token && <Button>Delete</Button>}
```

---

## Testing

**Stack:** Vitest + `@testing-library/react` + `@testing-library/jest-dom`. Setup in `ui/src/test/setup.ts`.

**Run tests:** `cd ui && npm test` (runs with `--run`, no watch mode).

**Test file location:** Co-locate with component: `components/<Feature>/<Component>.test.tsx`.

**Standard test scaffold** (mirrors `ProtectedRoute.test.tsx`):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '@/store/auth/auth.slice';
import MyComponent from './MyComponent';

const makeStore = (token?: string) =>
  configureStore({
    reducer: { currentUser: authReducer },
    preloadedState: { currentUser: token ? { token } : {} },
  });

describe('MyComponent', () => {
  it('renders correctly when authenticated', () => {
    render(
      <Provider store={makeStore('abc')}>
        <MemoryRouter>
          <MyComponent />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

**Mocking React Query:** Wrap with `<QueryClientProvider>` using a fresh `QueryClient` per test. Mock the API module with `vi.mock('@/api/courseApi')`.

**Always mock `localStorage`** in tests that touch auth:
```typescript
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});
```

---

## Path Alias

`@/` → `ui/src/` (configured in `vite.config.ts` and `vitest.config.mts`). Always use `@/` for cross-directory imports.
