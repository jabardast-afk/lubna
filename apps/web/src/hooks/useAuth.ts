import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession } from "@/lib/gemini";

const LOGIN_URL = `${import.meta.env.VITE_API_BASE ?? ""}/auth/login`;

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    retry: false
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = App.addListener("appUrlOpen", async ({ url }) => {
      if (url.startsWith("com.lubna.app://auth/success")) {
        await Browser.close();
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        navigate("/chat");
      }
    });

    return () => {
      handle.then((listener) => listener.remove()).catch(() => undefined);
    };
  }, [navigate, queryClient]);

  const login = async () => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: LOGIN_URL, windowName: "_self" });
      return;
    }
    window.location.href = LOGIN_URL;
  };

  const logout = async () => {
    await fetch(`${import.meta.env.VITE_API_BASE ?? ""}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    navigate("/");
  };

  return {
    session: sessionQuery.data,
    loading: sessionQuery.isLoading,
    login,
    logout
  };
}
