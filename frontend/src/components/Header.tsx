import type React from "react";
import { Link, useNavigate } from "react-router-dom";
import { CloudRain, Map, Bell, UserCircle2, Search, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "./ui/input";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <CloudRain className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-900">MausamSetu</div>
            <div className="hidden text-[11px] font-medium text-slate-500 sm:block">
              Hyperlocal Weather &amp; Disaster Intelligence
            </div>
          </div>
        </Link>

        <form onSubmit={handleSearch} className="hidden max-w-sm flex-1 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search locality — e.g. Gomti Nagar"
              className="pl-9"
            />
          </div>
        </form>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <NavLink to="/" icon={<Map className="h-4 w-4" />} label="Weather Map" />
          <NavLink to="/risk-map" icon={<LayoutDashboard className="h-4 w-4" />} label="Risk Map" />
          <NavLink to="/alerts" icon={<Bell className="h-4 w-4" />} label="Alerts" />
          <NavLink to="/data" icon={<LayoutDashboard className="h-4 w-4" />} label="Data" />
          <NavLink to="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Admin" />
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/citizen/dashboard"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <UserCircle2 className="h-4 w-4 text-brand-600" />
                {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-slate-700"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/citizen/login"
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <UserCircle2 className="h-4 w-4" />
              Citizen Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {icon}
      {label}
    </Link>
  );
}
