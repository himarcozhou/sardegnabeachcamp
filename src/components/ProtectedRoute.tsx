import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { hasSeenWelcome } from "@/pages/Welcome";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useApp();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!session) {
    return <Navigate to={hasSeenWelcome() ? "/onboarding" : "/welcome"} replace state={{ from: loc }} />;
  }
  if (profile && !profile.onboarded && loc.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
