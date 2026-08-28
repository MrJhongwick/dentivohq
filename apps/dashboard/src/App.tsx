import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { AuthPage, type AuthPath } from "@/components/auth-page";
import { DashboardHome } from "@/components/dashboard-home";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { apiUrl, authClient } from "@/lib/auth-client";

const authPaths = new Set(["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"]);

export function App() {
  const session = authClient.useSession();
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const isAuthPath = authPaths.has(window.location.pathname);
  const path: AuthPath = isAuthPath ? window.location.pathname as AuthPath : "/login";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/api/v1/auth/config`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ data: { googleEnabled: boolean } }> : Promise.reject(new Error("config unavailable")))
      .then((body) => setGoogleEnabled(body.data.googleEnabled))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (session.data) return <DashboardHome />;
  const socialError = new URLSearchParams(window.location.search).get("error");
  if (isAuthPath || !session.isPending) return <AuthPage path={path} googleEnabled={googleEnabled} initialError={socialError ? "Google sign-in did not finish. Try again or use your email and password." : undefined} />;
  if (session.error) return <main className="mx-auto flex min-h-svh max-w-md items-center px-6"><Alert variant="destructive"><AlertCircle /><AlertTitle>Unable to check your session</AlertTitle><AlertDescription>Refresh the page or try again in a moment.</AlertDescription></Alert></main>;
  return <main className="flex min-h-svh items-center justify-center"><Spinner className="size-6" /></main>;
}

export default App;
