import { createContext, useContext, useState, type ReactNode } from "react";
import type { UserT } from "./types";
import * as api from "./api";

interface AuthContextT {
  user: UserT | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextT | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserT | null>(() => {
    const raw = localStorage.getItem("mausamsetu_user");
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email: string, password: string) {
    const { access_token, user } = await api.login(email, password);
    localStorage.setItem("mausamsetu_token", access_token);
    localStorage.setItem("mausamsetu_user", JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("mausamsetu_token");
    localStorage.removeItem("mausamsetu_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
