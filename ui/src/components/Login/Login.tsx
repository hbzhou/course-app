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
      const fromPath = (location.state as any)?.from?.pathname as string | undefined;
      navigate(fromPath ?? "/courses", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed");
    }
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
