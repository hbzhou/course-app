import React, { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Authors from "@/components/Authors/Authors";
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

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AuthBootstrap: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(actions.rehydrateFromStorage());
  }, [dispatch]);

  // Start WebSocket connection (connects only when authenticated)
  useWebSocket();

  return children;
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <BrowserRouter>
            <Header />
            <Routes>
              <Route
                path='/'
                element={
                  <ProtectedRoute>
                    <Courses />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/courses'
                element={
                  <ProtectedRoute>
                    <Courses />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/courses/:id'
                element={
                  <ProtectedRoute>
                    <CourseInfo />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/authors'
                element={
                  <ProtectedRoute>
                    <Authors />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/users'
                element={
                  <ProtectedRoute>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/courses/add'
                element={
                  <ProtectedRoute>
                    <CreateCourse />
                  </ProtectedRoute>
                }
              />
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
