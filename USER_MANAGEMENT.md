# User Management Feature

## Overview
This feature provides a complete user management interface for administrators to manage users in the system.

## Features

### User CRUD Operations
- **View Users**: Display all users with their username, email, and assigned roles
- **Create User**: Add new users with username, email, password, and role assignments
- **Edit User**: Update user information (password is optional when editing)
- **Delete User**: Remove users from the system with confirmation dialog

### User Interface Components

#### 1. Users List (`Users.tsx`)
- Main component displaying all users in a card layout
- Each user card shows:
  - Username
  - Email address
  - Assigned roles (as badges)
  - Edit and Delete action buttons

#### 2. Add/Edit User Form (`AddUser.tsx`)
- Form with validation using react-hook-form and zod
- Fields:
  - **Username**: 3-50 characters, required
  - **Email**: Valid email format, required
  - **Password**: Minimum 6 characters, required for new users, optional for edit
  - **Roles**: Multi-select dropdown, at least one role required
- Real-time validation with error messages

#### 3. User Item (`UserItem.tsx`)
- Individual user card component
- Displays user information with icons
- Action buttons for edit and delete operations

## API Integration

### Endpoints Used
- `GET /api/users` - Fetch all users
- `GET /api/users/{id}` - Fetch user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /api/roles` - Fetch available roles

### Data Types
```typescript
interface ManagedUser {
  id: number;
  username: string;
  email: string;
  roles: Role[];
}

interface Role {
  id: number;
  name: string;
}
```

## Security

### Backend Security
- All user management endpoints require `USER_MANAGE` permission
- Password encoding using BCrypt
- JWT authentication required for all operations

### Frontend
- Route protected with `ProtectedRoute` component
- Users without proper permissions will be denied access at the API level

## State Management

### React Query
- Uses `@tanstack/react-query` for server state management
- Automatic caching with 5-minute stale time
- Optimistic updates for better UX
- Automatic rollback on errors
- Background refetching to keep data in sync

### Hooks
- `useUsers()` - Fetch and cache users list
- `useRoles()` - Fetch and cache available roles
- `useCreateUser()` - Create new user with optimistic updates
- `useUpdateUser()` - Update user with optimistic updates
- `useDeleteUser()` - Delete user with optimistic updates

## Navigation
- Accessible from the main navigation bar via "Users" link
- Route: `/users`

## Styling
- Uses Tailwind CSS for styling
- Consistent with existing design system
- Custom react-select theming to match application theme
- Responsive layout with proper spacing

## Validation Rules

### Username
- Minimum length: 3 characters
- Maximum length: 50 characters
- Required field

### Email
- Must be valid email format
- Minimum length: 5 characters
- Required field

### Password
- Minimum length: 6 characters
- Required when creating new user
- Optional when editing (leave blank to keep existing password)

### Roles
- At least one role must be selected
- Multiple roles can be assigned to a user

## Backend Updates

### UserService
Updated to handle password encoding properly:
- Encodes password using BCryptPasswordEncoder when creating users
- Optionally updates password when editing (only if provided)
- Keeps existing password if blank password provided during update

## Usage

### Adding a User
1. Click "Add User" button
2. Fill in username, email, and password
3. Select one or more roles from the dropdown
4. Click "Save" to create the user

### Editing a User
1. Click "Edit" button on a user card
2. Modify username, email, or roles as needed
3. Optionally enter a new password (leave blank to keep current)
4. Click "Save" to update the user

### Deleting a User
1. Click "Remove" button on a user card
2. Confirm deletion in the dialog
3. User will be permanently removed

## Error Handling
- Network errors are caught and displayed to users
- Validation errors shown inline on form fields
- API errors displayed in user-friendly messages
- Optimistic updates rolled back on failure

## Dependencies
- react-hook-form: Form state management
- zod: Schema validation
- react-select: Multi-select dropdown for roles
- @tanstack/react-query: Server state management
- lucide-react: Icons

## Files Created
- `/ui/src/types/managed-user.d.ts` - TypeScript type definitions
- `/ui/src/api/userApi.ts` - API client functions
- `/ui/src/hooks/useUsers.ts` - React Query hooks
- `/ui/src/components/Users/Users.tsx` - Main users list component
- `/ui/src/components/Users/AddUser.tsx` - User form component
- `/ui/src/components/Users/UserItem.tsx` - User card component

## Files Modified
- `/ui/src/App.tsx` - Added users route
- `/ui/src/components/Navigation/Nav.tsx` - Added users navigation link
- `/ui/src/index.css` - Added react-select custom styles
- `/api/src/main/kotlin/.../UserService.kt` - Added password encoding
