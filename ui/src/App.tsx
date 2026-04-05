import { lazy, Suspense, useEffect, ReactNode } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Header from "@/components/Header/Header";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import ToastContainer from "@/components/Notifications/ToastContainer";
import ErrorBoundary from "@/common/ErrorBoundary";
import { Provider, useDispatch } from "react-redux";
import { store } from "@/store/store";
import { actions } from "@/store/auth/auth.slice";
import { useWebSocket } from "@/hooks/useWebSocket";
import { QUERY_STALE_TIME_MS } from "@/lib/queryConfig";
import { Loader2 } from "lucide-react";

const Authors = lazy(() => import("@/components/Authors/Authors"));
const Tags = lazy(() => import("@/components/Tags/Tags"));
const CourseInfo = lazy(() => import("@/components/CourseInfo/CourseInfo"));
const Courses = lazy(() => import("@/components/Courses/Courses"));
const CreateCourse = lazy(() => import("@/components/CreateCourse/CreateCourse"));
const Login = lazy(() => import("@/components/Login/Login"));
const Registration = lazy(() => import("@/components/Registration/Registration"));
const Users = lazy(() => import("@/components/Users/Users"));

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

type AuthBootstrapProps = {
  children: ReactNode;
};

const AuthBootstrap = ({ children }: AuthBootstrapProps) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("token");
    dispatch(actions.setToken(token ?? undefined));
  }, [dispatch]);

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
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap>
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
          </AuthBootstrap>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
