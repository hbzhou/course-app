import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/context/auth-context";
import { apiClient } from "@/api/client";
import { OAuth2User } from "@/types/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/Card";

const OAuth2Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginOAuth2 } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        setError(errorDescription || errorParam);
        setLoading(false);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        setLoading(false);
        return;
      }

      try {
        // Exchange authorization code for access token
        const response = await apiClient<{
          accessToken: string;
          idToken?: string;
          refreshToken?: string;
          expiresIn?: number;
          tokenType: string;
          user: { name: string; email: string };
        }>("/api/auth/oauth2/exchange", {
          method: "POST",
          body: JSON.stringify({ code }),
        });

        const oauth2User: OAuth2User = {
          name: response.user.name,
          email: response.user.email,
          accessToken: response.accessToken,
          idToken: response.idToken,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
          tokenType: response.tokenType,
        };

        // Login with OAuth2 user
        loginOAuth2(oauth2User);

        // Redirect to courses page
        navigate("/courses", { replace: true });
      } catch (err) {
        console.error("Failed to exchange code for token:", err);
        setError(err instanceof Error ? err.message : "Failed to complete OAuth2 login");
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, loginOAuth2]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Completing Login...</CardTitle>
            <CardDescription>Please wait while we complete your authentication</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Login Failed</CardTitle>
            <CardDescription>There was an error completing your OAuth2 login</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Back to Login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default OAuth2Callback;
