import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const REDIRECT_SECONDS = 5;

const AccessDenied = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      navigate("/courses", { replace: true });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center gap-6 text-center">
      <div className="text-8xl font-extrabold text-destructive">403</div>
      <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
      <p className="text-muted-foreground max-w-md">
        You do not have permission to view this page. Redirecting to Courses in{" "}
        <span className="font-semibold text-foreground">{countdown}</span> second
        {countdown === 1 ? "" : "s"}...
      </p>
      <Link
        to="/courses"
        className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
      >
        Go to Courses
      </Link>
    </main>
  );
};

export default AccessDenied;
