import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", ...opts,
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export const riskColor = (level: string): string => {
  switch (level.toUpperCase()) {
    case "LOW": return "#22c55e";
    case "MODERATE": return "#eab308";
    case "HIGH": return "#f97316";
    case "SEVERE": return "#ef4444";
    default: return "#94a3b8";
  }
};

export const severityBadgeClasses = (severity: string): string => {
  const s = severity.toUpperCase();
  if (s === "RED" || s === "SEVERE" || s === "HIGH") return "bg-red-100 text-red-700 border-red-200";
  if (s === "ORANGE") return "bg-orange-100 text-orange-700 border-orange-200";
  if (s === "YELLOW" || s === "MODERATE") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (s === "LOW") return "bg-green-100 text-green-700 border-green-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

export const statusBadgeClasses = (status: string): string => {
  switch (status) {
    case "Pending": return "bg-slate-100 text-slate-700 border-slate-200";
    case "Under Review": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Verified": return "bg-purple-100 text-purple-700 border-purple-200";
    case "Resolved": return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
};
