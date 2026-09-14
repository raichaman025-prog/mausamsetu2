import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudRain, Lock, Mail, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

export default function CitizenLogin() {
  const [email, setEmail] = useState("demo@citizen.in");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/citizen/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <CloudRain className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Citizen Login</h1>
        <p className="mt-1 text-sm text-slate-500">Access saved locations, alerts, and local reporting.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
              </div>
            </div>

            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Login"}
            </Button>
            <Button type="button" variant="outline" size="lg" className="w-full">
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          Demo credentials — Email: <strong>demo@citizen.in</strong>, Password: <strong>password123</strong>
        </div>
      </div>
    </div>
  );
}
