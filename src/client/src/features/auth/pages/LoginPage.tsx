import { Navigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import { LoginBrandPanel } from "@/features/auth/components/LoginBrandPanel";

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [params] = useSearchParams();

  if (isAuthenticated) return <Navigate to="/home" replace />;

  return (
    <div className="flex min-h-svh flex-col bg-background lg:grid lg:grid-cols-[55fr_45fr]">
      <LoginBrandPanel />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Welcome to PocketLedger
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Track every account, card and rupee in one place.
          </p>

          <div className="mt-8">
            <GoogleSignInButton />
          </div>

          {params.get("error") === "google" && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              Couldn't sign you in with Google. Try again.
            </p>
          )}

          <p className="mt-6 text-sm text-muted-foreground">New here? Signing in creates your ledger.</p>
        </div>
      </main>
    </div>
  );
}
