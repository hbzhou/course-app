import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/common/Button";
import { Input } from "@/common/Input";
import { Label } from "@/common/Label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/common/Card";
import { useRegister } from "@/hooks/useAuth";
import { RegisterRequest } from "@/api/authApi";

const Registration = () => {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterRequest>();

  const onSubmit = async (user: RegisterRequest) => {
    try {
      setErrorMessage(null);
      await registerMutation.mutateAsync(user);
      // If successful, send user to login to sign in
      navigate("/login");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Registration failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Enter your information to get started</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                {errorMessage}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter name"
                {...register("name", { required: true })}
              />
              {errors.name && <span className="text-sm text-destructive">This field is required</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                {...register("email", { required: true })}
              />
              {errors.email && <span className="text-sm text-destructive">This field is required</span>}
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
            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Registering..." : "Register"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Registration;
