# data-testid Guide for E2E Tests

This guide explains how to add `data-testid` attributes to React components for reliable Playwright E2E tests.

## Why data-testid?

`data-testid` attributes provide:
- ✅ Stable selectors that won't break with styling changes
- ✅ Explicit intent: "This element is important for testing"
- ✅ Decoupling from CSS classes and element structure
- ✅ Better performance than complex CSS selectors
- ✅ Resilience to UI refactoring

## Naming Convention

Use kebab-case names that describe the element's role:

```
✅ Good:
[data-testid="submit-btn"]
[data-testid="course-card"]
[data-testid="search-input"]
[data-testid="user-profile"]
[data-testid="courses-list"]

❌ Avoid:
[data-testid="btn1"]              // unclear purpose
[data-testid="div-123"]           // too generic
[data-testid="main-container"]    // vague
```

## Adding to Components

### Interactive Elements (Buttons, Links, Inputs)

```jsx
// Button
<button data-testid="submit-btn">Submit</button>
<button data-testid="create-course-btn">Create Course</button>
<a href="/courses" data-testid="courses-link">Courses</a>

// Input/Form fields
<input 
  name="email"
  data-testid="email-input"
  placeholder="Email"
/>

<textarea
  name="content"
  data-testid="content-textarea"
  placeholder="Content"
/>

<select data-testid="category-select">
  <option>Select...</option>
</select>
```

### Container/List Elements

```jsx
// Lists
<div data-testid="courses-list">
  {courses.map(course => (
    <div key={course.id} data-testid={`course-item-${course.id}`}>
      {course.title}
    </div>
  ))}
</div>

// Cards
<article data-testid="course-card">
  <h3>{course.title}</h3>
  <p>{course.description}</p>
</article>

// Containers
<div data-testid="user-profile">
  <h2>{user.name}</h2>
</div>
```

### Navigation Elements

```jsx
// Header
<header data-testid="app-header">
  <nav data-testid="main-nav">
    <a href="/courses">Courses</a>
    <a href="/authors">Authors</a>
  </nav>
</header>

// Menu
<button data-testid="profile-menu">Profile</button>
<button data-testid="logout-btn">Logout</button>
```

### Form Components

```jsx
// Form
<form data-testid="login-form">
  <input data-testid="username-input" />
  <input data-testid="password-input" />
  <button data-testid="login-submit">Login</button>
</form>

// Dialog/Modal
<dialog data-testid="create-course-dialog">
  <h2>Create Course</h2>
  <form data-testid="create-course-form">
    {/* form content */}
  </form>
</dialog>
```

## Using in Tests

### Simple selector
```typescript
const submitBtn = page.locator('[data-testid="submit-btn"]');
await submitBtn.click();
```

### Waiting for element
```typescript
await page.waitForSelector('[data-testid="course-card"]');
```

### Checking visibility
```typescript
const element = page.locator('[data-testid="my-element"]');
await expect(element).toBeVisible();
```

### Getting text content
```typescript
const text = await page.locator('[data-testid="title"]').textContent();
```

### Filling form input
```typescript
await page.fill('[data-testid="email-input"]', 'test@example.com');
```

### Selecting from dropdown
```typescript
await page.selectOption('[data-testid="category-select"]', 'Technology');
```

## Common Test IDs by Component Type

### Layout Components
```
[data-testid="app-header"]
[data-testid="main-nav"]
[data-testid="user-profile"]
[data-testid="profile-menu"]
[data-testid="logout-btn"]
[data-testid="sidebar"]
[data-testid="footer"]
```

### Course-Related
```
[data-testid="courses-list"]
[data-testid="course-card"]
[data-testid="course-item-{id}"]
[data-testid="course-title"]
[data-testid="course-description"]
[data-testid="create-course-btn"]
[data-testid="edit-course-btn-{id}"]
[data-testid="delete-course-btn-{id}"]
[data-testid="create-course-form"]
[data-testid="course-title-input"]
[data-testid="course-description-input"]
```

### Author-Related
```
[data-testid="authors-list"]
[data-testid="author-card"]
[data-testid="author-item-{id}"]
[data-testid="create-author-btn"]
[data-testid="author-name-input"]
```

### Form/Input Elements
```
[data-testid="username-input"]
[data-testid="password-input"]
[data-testid="email-input"]
[data-testid="search-input"]
[data-testid="category-select"]
[data-testid="{fieldName}-input"]
[data-testid="{fieldName}-textarea"]
[data-testid="{fieldName}-select"]
```

### Action Buttons
```
[data-testid="submit-btn"]
[data-testid="cancel-btn"]
[data-testid="save-btn"]
[data-testid="edit-btn"]
[data-testid="delete-btn"]
[data-testid="filter-btn"]
```

### Status/Messages
```
[data-testid="error-message"]
[data-testid="success-message"]
[data-testid="loading-spinner"]
[data-testid="empty-state"]
```

## Best Practices

### 1. Add data-testid only when needed
```jsx
// ✅ Good: Only on important elements
<div data-testid="course-card">
  <h3>{course.title}</h3>
  <p>{course.description}</p>
</div>

// ❌ Over-testing: Every element has testid
<div data-testid="wrapper">
  <h3 data-testid="title">{course.title}</h3>
  <p data-testid="desc">{course.description}</p>
</div>
```

### 2. Use meaningful names
```jsx
// ✅ Clear purpose
<button data-testid="create-course-btn">Create</button>

// ❌ Vague
<button data-testid="btn">Create</button>
```

### 3. Use dynamic IDs for lists
```jsx
// ✅ Unique identifier for each item
{courses.map(course => (
  <div key={course.id} data-testid={`course-item-${course.id}`}>
    {course.title}
  </div>
))}

// ❌ Same testid for all items
{courses.map(course => (
  <div key={course.id} data-testid="course-item">
    {course.title}
  </div>
))}
```

### 4. Keep in sync with tests
```jsx
// React component
<input data-testid="email-input" />

// Test uses same testid
const emailInput = page.locator('[data-testid="email-input"]');
await emailInput.fill('test@example.com');
```

### 5. Documentation in components
```jsx
/**
 * CourseCard component
 * 
 * data-testid attributes used in E2E tests:
 * - [data-testid="course-card"] - Card container
 * - [data-testid="course-title"] - Course title
 * - [data-testid="edit-btn-{courseId}"] - Edit button
 */
export function CourseCard({ course }) {
  return (
    <article data-testid="course-card">
      <h3 data-testid="course-title">{course.title}</h3>
      <button data-testid={`edit-btn-${course.id}`}>Edit</button>
    </article>
  );
}
```

## Priority: When to Add data-testid

### High Priority (Add First)
- Primary action buttons (submit, save, create)
- Navigation links
- Form inputs
- Page titles/headings
- Critical containers

### Medium Priority
- Secondary buttons
- Card/item containers
- List containers
- Search/filter inputs

### Low Priority
- Text paragraphs (use text content instead)
- Decorative elements
- Icons (unless they're interactive)
- Spacers/dividers

## Testing with data-testid

### Query by testid
```typescript
page.locator('[data-testid="course-card"]')
page.getByTestId('course-card')  // Alternative syntax
```

### Combined selectors
```typescript
// Find by testid, then by text inside
const deleteBtn = page.locator('[data-testid="course-item"]')
  .locator('button:has-text("Delete")');

// Find first matching testid
const firstCard = page.locator('[data-testid="course-card"]').first();
```

## Refactoring Checklist

When making UI changes:
- [ ] Check if element needs new/updated `data-testid`
- [ ] Update tests if selectors changed
- [ ] Run E2E tests to verify `npm run e2e`
- [ ] Check test report for failures

## Examples

### Before (No testid - fragile tests)
```jsx
// Component
<button className="btn btn-primary">Submit</button>

// Test (brittle - breaks if CSS changes)
await page.click('button.btn.btn-primary');
```

### After (With testid - robust tests)
```jsx
// Component
<button className="btn btn-primary" data-testid="submit-btn">Submit</button>

// Test (stable - CSS changes don't affect test)
await page.click('[data-testid="submit-btn"]');
```

## References

- [Playwright: Locating by test id](https://playwright.dev/docs/locators#locate-by-test-id)
- [Testing Library: getByTestId](https://testing-library.com/docs/queries/bytestid)
- [Best Practices for E2E Testing](https://playwright.dev/docs/best-practices)
