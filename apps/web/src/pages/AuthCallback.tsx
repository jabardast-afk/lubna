import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/chat", { replace: true });
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center text-text-secondary">
      Wrapping things up...
    </main>
  );
}
