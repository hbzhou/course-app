import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/common/Button";
import { Input } from "@/common/Input";
import { Label } from "@/common/Label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/common/Card";
import { useLogin } from "@/hooks/useAuth";
import { LoginRequest } from "@/api/authApi";
import { useState } from "react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (request: LoginRequest) => {
    try {
      setErrorMessage(null);
      await loginMutation.mutateAsync(request);
      const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(fromPath ?? "/courses", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed");
    }
  };

  const handleOAuth2Login = () => {
    const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
    if (fromPath && fromPath !== "/login") {
      sessionStorage.setItem("oauth2_return_to", fromPath);
    }

    window.location.href = "/oauth2/authorization/keycloak";
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                {...register("username", { required: true })}
              />
              {errors.username && <span className="text-sm text-destructive">This field is required</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                {...register("password", { required: true })}
              />
              {errors.password && <span className="text-sm text-destructive">This field is required</span>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>

            {/* OAuth2 Login Option */}
            <div className="w-full space-y-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleOAuth2Login}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                Login with OAuth2 (Keycloak)
              </Button>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <Link className="text-primary hover:underline font-medium" to="/register">
                Register here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
