import { useEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Authors from "@/components/Authors/Authors";
import Tags from "@/components/Tags/Tags";
import CourseInfo from "@/components/CourseInfo/CourseInfo";
import Courses from "@/components/Courses/Courses";
import CreateCourse from "@/components/CreateCourse/CreateCourse";
import Header from "@/components/Header/Header";
import Login from "@/components/Login/Login";
import Registration from "@/components/Registration/Registration";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import Users from "@/components/Users/Users";
import ToastContainer from "@/components/Notifications/ToastContainer";
import { Provider, useDispatch } from "react-redux";
import { store } from "@/store/store";
import { actions } from "@/store/auth/auth.slice";
import { useWebSocket } from "@/hooks/useWebSocket";
import { QUERY_STALE_TIME_MS } from "@/lib/queryConfig";

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

const AuthBootstrap: React.FC<{ children: React.ReactElement }> = ({ children }) => {
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

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <BrowserRouter>
            <Header />
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
            <ToastContainer />
          </BrowserRouter>
        </AuthBootstrap>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
