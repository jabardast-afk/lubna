import { Navigate } from "react-router-dom";
import WelcomeScreen from "@/components/Onboarding/WelcomeScreen";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { session, loading, login } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-text-secondary">
        Loading...
      </main>
    );
  }

  if (session) return <Navigate to="/chat" replace />;

  return <WelcomeScreen onLogin={login} />;
}
