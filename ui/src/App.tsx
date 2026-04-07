import { lazy, Suspense, ReactNode } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Header from "@/layout/Header";
import ProtectedRoute from "@/router/ProtectedRoute";
import ToastContainer from "@/layout/ToastContainer";
import ErrorBoundary from "@/common/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { QUERY_STALE_TIME_MS } from "@/lib/queryConfig";
import { Loader2 } from "lucide-react";

const Authors = lazy(() => import("@/pages/authors/Authors"));
const Tags = lazy(() => import("@/pages/tags/Tags"));
const CourseInfo = lazy(() => import("@/pages/courses/CourseInfo"));
const Courses = lazy(() => import("@/pages/courses/Courses"));
const CreateCourse = lazy(() => import("@/pages/courses/CreateCourse"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Registration = lazy(() => import("@/pages/auth/Registration"));
const Users = lazy(() => import("@/pages/users/Users"));

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: QUERY_STALE_TIME_MS,
    },
  },
});

type WebSocketBootstrapProps = {
  children: ReactNode;
};

const WebSocketBootstrap = ({ children }: WebSocketBootstrapProps) => {
  // Start WebSocket connection (connects only when authenticated)
  useWebSocket();

  return children;
};

const ProtectedLayout = () => {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
};

const RouteLoadingFallback = () => {
  return (
    <main className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground text-lg">Loading page...</p>
      </div>
    </main>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <QueryClientProvider client={queryClient}>
            <WebSocketBootstrap>
              <BrowserRouter>
                <Header />
                <ErrorBoundary>
                  <Suspense fallback={<RouteLoadingFallback />}>
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
                  </Suspense>
                </ErrorBoundary>
                <ToastContainer />
              </BrowserRouter>
            </WebSocketBootstrap>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
