import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { courseApi } from "@/api/courseApi";
import { userApi } from "@/api/userApi";
import { Course } from "@/types/course";
import { ManagedUser, UpdateUserRequest } from "@/types/managed-user";
import { COURSES_QUERY_KEY, useDeleteCourse, useUpdateCourse } from "./useCourses";
import { USERS_QUERY_KEY, useDeleteUser, useUpdateUser } from "./useUsers";

vi.mock("@/api/courseApi", () => {
  const getCourses = vi.fn();
  const createCourse = vi.fn();
  const updateCourse = vi.fn();
  const deleteCourse = vi.fn();
  return {
    courseApi: {
      getCourses,
      createCourse,
      updateCourse,
      deleteCourse,
    },
    // Also export courseCrudApi used by generic hooks
    courseCrudApi: {
      getAll: getCourses,
      create: createCourse,
      update: updateCourse,
      delete: deleteCourse,
    },
  };
});

vi.mock("@/api/userApi", () => ({
  userApi: {
    getUsers: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getRoles: vi.fn(),
  },
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 1,
  title: "Course 1",
  description: "desc",
  creationDate: "01/01/2026",
  duration: 2,
  authors: [{ id: 1, name: "Author 1" }],
  tags: [{ id: 1, name: "Tag 1", color: "#111111" }],
  ...overrides,
});

const makeUser = (overrides: Partial<ManagedUser> = {}): ManagedUser => ({
  id: 1,
  username: "jane",
  email: "jane@example.com",
  roles: [{ id: 1, name: "ROLE_USER" }],
  ...overrides,
});

describe("optimistic mutation hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("optimistically updates course cache then rolls back on update failure", async () => {
    const initialCourses = [makeCourse()];
    const updatedCourse = makeCourse({ title: "Course Updated" });
    const pending = deferred<Course>();
    vi.mocked(courseApi.updateCourse).mockReturnValue(pending.promise);

    queryClient.setQueryData(COURSES_QUERY_KEY, initialCourses);
    const { result } = renderHook(() => useUpdateCourse(), { wrapper });

    const mutationPromise = result.current.mutateAsync(updatedCourse);

    await waitFor(() => {
      expect(queryClient.getQueryData(COURSES_QUERY_KEY)).toEqual([updatedCourse]);
    });

    pending.reject(new Error("update failed"));
    await expect(mutationPromise).rejects.toThrow("update failed");

    expect(queryClient.getQueryData(COURSES_QUERY_KEY)).toEqual(initialCourses);
  });

  it("optimistically removes course then rolls back on delete failure", async () => {
    const course1 = makeCourse({ id: 1 });
    const course2 = makeCourse({ id: 2, title: "Course 2" });
    const initialCourses = [course1, course2];
    const pending = deferred<void>();
    vi.mocked(courseApi.deleteCourse).mockReturnValue(pending.promise);

    queryClient.setQueryData(COURSES_QUERY_KEY, initialCourses);
    const { result } = renderHook(() => useDeleteCourse(), { wrapper });

    const mutationPromise = result.current.mutateAsync(course1.id);

    await waitFor(() => {
      expect(queryClient.getQueryData(COURSES_QUERY_KEY)).toEqual([course2]);
    });

    pending.reject(new Error("delete failed"));
    await expect(mutationPromise).rejects.toThrow("delete failed");

    expect(queryClient.getQueryData(COURSES_QUERY_KEY)).toEqual(initialCourses);
  });

  it("optimistically updates user cache then rolls back on failure", async () => {
    const initialUsers = [makeUser()];
    const update: UpdateUserRequest = {
      id: 1,
      username: "jane-updated",
      email: "jane-updated@example.com",
      roles: [{ id: 2, name: "ROLE_ADMIN" }],
    };
    const pending = deferred<ManagedUser>();
    vi.mocked(userApi.updateUser).mockReturnValue(pending.promise);

    queryClient.setQueryData(USERS_QUERY_KEY, initialUsers);
    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    const mutationPromise = result.current.mutateAsync(update);

    await waitFor(() => {
      expect(queryClient.getQueryData(USERS_QUERY_KEY)).toEqual([
        {
          ...initialUsers[0],
          ...update,
        },
      ]);
    });

    pending.reject(new Error("user update failed"));
    await expect(mutationPromise).rejects.toThrow("user update failed");

    expect(queryClient.getQueryData(USERS_QUERY_KEY)).toEqual(initialUsers);
  });

  it("optimistically removes user then rolls back on delete failure", async () => {
    const user1 = makeUser({ id: 1, username: "first" });
    const user2 = makeUser({ id: 2, username: "second", email: "second@example.com" });
    const initialUsers = [user1, user2];
    const pending = deferred<void>();
    vi.mocked(userApi.deleteUser).mockReturnValue(pending.promise);

    queryClient.setQueryData(USERS_QUERY_KEY, initialUsers);
    const { result } = renderHook(() => useDeleteUser(), { wrapper });

    const mutationPromise = result.current.mutateAsync(user1.id);

    await waitFor(() => {
      expect(queryClient.getQueryData(USERS_QUERY_KEY)).toEqual([user2]);
    });

    pending.reject(new Error("user delete failed"));
    await expect(mutationPromise).rejects.toThrow("user delete failed");

    expect(queryClient.getQueryData(USERS_QUERY_KEY)).toEqual(initialUsers);
  });
});
