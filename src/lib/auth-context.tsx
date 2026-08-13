"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { tokenStore } from "./auth-store";
import { firebaseSignOut, signInWithGoogle } from "./firebase";
import type { AdminLoginResponse, AuthAccount, MeResponse } from "./types";

type Status = "loading" | "authed" | "anon";

interface AuthContextValue {
  status: Status;
  account: AuthAccount | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [account, setAccount] = useState<AuthAccount | null>(null);

  // On load, if we hold a token, ask the server who we are. A bad/expired token
  // is cleared and we fall back to signed-out.
  useEffect(() => {
    if (!tokenStore.get()) {
      setStatus("anon");
      return;
    }
    api
      .get<MeResponse>("/auth/me")
      .then((data) => {
        setAccount(data.account);
        setStatus("authed");
      })
      .catch(() => {
        tokenStore.clear();
        setAccount(null);
        setStatus("anon");
      });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const idToken = await signInWithGoogle();
    const result = await api.post<AdminLoginResponse>("/auth/admin/login", { idToken });
    tokenStore.set(result.token);
    setAccount(result.account);
    setStatus("authed");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* revoking the session is best-effort; clear locally regardless */
    }
    tokenStore.clear();
    await firebaseSignOut().catch(() => {});
    setAccount(null);
    setStatus("anon");
  }, []);

  return (
    <AuthContext.Provider value={{ status, account, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
